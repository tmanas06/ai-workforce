'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Agent } from '../../types';
import { cn } from '../../utils/helpers';

interface VirtualOfficeProps {
  agents: Agent[];
  activeAgentId: number | null;
  onSelectAgent: (agent: Agent) => void;
  officeMode: 'work' | 'meeting' | 'break';
  viewMode: '2d' | 'isometric';
}

interface AgentPosition {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: 'idle' | 'walking' | 'working' | 'thinking' | 'talking';
  direction: 'left' | 'right' | 'down' | 'up';
  thought?: string;
  thoughtTimer?: number;
}

// Layout coordinate constants
const WORKSPACE_DESKS = [
  { x: 180, y: 160, label: 'Orchestrator Desk', role: 'orchestrator' },
  { x: 340, y: 160, label: 'Architect Desk', role: 'architect' },
  { x: 500, y: 160, label: 'Lead Developer Desk', role: 'developer' },
  { x: 180, y: 320, label: 'Researcher Desk', role: 'researcher' },
  { x: 340, y: 320, label: 'QA Engineer Desk', role: 'qa' },
  { x: 500, y: 320, label: 'Code Reviewer Desk', role: 'reviewer' },
];

const CONFERENCE_SEATS = [
  { x: 740, y: 220 },
  { x: 820, y: 220 },
  { x: 700, y: 270 },
  { x: 860, y: 270 },
  { x: 740, y: 320 },
  { x: 820, y: 320 },
];

const LOUNGE_AREA = [
  { x: 150, y: 480 },
  { x: 220, y: 480 },
  { x: 290, y: 480 },
  { x: 360, y: 480 },
  { x: 430, y: 480 },
  { x: 500, y: 480 },
];

const AGENT_ROLE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  orchestrator: { bg: '#8b5cf6', border: '#a78bfa', label: 'Orchestrator' },
  architect: { bg: '#3b82f6', border: '#60a5fa', label: 'Architect' },
  developer: { bg: '#10b981', border: '#34d399', label: 'Developer' },
  researcher: { bg: '#f59e0b', border: '#fbbf24', label: 'Researcher' },
  qa: { bg: '#ec4899', border: '#f472b6', label: 'QA Engineer' },
  reviewer: { bg: '#06b6d4', border: '#22d3ee', label: 'Reviewer' },
};

export function VirtualOffice({
  agents,
  activeAgentId,
  onSelectAgent,
  officeMode,
  viewMode,
}: VirtualOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const positionsRef = useRef<Map<number, AgentPosition>>(new Map());
  const [hoveredAgentId, setHoveredAgentId] = useState<number | null>(null);

  // Synchronize agent positions and mode targets
  useEffect(() => {
    const currentPositions = positionsRef.current;

    agents.forEach((agent, index) => {
      let targetX = 200;
      let targetY = 200;

      if (officeMode === 'meeting') {
        const seat = CONFERENCE_SEATS[index % CONFERENCE_SEATS.length];
        targetX = seat.x;
        targetY = seat.y;
      } else if (officeMode === 'break') {
        const lounge = LOUNGE_AREA[index % LOUNGE_AREA.length];
        targetX = lounge.x;
        targetY = lounge.y;
      } else {
        const desk = WORKSPACE_DESKS[index % WORKSPACE_DESKS.length];
        targetX = desk.x;
        targetY = desk.y;
      }

      if (!currentPositions.has(agent.id)) {
        currentPositions.set(agent.id, {
          id: agent.id,
          x: targetX,
          y: targetY,
          targetX,
          targetY,
          state: agent.status === 'working' ? 'working' : 'idle',
          direction: 'down',
          thought: getInitialThought(agent),
        });
      } else {
        const pos = currentPositions.get(agent.id)!;
        pos.targetX = targetX;
        pos.targetY = targetY;
        if (agent.status === 'working') pos.state = 'working';
        else if (agent.status === 'thinking') pos.state = 'thinking';
      }
    });
  }, [agents, officeMode]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Office Background Floor & Rooms
      drawOfficeFloor(ctx, canvas.width, canvas.height, viewMode);
      drawFurniture(ctx, tick, viewMode);

      // Update & Draw Agents
      const positions = positionsRef.current;
      agents.forEach((agent) => {
        const pos = positions.get(agent.id);
        if (!pos) return;

        // Smooth interpolate position towards target
        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
          pos.x += (dx / dist) * 2.5;
          pos.y += (dy / dist) * 2.5;
          pos.state = 'walking';
          pos.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        } else {
          pos.x = pos.targetX;
          pos.y = pos.targetY;
          if (officeMode === 'meeting') pos.state = 'talking';
          else if (agent.status === 'working') pos.state = 'working';
          else pos.state = 'idle';
        }

        const isSelected = agent.id === activeAgentId;
        const isHovered = agent.id === hoveredAgentId;

        drawAgentCharacter(ctx, agent, pos, tick, isSelected, isHovered, viewMode);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [agents, activeAgentId, hoveredAgentId, officeMode, viewMode]);

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (const agent of agents) {
      const pos = positionsRef.current.get(agent.id);
      if (pos) {
        const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
        if (dist < 35) {
          onSelectAgent(agent);
          break;
        }
      }
    }
  };

  // Canvas mousemove handler for hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    let foundId: number | null = null;
    for (const agent of agents) {
      const pos = positionsRef.current.get(agent.id);
      if (pos) {
        const dist = Math.hypot(mouseX - pos.x, mouseY - pos.y);
        if (dist < 35) {
          foundId = agent.id;
          break;
        }
      }
    }
    setHoveredAgentId(foundId);
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Banner / Legend */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50 shadow-lg text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Office Floor
        </span>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> Orchestrator</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> Architect</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Dev</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-pink-500" /> QA</span>
        </div>
      </div>

      {/* Main Canvas Element */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={580}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className={cn(
          'w-full h-full cursor-pointer touch-none transition-all duration-300',
          hoveredAgentId !== null && 'cursor-pointer'
        )}
      />
    </div>
  );
}

// Draw Background Floor, Rooms, Walls
function drawOfficeFloor(ctx: CanvasRenderingContext2D, width: number, height: number, viewMode: '2d' | 'isometric') {
  // Main background grid
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Floor Grid Tiles
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  const tileSize = 40;
  for (let x = 0; x < width; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw Room Sections
  // 1. Workstation Area (Left Zone)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 2;
  roundRect(ctx, 100, 80, 520, 320, 16, true, true);

  // Workstation Label
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.fillText('ENGINEERING BAY', 120, 105);

  // 2. Conference Room (Top Right Zone)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  roundRect(ctx, 650, 80, 290, 320, 16, true, true);

  // Conference Label
  ctx.fillStyle = '#60a5fa';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.fillText('WAR ROOM / CONFERENCE', 670, 105);

  // 3. Lounge / Water Cooler Area (Bottom Zone)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.3)';
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
  roundRect(ctx, 100, 420, 480, 120, 16, true, true);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.fillText('BREAKOUT LOUNGE & WATER COOLER', 120, 445);
}

// Draw Desks, Chairs, Monitors, Conference Table, Lounge Sofa, Water Cooler
function drawFurniture(ctx: CanvasRenderingContext2D, tick: number, viewMode: '2d' | 'isometric') {
  // 1. Workstation Desks
  WORKSPACE_DESKS.forEach((desk) => {
    // Desk Surface
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    roundRect(ctx, desk.x - 45, desk.y - 30, 90, 55, 8, true, true);

    // Chair
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(desk.x, desk.y + 15, 14, 0, Math.PI * 2);
    ctx.fill();

    // Computer Monitor
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    roundRect(ctx, desk.x - 20, desk.y - 25, 40, 16, 4, true, true);

    // Glowing Monitor Screen
    const glow = Math.sin(tick * 0.08) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(59, 130, 246, ${glow})`;
    ctx.fillRect(desk.x - 17, desk.y - 23, 34, 12);

    // Keyboard & Mouse
    ctx.fillStyle = '#475569';
    ctx.fillRect(desk.x - 12, desk.y - 5, 24, 6);
    ctx.fillRect(desk.x + 16, desk.y - 4, 4, 5);
  });

  // 2. Large Oval Conference Table
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(780, 270, 90, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Conference Table Screen / Hologram Centerpiece
  const pulse = (Math.sin(tick * 0.05) + 1) / 2;
  ctx.fillStyle = `rgba(139, 92, 246, ${0.3 + pulse * 0.4})`;
  ctx.beginPath();
  ctx.ellipse(780, 270, 30, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chairs around Conference Table
  CONFERENCE_SEATS.forEach((seat) => {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(seat.x, seat.y, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Lounge Furniture & Water Cooler
  // Sofa
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#475569';
  roundRect(ctx, 130, 465, 380, 45, 10, true, true);

  // Water Cooler
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(540, 465, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.fillRect(532, 455, 16, 10);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '10px Inter';
  ctx.fillText('WATER', 524, 490);

  // Server Rack (Right Bottom)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  roundRect(ctx, 800, 440, 130, 100, 8, true, true);

  // Server Blinking Lights
  for (let i = 0; i < 4; i++) {
    const y = 455 + i * 20;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(810, y, 110, 12);

    const lightOn = (tick + i * 15) % 40 < 20;
    ctx.fillStyle = lightOn ? '#22c55e' : '#15803d';
    ctx.beginPath();
    ctx.arc(825, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = (tick + i * 10) % 30 < 15 ? '#3b82f6' : '#1d4ed8';
    ctx.beginPath();
    ctx.arc(838, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw Individual Pixel-Art Agent Character
function drawAgentCharacter(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  pos: AgentPosition,
  tick: number,
  isSelected: boolean,
  isHovered: boolean,
  viewMode: '2d' | 'isometric'
) {
  const roleConfig = AGENT_ROLE_COLORS[agent.role] || AGENT_ROLE_COLORS.developer;
  const bob = pos.state === 'walking' ? Math.sin(tick * 0.2) * 3 : Math.sin(tick * 0.05) * 1.5;

  ctx.save();
  ctx.translate(pos.x, pos.y + bob);

  // Selection / Hover Ring
  if (isSelected || isHovered) {
    ctx.strokeStyle = isSelected ? '#38bdf8' : '#cbd5e1';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 5, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Character Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character Body / Torso
  ctx.fillStyle = roleConfig.bg;
  ctx.strokeStyle = roleConfig.border;
  ctx.lineWidth = 2;
  roundRect(ctx, -12, -4, 24, 20, 6, true, true);

  // Character Head
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face / Eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-4, -14, 2, 0, Math.PI * 2);
  ctx.arc(4, -14, 2, 0, Math.PI * 2);
  ctx.fill();

  // Role Badge Icon / Initial
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(agent.name.substring(0, 2).toUpperCase(), 0, 8);

  // Working / Typing Animation Effect
  if (pos.state === 'working') {
    const sparkX = (Math.sin(tick * 0.3) * 12);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(sparkX, 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Name & Role Tag Above Character
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = roleConfig.border;
  ctx.lineWidth = 1;
  const tagWidth = Math.max(60, agent.name.length * 7 + 10);
  roundRect(ctx, -tagWidth / 2, -48, tagWidth, 18, 4, true, true);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(agent.name, 0, -35);

  // Thought Bubble
  if (pos.thought || agent.status === 'working' || agent.status === 'thinking') {
    const bubbleText = pos.thought || (agent.status === 'working' ? 'Coding feature...' : 'Analyzing architecture...');
    drawSpeechBubble(ctx, 0, -56, bubbleText);
  }

  ctx.restore();
}

// Draw Speech / Thought Bubble
function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.save();
  ctx.font = '500 10px Inter, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const padding = 8;
  const width = textWidth + padding * 2;
  const height = 20;

  const bubbleX = x - width / 2;
  const bubbleY = y - height;

  // Bubble Box
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bubbleX, bubbleY, width, height, 6, true, true);

  // Little Pointer Triangle
  ctx.beginPath();
  ctx.moveTo(x - 4, bubbleY + height);
  ctx.lineTo(x, bubbleY + height + 5);
  ctx.lineTo(x + 4, bubbleY + height);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, bubbleY + 13);

  ctx.restore();
}

// Helper: Rounded Rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function getInitialThought(agent: Agent): string {
  switch (agent.role) {
    case 'orchestrator':
      return 'Orchestrating workforce pipeline...';
    case 'architect':
      return 'Designing system schemas...';
    case 'developer':
      return 'Writing clean TypeScript...';
    case 'researcher':
      return 'Searching documentation...';
    case 'qa':
      return 'Running unit test suite...';
    case 'reviewer':
      return 'Reviewing code quality...';
    default:
      return 'Ready for next task.';
  }
}
