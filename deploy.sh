#!/bin/bash
# ─────────────────────────────────────────────────
# Cognia SDLC Crew — EC2 Deployment Script
# Run this ON the EC2 instance after uploading files
# ─────────────────────────────────────────────────

set -e
echo "╔══════════════════════════════════════════════╗"
echo "║   Cognia SDLC Crew — EC2 Deployment          ║"
echo "╚══════════════════════════════════════════════╝"

APP_DIR="/home/ec2-user/sdlc-agent-crew"

# Step 1: Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "→ Installing Node.js 20..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs
fi
echo "✅ Node.js $(node --version)"

# Step 2: Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  echo "→ Installing PM2..."
  sudo npm install -g pm2
fi
echo "✅ PM2 installed"

# Step 3: Install dependencies
echo "→ Installing dependencies..."
cd "$APP_DIR"
npm install --production --ignore-scripts

# Step 4: Build frontend
echo "→ Building frontend..."
npm run build

# Step 5: Copy production env
if [ -f .env.production ]; then
  cp .env.production .env
  echo "✅ Environment configured"
fi

# Step 6: Start/restart with PM2
echo "→ Starting app with PM2..."
pm2 delete cognia-sdlc 2>/dev/null || true
pm2 start server/index.js --name cognia-sdlc --node-args="--experimental-modules"
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "→ Check status: pm2 status"
echo "→ View logs:    pm2 logs cognia-sdlc"
echo "→ App URL:      http://localhost:3001"
echo ""
