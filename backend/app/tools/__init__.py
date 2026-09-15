from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from enum import Enum
import subprocess
import os
import shlex
import asyncio
from pathlib import Path


class ToolPermission(str, Enum):
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    NETWORK = "network"
    SUDO = "sudo"


class ToolResult(BaseModel):
    success: bool
    output: str = ""
    error: str = ""
    exit_code: int = 0
    duration_ms: int = 0


class Tool(ABC):
    name: str = ""
    description: str = ""
    required_permissions: List[ToolPermission] = []
    input_schema: Dict[str, Any] = {}
    
    @abstractmethod
    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        pass
    
    def check_permission(self, permission: ToolPermission, agent_permissions: Dict[str, Any]) -> bool:
        if permission == ToolPermission.SUDO:
            return agent_permissions.get("sudo", False)
        if permission == ToolPermission.NETWORK:
            return agent_permissions.get("network", False)
        if permission == ToolPermission.WRITE:
            return agent_permissions.get("filesystem", "workspace") in ["workspace", "full"]
        if permission == ToolPermission.READ:
            return agent_permissions.get("filesystem", "workspace") in ["workspace", "full", "readonly"]
        if permission == ToolPermission.EXECUTE:
            return agent_permissions.get("terminal", "restricted") in ["restricted", "full"]
        return False


class TerminalTool(Tool):
    name = "terminal"
    description = "Execute shell commands in the project workspace"
    required_permissions = [ToolPermission.EXECUTE]
    input_schema = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "Command to execute"},
            "cwd": {"type": "string", "description": "Working directory (relative to workspace)"},
            "timeout": {"type": "integer", "description": "Timeout in seconds", "default": 60},
            "env": {"type": "object", "description": "Environment variables"}
        },
        "required": ["command"]
    }
    
    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        import time
        start = time.time()
        
        workspace = context.get("workspace", ".")
        command = params["command"]
        cwd = params.get("cwd", ".")
        timeout = params.get("timeout", 60)
        env = params.get("env", {})
        
        full_cwd = Path(workspace) / cwd
        if not full_cwd.exists():
            return ToolResult(success=False, error=f"Working directory does not exist: {full_cwd}", exit_code=-1)
        
        full_env = os.environ.copy()
        full_env.update(env)
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                cwd=str(full_cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
                duration = int((time.time() - start) * 1000)
                return ToolResult(
                    success=process.returncode == 0,
                    output=stdout.decode() if stdout else "",
                    error=stderr.decode() if stderr else "",
                    exit_code=process.returncode,
                    duration_ms=duration
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                duration = int((time.time() - start) * 1000)
                return ToolResult(
                    success=False,
                    error=f"Command timed out after {timeout}s",
                    exit_code=-1,
                    duration_ms=duration
                )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            return ToolResult(success=False, error=str(e), exit_code=-1, duration_ms=duration)


class FilesystemTool(Tool):
    name = "filesystem"
    description = "Read, write, and list files in the project workspace"
    required_permissions = [ToolPermission.READ, ToolPermission.WRITE]
    input_schema = {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["read", "write", "list", "delete", "mkdir"]},
            "path": {"type": "string", "description": "Path relative to workspace"},
            "content": {"type": "string", "description": "Content for write action"},
            "recursive": {"type": "boolean", "default": False}
        },
        "required": ["action", "path"]
    }
    
    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        import time
        start = time.time()
        
        workspace = Path(context.get("workspace", "."))
        action = params["action"]
        path = params["path"]
        full_path = workspace / path
        
        try:
            if action == "read":
                if not full_path.exists():
                    return ToolResult(success=False, error=f"File not found: {path}", exit_code=1)
                if not full_path.is_file():
                    return ToolResult(success=False, error=f"Not a file: {path}", exit_code=1)
                content = full_path.read_text()
                return ToolResult(success=True, output=content, duration_ms=int((time.time() - start) * 1000))
            
            elif action == "write":
                content = params.get("content", "")
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(content)
                return ToolResult(success=True, output=f"Written to {path}", duration_ms=int((time.time() - start) * 1000))
            
            elif action == "list":
                if not full_path.exists():
                    return ToolResult(success=False, error=f"Path not found: {path}", exit_code=1)
                if full_path.is_file():
                    return ToolResult(success=True, output=path, duration_ms=int((time.time() - start) * 1000))
                files = []
                for item in full_path.iterdir():
                    files.append({
                        "name": item.name,
                        "type": "file" if item.is_file() else "directory",
                        "size": item.stat().st_size if item.is_file() else 0
                    })
                return ToolResult(success=True, output=json.dumps(files), duration_ms=int((time.time() - start) * 1000))
            
            elif action == "delete":
                if not full_path.exists():
                    return ToolResult(success=False, error=f"Path not found: {path}", exit_code=1)
                if full_path.is_file():
                    full_path.unlink()
                else:
                    if params.get("recursive"):
                        import shutil
                        shutil.rmtree(full_path)
                    else:
                        full_path.rmdir()
                return ToolResult(success=True, output=f"Deleted {path}", duration_ms=int((time.time() - start) * 1000))
            
            elif action == "mkdir":
                full_path.mkdir(parents=True, exist_ok=True)
                return ToolResult(success=True, output=f"Created directory {path}", duration_ms=int((time.time() - start) * 1000))
            
            else:
                return ToolResult(success=False, error=f"Unknown action: {action}", exit_code=1)
        
        except Exception as e:
            return ToolResult(success=False, error=str(e), exit_code=-1, duration_ms=int((time.time() - start) * 1000))


class GitTool(Tool):
    name = "git"
    description = "Git operations in the project workspace"
    required_permissions = [ToolPermission.EXECUTE, ToolPermission.READ, ToolPermission.WRITE]
    input_schema = {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["status", "diff", "add", "commit", "push", "pull", "branch", "checkout", "log"]},
            "args": {"type": "array", "items": {"type": "string"}, "default": []},
            "cwd": {"type": "string", "default": "."}
        },
        "required": ["action"]
    }
    
    async def execute(self, params: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        import time
        start = time.time()
        
        workspace = Path(context.get("workspace", "."))
        cwd = workspace / params.get("cwd", ".")
        action = params["action"]
        args = params.get("args", [])
        
        cmd = ["git", action] + args
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            duration = int((time.time() - start) * 1000)
            return ToolResult(
                success=process.returncode == 0,
                output=stdout.decode() if stdout else "",
                error=stderr.decode() if stderr else "",
                exit_code=process.returncode,
                duration_ms=duration
            )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            return ToolResult(success=False, error=str(e), exit_code=-1, duration_ms=duration)


class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self._register_defaults()
    
    def _register_defaults(self):
        self.register(TerminalTool())
        self.register(FilesystemTool())
        self.register(GitTool())
    
    def register(self, tool: Tool):
        self.tools[tool.name] = tool
    
    def get(self, name: str) -> Optional[Tool]:
        return self.tools.get(name)
    
    def list_tools(self) -> List[Tool]:
        return list(self.tools.values())
    
    async def execute(self, name: str, params: Dict[str, Any], context: Dict[str, Any], agent_permissions: Dict[str, Any]) -> ToolResult:
        tool = self.get(name)
        if not tool:
            return ToolResult(success=False, error=f"Tool not found: {name}", exit_code=-1)
        
        for perm in tool.required_permissions:
            if not tool.check_permission(perm, agent_permissions):
                return ToolResult(
                    success=False,
                    error=f"Permission denied: {perm.value} required for tool {name}",
                    exit_code=-1
                )
        
        return await tool.execute(params, context)


tool_registry = ToolRegistry()