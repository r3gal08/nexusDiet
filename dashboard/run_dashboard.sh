#!/bin/bash

# Move into the dashboard directory if the script is run from the root
cd "$(dirname "$0")"

echo "🚀 Starting Nexus Dashboard Dev Server..."

# Check if node_modules exists, if not, install them first
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
fi

# Run the Vite development server
npm run dev
