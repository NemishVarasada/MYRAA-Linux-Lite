"""Launch and close common Linux desktop applications."""
from __future__ import annotations

import os
import shutil
import subprocess
from typing import Any, Dict

from .registry import ToolError, register

APP_COMMANDS: Dict[str, Dict[str, Any]] = {
    "text editor": {"candidates": ["gnome-text-editor", "gedit", "mousepad", "kate"], "processes": ["gnome-text-editor", "gedit", "mousepad", "kate"], "label": "Text Editor"},
    "notepad": {"alias": "text editor"},
    "chrome": {"candidates": ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"], "processes": ["chrome", "google-chrome", "chromium"], "label": "Web Browser"},
    "firefox": {"candidates": ["firefox"], "processes": ["firefox"], "label": "Firefox"},
    "browser": {"alias": "chrome"},
    "vscode": {"candidates": ["code", "codium"], "processes": ["code", "codium"], "label": "Visual Studio Code"},
    "calculator": {"candidates": ["gnome-calculator", "kcalc", "galculator"], "processes": ["gnome-calculator", "kcalc", "galculator"], "label": "Calculator"},
    "file manager": {"candidates": ["nautilus", "nemo", "thunar", "dolphin"], "processes": ["nautilus", "nemo", "thunar", "dolphin"], "label": "Files"},
    "file explorer": {"alias": "file manager"},
    "explorer": {"alias": "file manager"},
    "system monitor": {"candidates": ["gnome-system-monitor", "mate-system-monitor"], "processes": ["gnome-system-monitor", "mate-system-monitor"], "label": "System Monitor"},
    "task manager": {"alias": "system monitor"},
    "settings": {"candidates": ["gnome-control-center", "systemsettings", "mate-control-center"], "processes": ["gnome-control-center", "systemsettings", "mate-control-center"], "label": "Settings"},
    "terminal": {"candidates": ["gnome-terminal", "kgx", "konsole", "xfce4-terminal", "xterm"], "processes": ["gnome-terminal", "kgx", "konsole", "xfce4-terminal", "xterm"], "label": "Terminal"},
}

ALIASES = {
    "code": "vscode",
    "visual studio code": "vscode",
    "vs code": "vscode",
    "google chrome": "chrome",
    "chromium": "chrome",
    "calc": "calculator",
    "files": "file manager",
    "taskmanager": "system monitor",
}


def _resolve(name: str) -> Dict[str, Any]:
    key = (name or "").strip().lower()
    key = ALIASES.get(key, key)
    seen: set[str] = set()
    while key in APP_COMMANDS and "alias" in APP_COMMANDS[key]:
        if key in seen:
            break
        seen.add(key)
        key = str(APP_COMMANDS[key]["alias"])
    spec = APP_COMMANDS.get(key)
    if not spec:
        raise ToolError(f"Unknown application '{name}'. Try browser, Firefox, text editor, VS Code, calculator, Files, System Monitor, Settings, or Terminal.")
    return spec


def _find(spec: Dict[str, Any]) -> str:
    for candidate in spec.get("candidates", []):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    raise ToolError(f"{spec['label']} is not installed or was not found on PATH.")


@register("openApplication")
def open_application(args: Dict[str, Any]) -> Dict[str, Any]:
    name = args.get("name") or args.get("application")
    if not name:
        raise ToolError("Parameter 'name' is required.")
    spec = _resolve(str(name))
    command = _find(spec)
    env = os.environ.copy()
    try:
        subprocess.Popen([command], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, env=env)
    except Exception as exc:
        raise ToolError(f"Could not launch {spec['label']}: {exc}") from exc
    return {"result": f"{spec['label']} opened.", "command": command}


@register("closeApplication")
def close_application(args: Dict[str, Any]) -> Dict[str, Any]:
    name = args.get("name") or args.get("application")
    if not name:
        raise ToolError("Parameter 'name' is required.")
    spec = _resolve(str(name))
    signal_name = "KILL" if bool(args.get("force", False)) else "TERM"
    matched = False
    for process_name in spec.get("processes", []):
        result = subprocess.run(["pkill", f"-{signal_name}", "-x", process_name], capture_output=True, text=True, check=False)
        matched = matched or result.returncode == 0
    message = f"Closed {spec['label']}." if matched else f"{spec['label']} was not running."
    return {"result": message}


__all__ = ["open_application", "close_application", "APP_COMMANDS"]
