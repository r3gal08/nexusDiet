#!/bin/bash

# Start mitmproxy in wireguard mode
echo "Starting mitmproxy in wireguard mode..."
/opt/mitm/mitmweb --mode wireguard -s mitm_bridge.py
