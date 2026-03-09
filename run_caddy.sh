#!/bin/bash
# Script to run Caddy reverse proxy for Nexus Diet hybrid deployment

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# 1. Detect Public IP (e.g. Oracle Cloud Public IP)
export PUBLIC_IP=$(curl -s --max-time 2 ifconfig.me)
[ -z "$PUBLIC_IP" ] && PUBLIC_IP="localhost"

# 2. Detect Private IP (e.g. OCI Internal IP 10.x.x.x)
export PRIVATE_IP=$(hostname -I | awk '{print $1}')
[ -z "$PRIVATE_IP" ] && PRIVATE_IP="localhost"

echo "----------------------------------------------------"
echo "🚀 Starting Nexus Diet Caddy Reverse Proxy..."
echo "📍 Config: ./Caddyfile"
echo "🌍 Detected Public IP:  $PUBLIC_IP"
echo "🏠 Detected Private IP: $PRIVATE_IP"
echo "----------------------------------------------------"

# Run caddy with -E to preserve the environment variables for Caddyfile
sudo -E caddy run --config Caddyfile
