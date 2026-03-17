#!/bin/bash
# Script to run Caddy reverse proxy for Nexus Diet hybrid deployment
# Duckdns caddy binary: https://github.com/caddy-dns/duckdns
# pull with following command (might need to replace os/arch): curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=amd64&p=github.com/caddy-dns/duckdns" -o caddy
# Mostly used as a development script as the service file replaces this.

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# 1. Detect Public IP (e.g. Oracle Cloud Public IP)
export PUBLIC_IP=$(curl -s --max-time 2 ifconfig.me)
[ -z "$PUBLIC_IP" ] && PUBLIC_IP="localhost"

# 2. Detect Private IP (e.g. OCI Internal IP 10.x.x.x)
export PRIVATE_IP=$(hostname -I | awk '{print $1}')
[ -z "$PRIVATE_IP" ] && PRIVATE_IP="localhost"

# TODO: Will need to regen token as I actually uploaded mine to github :/
# TODO: These should be stored in a secrets manager or something
export DUCKDNS_TOKEN="XXX"
export DUCKDNS_DOMAIN="XXX"

echo "----------------------------------------------------"
echo "🚀 Starting Nexus Diet Caddy Reverse Proxy..."
echo "📍 Config: ./Caddyfile"
echo "🌍 Detected Public IP:  $PUBLIC_IP"
echo "🏠 Detected Private IP: $PRIVATE_IP"
echo "----------------------------------------------------"

# Run caddy with -E to preserve the environment variables for Caddyfile
sudo -E caddy run --config Caddyfile_local
