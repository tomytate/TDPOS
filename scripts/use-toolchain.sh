#!/usr/bin/env bash

# Source this file when the host has another Node version earlier in PATH.
# Example: source scripts/use-toolchain.sh

if command -v brew >/dev/null 2>&1; then
  node_prefix="$(brew --prefix node@24 2>/dev/null || brew --prefix node@20 2>/dev/null || true)"
else
  node_prefix=""
fi

if [ -n "$node_prefix" ] && [ -d "$node_prefix/bin" ]; then
  export PATH="$node_prefix/bin:$PATH"
fi

if [ -d "$HOME/.bun/bin" ]; then
  export PATH="$HOME/.bun/bin:$PATH"
fi
