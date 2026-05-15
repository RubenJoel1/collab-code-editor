#!/bin/bash
# EC2 User Data script — runs once on first boot as root
set -e

# ── 1. System packages ──────────────────────────────────────────────────────
dnf update -y
dnf install -y git

# ── 2. Node.js 22 via NodeSource ────────────────────────────────────────────
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

# ── 3. PM2 (process manager) ────────────────────────────────────────────────
npm install -g pm2

# ── 4. Clone the repo ───────────────────────────────────────────────────────
cd /home/ec2-user
git clone https://github.com/RubenJoel1/collab-code-editor.git app
chown -R ec2-user:ec2-user app

# ── 5. Install server dependencies ──────────────────────────────────────────
cd /home/ec2-user/app/server
npm install --omit=dev

# ── 6. Write .env (fill in values before launching, or set via SSM/Secrets) ─
cat > /home/ec2-user/app/server/.env << 'ENV'
DATABASE_URL=postgresql://postgres:YOURPASSWORD@YOUR-RDS-ENDPOINT:5432/collabeditor
CLIENT_ORIGIN=https://YOURXXXXX.cloudfront.net
PORT=3001
ENV

chown ec2-user:ec2-user /home/ec2-user/app/server/.env
chmod 600 /home/ec2-user/app/server/.env

# ── 7. Start server with PM2 and persist across reboots ─────────────────────
cd /home/ec2-user/app/server
sudo -u ec2-user pm2 start ecosystem.config.js --env production
sudo -u ec2-user pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user | tail -1 | bash
