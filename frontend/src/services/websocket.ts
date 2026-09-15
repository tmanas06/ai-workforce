import type { WebSocketMessage, Event, LogEntry, Agent, Task } from '../types';

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private projectId: number | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;

  connect(projectId: number) {
    if (this.ws?.readyState === WebSocket.OPEN && this.projectId === projectId) {
      return;
    }

    this.disconnect();
    this.projectId = projectId;
    this.shouldReconnect = true;
    this.doConnect();
  }

  private doConnect() {
    if (this.isConnecting || !this.shouldReconnect) return;
    
    this.isConnecting = true;
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/${this.projectId}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('WebSocket connected');
        this.send({ type: 'ping' });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handlers.forEach(handler => handler(message));
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      this.ws.onclose = () => {
        this.isConnecting = false;
        console.log('WebSocket disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      this.isConnecting = false;
      console.error('Failed to create WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.doConnect(), delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.projectId = null;
    this.reconnectAttempts = 0;
  }

  send(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  subscribeAgent(agentId: number) {
    this.send({ type: 'subscribe_agent', agent_id: agentId });
  }

  subscribeTask(taskId: number) {
    this.send({ type: 'subscribe_task', task_id: taskId });
  }

  ping() {
    this.send({ type: 'ping' });
  }
}

export const wsService = new WebSocketService();