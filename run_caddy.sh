#!/bin/bash
# Script to run Caddy reverse proxy for Nexus Diet hybrid deployment

# Ensure we are in the script's directory
cd "$(dirname "$0")"

echo "----------------------------------------------------"
echo "🚀 Starting Nexus Diet Caddy Reverse Proxy..."
echo "📍 Config: ./Caddyfile"
echo "🌐 Endpoints: https://localhost, https://192.168.4.230"
echo "----------------------------------------------------"

# Run caddy using the system installation
sudo caddy run --config Caddyfile
