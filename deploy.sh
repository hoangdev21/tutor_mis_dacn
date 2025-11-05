#!/bin/bash

# ================================================
# TUTORNIS AUTO DEPLOYMENT SCRIPT FOR AWS EC2
# ================================================
# Cách dùng: bash deploy.sh
# Yêu cầu: SSH access vào server

set -e  # Exit on error

echo "🚀 Starting TutorNis Deployment..."

# ================================================
# 1. UPDATE SYSTEM
# ================================================
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ================================================
# 2. INSTALL DEPENDENCIES
# ================================================
echo "📚 Installing dependencies..."

# Node.js v18
if ! command -v node &> /dev/null; then
    echo "Installing Node.js v18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PM2 (Process Manager)
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2@latest
fi

# Nginx (Web Server)
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt install -y nginx
fi

# Certbot (SSL Certificates)
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
fi

# Git
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo apt install -y git
fi

# ================================================
# 3. CLONE OR UPDATE REPOSITORY
# ================================================
echo "📥 Cloning/Updating repository..."

if [ ! -d "$HOME/tutornis" ]; then
    echo "Cloning repository..."
    git clone https://github.com/NNH21/tutor_mis_dacn.git $HOME/tutornis
else
    echo "Updating existing repository..."
    cd $HOME/tutornis
    git pull origin main
fi

cd $HOME/tutornis

# ================================================
# 4. SETUP BACKEND
# ================================================
echo "⚙️  Setting up backend..."

cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install --production

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "❌ Please edit .env file with production values"
    echo "Command: nano .env"
    exit 1
fi

# Start backend with PM2
echo "Starting backend with PM2..."
pm2 delete tutornis-api || true
pm2 start src/server.js --name "tutornis-api"
pm2 save

cd ..

# ================================================
# 5. SETUP FRONTEND
# ================================================
echo "🎨 Building frontend..."

cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install --production

# Build frontend
echo "Building frontend..."
npm run build

cd ..

# ================================================
# 6. SETUP NGINX
# ================================================
echo "🌐 Configuring Nginx..."

sudo tee /etc/nginx/sites-available/tutornis > /dev/null << 'EOF'
# Frontend Server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /home/ubuntu/tutornis/frontend/dist;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO Proxy
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA Routing
    location / {
        try_files $uri /index.html;
    }

    # Error pages
    error_page 404 /index.html;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/tutornis /etc/nginx/sites-enabled/tutornis
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx

# ================================================
# 7. SETUP SSL CERTIFICATE
# ================================================
echo "🔒 Setting up SSL certificate..."

echo "Please enter your domain name:"
read DOMAIN

echo "Please enter your email for SSL:"
read EMAIL

sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL

# ================================================
# 8. SETUP AUTO-RESTART
# ================================================
echo "🔄 Setting up auto-restart..."

pm2 startup
pm2 save

# Setup daily backup
sudo tee /etc/cron.daily/tutornis-backup > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/tutornis/backups"
mkdir -p $BACKUP_DIR
mongodump --uri "$MONGODB_URI" --out "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)" || true
# Keep only last 7 backups
find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; || true
EOF
sudo chmod +x /etc/cron.daily/tutornis-backup

# ================================================
# 9. SETUP FIREWALL
# ================================================
echo "🛡️  Setting up firewall..."

sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# ================================================
# 10. VERIFICATION
# ================================================
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update your domain DNS records to point to this server IP"
echo "2. Edit backend/.env with your production settings"
echo "3. Restart backend: pm2 restart tutornis-api"
echo "4. Check logs: pm2 logs tutornis-api"
echo ""
echo "Useful commands:"
echo "  pm2 list                    # View running processes"
echo "  pm2 logs tutornis-api       # View backend logs"
echo "  pm2 restart tutornis-api    # Restart backend"
echo "  pm2 stop tutornis-api       # Stop backend"
echo "  sudo systemctl status nginx # Check Nginx status"
echo ""
echo "Server IP: $(hostname -I)"
echo "=========================================="
