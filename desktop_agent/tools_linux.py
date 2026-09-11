"""Linux overrides for VAANI desktop tools.

The existing project remains Windows-compatible. When the agent runs on Linux,
this module is imported last and replaces Windows handlers with Ubuntu/GNOME
implementations. X11 enables full global automation; Wayland uses safe portal
and command-line capabilities and reports restricted actions clearly.
"""
from __future__ import annotations

import base64
import io
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, Iterable

from .registry import ToolError, register
from .tools_confirmation import DANGEROUS_ACTIONS, consume_token


def _session() -> str:
    value = (os.environ.get("XDG_SESSION_TYPE") or "").lower().strip()
    if value:
        return value
    if os.environ.get("WAYLAND_DISPLAY"):
        return "wayland"
    if os.environ.get("DISPLAY"):
        return "x11"
    return "unknown"


def _which(names: Iterable[str]) -> str | None:
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return None


def _run(args: list[str], *, timeout: float = 15, input_text: str | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(args, input=input_text, text=True, capture_output=True, timeout=timeout, check=check)
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        raise ToolError(detail or f"Command failed: {args[0]}") from exc
    except Exception as exc:
        raise ToolError(f"Could not run {args[0]}: {exc}") from exc


def platform_capabilities() -> Dict[str, Any]:
    session = _session()
    return {
        "platform": "linux",
        "session": session,
        "desktop": os.environ.get("XDG_CURRENT_DESKTOP", "unknown"),
        "global_input": session == "x11" and bool(_which(["xdotool"])),
        "window_control": session == "x11" and bool(_which(["wmctrl", "xdotool"])),
        "clipboard": bool(_which(["wl-copy", "xclip", "xsel"])),
        "screenshot": bool(_which(["gnome-screenshot", "grim", "scrot", "import"])),
        "volume": bool(_which(["wpctl", "pactl"])),
        "brightness": bool(_which(["brightnessctl"])),
    }


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
_APPS: Dict[str, tuple[list[str], list[str], str]] = {
    "text editor": (["gnome-text-editor", "gedit", "mousepad", "kate"], ["gnome-text-editor", "gedit", "mousepad", "kate"], "Text Editor"),
    "chrome": (["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"], ["chrome", "google-chrome", "chromium"], "Web Browser"),
    "firefox": (["firefox"], ["firefox"], "Firefox"),
    "vscode": (["code", "codium"], ["code", "codium"], "Visual Studio Code"),
    "calculator": (["gnome-calculator", "kcalc", "galculator"], ["gnome-calculator", "kcalc", "galculator"], "Calculator"),
    "files": (["nautilus", "nemo", "thunar", "dolphin"], ["nautilus", "nemo", "thunar", "dolphin"], "Files"),
    "system monitor": (["gnome-system-monitor", "mate-system-monitor"], ["gnome-system-monitor", "mate-system-monitor"], "System Monitor"),
    "settings": (["gnome-control-center", "systemsettings", "mate-control-center"], ["gnome-control-center", "systemsettings", "mate-control-center"], "Settings"),
    "terminal": (["gnome-terminal", "kgx", "konsole", "xfce4-terminal", "xterm"], ["gnome-terminal", "kgx", "konsole", "xfce4-terminal", "xterm"], "Terminal"),
}
_ALIASES = {
    "notepad": "text editor", "editor": "text editor", "browser": "chrome", "google chrome": "chrome",
    "chromium": "chrome", "code": "vscode", "visual studio code": "vscode", "vs code": "vscode",
    "calc": "calculator", "file manager": "files", "file explorer": "files", "explorer": "files",
    "task manager": "system monitor", "taskmanager": "system monitor", "command prompt": "terminal",
    "cmd": "terminal", "powershell": "terminal",
}


def _app(name: str) -> tuple[list[str], list[str], str]:
    key = _ALIASES.get(name.strip().lower(), name.strip().lower())
    if key not in _APPS:
        raise ToolError("Unknown application. Try browser, Firefox, Text Editor, VS Code, Calculator, Files, System Monitor, Settings, or Terminal.")
    return _APPS[key]


@register("openApplication")
def open_application(args: Dict[str, Any]) -> Dict[str, Any]:
    name = str(args.get("name") or args.get("application") or "")
    if not name:
        raise ToolError("Parameter 'name' is required.")
    candidates, _processes, label = _app(name)
    command = _which(candidates)
    if not command:
        raise ToolError(f"{label} is not installed or was not found on PATH.")
    try:
        subprocess.Popen([command], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    except Exception as exc:
        raise ToolError(f"Could not open {label}: {exc}") from exc
    return {"result": f"{label} opened."}


@register("closeApplication")
def close_application(args: Dict[str, Any]) -> Dict[str, Any]:
    name = str(args.get("name") or args.get("application") or "")
    if not name:
        raise ToolError("Parameter 'name' is required.")
    _candidates, processes, label = _app(name)
    signal_name = "KILL" if bool(args.get("force", False)) else "TERM"
    closed = False
    for process_name in processes:
        result = subprocess.run(["pkill", f"-{signal_name}", "-x", process_name], capture_output=True, check=False)
        closed = closed or result.returncode == 0
    return {"result": f"Closed {label}." if closed else f"{label} was not running."}


# ---------------------------------------------------------------------------
# Volume, brightness and power
# ---------------------------------------------------------------------------
def _volume_percent() -> int:
    if _which(["wpctl"]):
        out = _run(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"], check=True).stdout
        match = re.search(r"([0-9]+(?:\.[0-9]+)?)", out)
        if match:
            return max(0, min(100, round(float(match.group(1)) * 100)))
    if _which(["pactl"]):
        out = _run(["pactl", "get-sink-volume", "@DEFAULT_SINK@"], check=True).stdout
        match = re.search(r"(\d+)%", out)
        if match:
            return int(match.group(1))
    raise ToolError("Volume control requires PipeWire 'wpctl' or PulseAudio 'pactl'.")


def _set_volume(percent: int) -> None:
    percent = max(0, min(100, int(percent)))
    if _which(["wpctl"]):
        _run(["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", f"{percent}%"])
        return
    if _which(["pactl"]):
        _run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{percent}%"])
        return
    raise ToolError("Volume control requires wpctl or pactl.")


@register("volumeUp")
def volume_up(args: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(args.get("amount", 0.10))
    step = round(amount * 100) if amount <= 1 else round(amount)
    value = min(100, _volume_percent() + max(1, step))
    _set_volume(value)
    return {"result": f"Volume increased to {value}%."}


@register("volumeDown")
def volume_down(args: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(args.get("amount", 0.10))
    step = round(amount * 100) if amount <= 1 else round(amount)
    value = max(0, _volume_percent() - max(1, step))
    _set_volume(value)
    return {"result": f"Volume decreased to {value}%."}


@register("setVolume")
def set_volume(args: Dict[str, Any]) -> Dict[str, Any]:
    raw = args.get("percent", args.get("level"))
    if raw is None:
        raise ToolError("Parameter 'percent' is required.")
    value = max(0, min(100, round(float(raw))))
    _set_volume(value)
    return {"result": f"Volume set to {value}%."}


@register("muteToggle")
def mute_toggle(args: Dict[str, Any]) -> Dict[str, Any]:
    if _which(["wpctl"]):
        _run(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
    elif _which(["pactl"]):
        _run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "toggle"])
    else:
        raise ToolError("Mute control requires wpctl or pactl.")
    return {"result": "Mute toggled."}


def _brightness_values() -> tuple[int, int]:
    if not _which(["brightnessctl"]):
        raise ToolError("Brightness control requires the 'brightnessctl' package.")
    current = int(_run(["brightnessctl", "get"]).stdout.strip())
    maximum = int(_run(["brightnessctl", "max"]).stdout.strip())
    return current, maximum


def _brightness_percent() -> int:
    current, maximum = _brightness_values()
    return round(current * 100 / maximum) if maximum else 0


def _set_brightness(percent: int) -> int:
    value = max(1, min(100, int(percent)))
    _run(["brightnessctl", "set", f"{value}%"])
    return value


@register("brightnessUp")
def brightness_up(args: Dict[str, Any]) -> Dict[str, Any]:
    value = _set_brightness(_brightness_percent() + int(float(args.get("amount", 10))))
    return {"result": f"Brightness increased to {value}%."}


@register("brightnessDown")
def brightness_down(args: Dict[str, Any]) -> Dict[str, Any]:
    value = _set_brightness(_brightness_percent() - int(float(args.get("amount", 10))))
    return {"result": f"Brightness decreased to {value}%."}


@register("setBrightness")
def set_brightness(args: Dict[str, Any]) -> Dict[str, Any]:
    raw = args.get("percent", args.get("level"))
    if raw is None:
        raise ToolError("Parameter 'percent' is required.")
    value = _set_brightness(round(float(raw)))
    return {"result": f"Brightness set to {value}%."}


@register("executePowerAction")
def execute_power(args: Dict[str, Any]) -> Dict[str, Any]:
    action = str(args.get("action") or "").lower().strip()
    if action not in DANGEROUS_ACTIONS:
        raise ToolError(f"Unknown power action '{action}'.")
    consume_token(action, args.get("execute_token"))
    commands = {
        "lock": ["loginctl", "lock-session"],
        "sleep": ["systemctl", "suspend"],
        "restart": ["systemctl", "reboot"],
        "shutdown": ["systemctl", "poweroff"],
    }
    _run(commands[action], timeout=8)
    return {"result": {"lock": "Computer locked.", "sleep": "Computer going to sleep.", "restart": "Computer restarting.", "shutdown": "Computer shutting down."}[action], "action": action}


# ---------------------------------------------------------------------------
# X11 window and global-input controls
# ---------------------------------------------------------------------------
def _require_x11(purpose: str) -> None:
    if _session() != "x11":
        raise ToolError(f"{purpose} is restricted by Wayland. Log in with 'Ubuntu on Xorg' for full global automation.")


@register("minimizeWindow")
def minimize_window(args: Dict[str, Any]) -> Dict[str, Any]:
    _require_x11("Window minimization")
    xdotool = _which(["xdotool"])
    if not xdotool:
        raise ToolError("Install xdotool for X11 window control.")
    _run([xdotool, "getactivewindow", "windowminimize"])
    return {"result": "Window minimized."}


@register("maximizeWindow")
def maximize_window(args: Dict[str, Any]) -> Dict[str, Any]:
    _require_x11("Window maximization")
    wmctrl = _which(["wmctrl"])
    if not wmctrl:
        raise ToolError("Install wmctrl for X11 window control.")
    _run([wmctrl, "-r", str(args.get("title") or ":ACTIVE:"), "-b", "add,maximized_vert,maximized_horz"])
    return {"result": "Window maximized."}


@register("closeWindow")
def close_window(args: Dict[str, Any]) -> Dict[str, Any]:
    _require_x11("Closing arbitrary windows")
    wmctrl = _which(["wmctrl"])
    if not wmctrl:
        raise ToolError("Install wmctrl for X11 window control.")
    _run([wmctrl, "-c", str(args.get("title") or ":ACTIVE:")])
    return {"result": "Window close requested."}


@register("switchApplication")
def switch_application(args: Dict[str, Any]) -> Dict[str, Any]:
    _require_x11("Application switching")
    title = str(args.get("title") or "").strip()
    if title:
        wmctrl = _which(["wmctrl"])
        if not wmctrl:
            raise ToolError("Install wmctrl for X11 window control.")
        _run([wmctrl, "-a", title])
        return {"result": f"Switched to window matching '{title}'."}
    xdotool = _which(["xdotool"])
    if not xdotool:
        raise ToolError("Install xdotool for application switching.")
    _run([xdotool, "key", "alt+Tab"])
    return {"result": "Switched application."}


def _key_combo(combo: str) -> None:
    _require_x11("Global keyboard control")
    xdotool = _which(["xdotool"])
    if not xdotool:
        raise ToolError("Install xdotool for X11 keyboard control.")
    _run([xdotool, "key", combo])


# ---------------------------------------------------------------------------
# Clipboard
# ---------------------------------------------------------------------------
def _clipboard_read() -> str:
    if _session() == "wayland" and _which(["wl-paste"]):
        return _run(["wl-paste", "--no-newline"], check=False).stdout
    if _which(["xclip"]):
        return _run(["xclip", "-selection", "clipboard", "-o"], check=False).stdout
    if _which(["xsel"]):
        return _run(["xsel", "--clipboard", "--output"], check=False).stdout
    raise ToolError("Clipboard access requires wl-clipboard (Wayland) or xclip/xsel (X11).")


def _clipboard_write(text: str) -> None:
    if _session() == "wayland" and _which(["wl-copy"]):
        _run(["wl-copy"], input_text=text)
        return
    if _which(["xclip"]):
        _run(["xclip", "-selection", "clipboard", "-i"], input_text=text)
        return
    if _which(["xsel"]):
        _run(["xsel", "--clipboard", "--input"], input_text=text)
        return
    raise ToolError("Clipboard access requires wl-clipboard (Wayland) or xclip/xsel (X11).")


@register("getClipboard")
def get_clipboard(args: Dict[str, Any]) -> Dict[str, Any]:
    text = _clipboard_read()
    maximum = int(args.get("max_chars", 1000))
    shown = text if len(text) <= maximum else text[:maximum] + "…"
    return {"result": "Clipboard read.", "text": shown, "length": len(text)}


@register("clearClipboard")
def clear_clipboard(args: Dict[str, Any]) -> Dict[str, Any]:
    _clipboard_write("")
    return {"result": "Clipboard cleared."}


@register("copySelected")
def copy_selected(args: Dict[str, Any]) -> Dict[str, Any]:
    _key_combo("ctrl+c")
    time.sleep(float(args.get("wait", 0.35)))
    return get_clipboard(args)


@register("pasteClipboard")
def paste_clipboard(args: Dict[str, Any]) -> Dict[str, Any]:
    if args.get("text") is not None:
        _clipboard_write(str(args["text"]))
    if _session() == "x11":
        _key_combo("ctrl+v")
        return {"result": "Clipboard pasted."}
    return {"result": "Text copied to the clipboard. Wayland blocks global paste injection; press Ctrl+V in the target application."}


# ---------------------------------------------------------------------------
# Screenshots and OCR
# ---------------------------------------------------------------------------
def _capture_image():
    try:
        from PIL import Image
    except ImportError as exc:
        raise ToolError("Screenshot support requires Pillow.") from exc
    handle, name = tempfile.mkstemp(prefix="vaani-shot-", suffix=".png")
    os.close(handle)
    try:
        if _which(["gnome-screenshot"]):
            _run(["gnome-screenshot", "-f", name], timeout=20)
        elif _session() == "wayland" and _which(["grim"]):
            _run(["grim", name], timeout=20)
        elif _which(["scrot"]):
            _run(["scrot", name], timeout=20)
        elif _which(["import"]):
            _run(["import", "-window", "root", name], timeout=20)
        else:
            raise ToolError("Install gnome-screenshot (recommended), grim, or scrot.")
        with Image.open(name) as image:
            return image.convert("RGB").copy()
    finally:
        try:
            os.unlink(name)
        except OSError:
            pass


def _image_b64(image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=60)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _ocr(image, maximum: int) -> str:
    try:
        import pytesseract
    except ImportError as exc:
        raise ToolError("OCR requires pytesseract and the tesseract-ocr package.") from exc
    if not _which(["tesseract"]):
        raise ToolError("OCR requires the tesseract-ocr system package.")
    text = pytesseract.image_to_string(image)
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return text if len(text) <= maximum else text[:maximum] + "…"


@register("takeScreenshot")
def take_screenshot(args: Dict[str, Any]) -> Dict[str, Any]:
    image = _capture_image()
    result: Dict[str, Any] = {"result": f"Captured screen ({image.width}x{image.height}).", "width": image.width, "height": image.height}
    if bool(args.get("include_image", False)):
        max_dim = int(args.get("max_dim", 1280))
        if max(image.size) > max_dim:
            ratio = max_dim / max(image.size)
            image.thumbnail((round(image.width * ratio), round(image.height * ratio)))
        result.update({"image_base64": _image_b64(image), "image_mime": "image/jpeg"})
    return result


@register("saveScreenshot")
def save_screenshot(args: Dict[str, Any]) -> Dict[str, Any]:
    image = _capture_image()
    folder = Path.home() / "Pictures" / "VaaniScreenshots"
    folder.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", str(args.get("name") or "screenshot")).strip("-") or "screenshot"
    output = folder / f"{safe_name}-{time.strftime('%Y%m%d-%H%M%S')}.png"
    image.save(output, format="PNG")
    return {"result": f"Saved screenshot to {output}.", "path": str(output)}


@register("analyzeScreenshot")
def analyze_screenshot(args: Dict[str, Any]) -> Dict[str, Any]:
    text = _ocr(_capture_image(), int(args.get("max_chars", 1500)))
    return {"result": "Screenshot analyzed.", "text": text or "(no readable text)"}


@register("readScreen")
def read_screen(args: Dict[str, Any]) -> Dict[str, Any]:
    text = _ocr(_capture_image(), int(args.get("max_chars", 1500)))
    return {"result": "Visible screen text read.", "active_window": "Unavailable on Wayland" if _session() == "wayland" else "Current desktop", "text": text or "(no readable text)"}


# ---------------------------------------------------------------------------
# Login auto-start
# ---------------------------------------------------------------------------
def _autostart_path() -> Path:
    return Path.home() / ".config" / "autostart" / "vaani.desktop"


def _app_executable() -> str:
    configured = os.environ.get("VAANI_APP_EXECUTABLE")
    if configured:
        return configured
    installed = _which(["vaani"])
    if installed:
        return installed
    return str(Path(sys.argv[0]).resolve())


@register("enableAutoStart")
def enable_autostart(args: Dict[str, Any]) -> Dict[str, Any]:
    target = _autostart_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    executable = _app_executable().replace('"', '\\"')
    target.write_text(
        "[Desktop Entry]\nType=Application\nName=VAANI\nComment=Lightweight voice assistant\n"
        f'Exec="{executable}"\nTerminal=false\nX-GNOME-Autostart-enabled=true\n',
        encoding="utf-8",
    )
    return {"result": "Auto-start enabled for this Linux account.", "enabled": True, "path": str(target)}


@register("disableAutoStart")
def disable_autostart(args: Dict[str, Any]) -> Dict[str, Any]:
    target = _autostart_path()
    target.unlink(missing_ok=True)
    return {"result": "Auto-start disabled.", "enabled": False}


@register("getAutoStartStatus")
def get_autostart_status(args: Dict[str, Any]) -> Dict[str, Any]:
    enabled = _autostart_path().exists()
    return {"result": "Auto-start is enabled." if enabled else "Auto-start is disabled.", "enabled": enabled, "platform": "linux"}


@register("getPlatformCapabilities")
def get_platform_capabilities(args: Dict[str, Any]) -> Dict[str, Any]:
    return {"result": "Linux capability detection complete.", **platform_capabilities()}


__all__ = ["platform_capabilities"]
