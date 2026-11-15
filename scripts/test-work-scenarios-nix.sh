#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Match playwright-core 1.52.0 to patched Firefox/WebKit/Chromium on NixOS.
# No Docker, root access, FHS sandbox, or hand-patched browser downloads.
revision=650e572363c091045cdbc5b36b0f4c1f614d3058
export PLAYWRIGHT_BROWSERS_PATH
PLAYWRIGHT_BROWSERS_PATH=$(nix-build \
    "https://github.com/NixOS/nixpkgs/archive/$revision.tar.gz" \
    -A playwright-driver.browsers --no-out-link)
# WebKit's headless WPE renderer still needs an EGL vendor. Select Mesa's
# software renderer explicitly; Replit does not expose /run/opengl-driver.
mesa=$(nix-build "https://github.com/NixOS/nixpkgs/archive/$revision.tar.gz" \
    -A mesa --no-out-link)
export __EGL_VENDOR_LIBRARY_FILENAMES="$mesa/share/glvnd/egl_vendor.d/50_mesa.json"
export LIBGL_ALWAYS_SOFTWARE=1
# Nix supplies the linked libraries; Playwright's Ubuntu host checker cannot
# discover them. Launch failures and test failures are never skipped.
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
npm run test:work-scenarios-browser
