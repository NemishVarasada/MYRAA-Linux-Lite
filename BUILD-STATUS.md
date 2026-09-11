# Build status

Validated in the build sandbox:
- Python source compiles successfully.
- Linux tool registry loads 59 tools and detects Wayland/X11 at runtime.
- Electron main process and build scripts pass Node syntax checks.
- The Node backend bundles successfully to `dist/server.cjs`.
- The lightweight microphone UI renders without overflow or console exceptions.

A final `.deb`/AppImage must be produced on Ubuntu because PyInstaller and Electron package native Linux binaries for the build host. Run `./build-linux.sh` on Ubuntu 22.04; outputs appear in `release/`.
