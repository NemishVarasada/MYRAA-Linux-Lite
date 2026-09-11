"""Linux desktop/session detection and command helpers for MYRAA."""
from __future__ import annotations

import os
import shutil
import subprocess
from typing import Any, Dict, Iterable, Optional


def session_type() -> str:
    value = (os.environ.get("XDG_SESSION_TYPE") or "").strip().lower()
    if value:
        return value
    if os.environ.get("WAYLAND_DISPLAY"):
        return "wayland"
    if os.environ.get("DISPLAY"):
        return "x11"
    return "unknown"


def desktop_name() -> str:
    return (os.environ.get("XDG_CURRENT_DESKTOP") or "unknown").strip()


def first_command(candidates: Iterable[str]) -> Optional[str]:
    for command in candidates:
        resolved = shutil.which(command)
        if resolved:
            return resolved
    return None


def require_command(candidates: Iterable[str], purpose: str) -> str:
    command = first_command(candidates)
    if command:
        return command
    names = ", ".join(candidates)
    raise RuntimeError(f"{purpose} requires one of: {names}")


def run(
    args: list[str],
    *,
    timeout: float = 12,
    input_text: str | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=check,
    )


def capabilities() -> Dict[str, Any]:
    session = session_type()
    return {
        "platform": "linux",
        "session": session,
        "desktop": desktop_name(),
        "full_global_automation": session == "x11" and bool(first_command(["xdotool"])),
        "window_management": session == "x11" and bool(first_command(["wmctrl", "xdotool"])),
        "clipboard": bool(first_command(["wl-copy", "xclip", "xsel"])),
        "screenshot": bool(first_command(["gnome-screenshot", "grim", "scrot", "import"])),
        "volume": bool(first_command(["wpctl", "pactl"])),
        "brightness": bool(first_command(["brightnessctl"])),
        "browser": bool(first_command(["google-chrome", "chromium", "chromium-browser", "firefox"])),
    }
