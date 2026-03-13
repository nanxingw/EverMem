#!/usr/bin/env bash
# EverMem Async — One-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/nanxingw/EverMem/main/install.sh | bash

set -e

REPO="https://github.com/nanxingw/EverMem"
PKG="evermem-async"

echo ""
echo "  ╔════════════════════════════════╗"
echo "  ║     EverMem Async Installer    ║"
echo "  ║  Memory Bridge for AI CLI Tools║"
echo "  ╚════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required (>=18). Install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node --version)"
  exit 1
fi

echo "✓ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm is required"
  exit 1
fi

echo "✓ npm $(npm --version)"
echo ""

# Install package
echo "📦 Installing evermem-async..."
npm install -g evermem-async

echo ""
echo "✓ evermem-async installed successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next: Run setup wizard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run setup
evermem setup

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete! Quick start commands:"
echo ""
echo "  evermem start --daemon  # Start background daemon"
echo "  evermem web             # Open web dashboard"
echo "  evermem run             # Sync memories now"
echo "  evermem status          # Check status"
echo "  evermem stop            # Stop daemon"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
