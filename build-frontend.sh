#!/bin/bash
# Rebuild the React frontend and output to static/
set -e
cd "$(dirname "$0")/frontend"
npm install
npm run build
echo "Frontend built successfully to static/"
cd ..
