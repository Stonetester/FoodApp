#!/usr/bin/env bash
# =============================================================
# Modo Gusto — Deploy Script
# Run on CT 100 (Roman) as root: bash /usr/local/bin/modogusto-deploy
# =============================================================
# BEFORE FIRST USE: fill in the four variables below.
# Then copy this file to the server:
#   scp backend/deploy.sh root@<CT100-IP>:/usr/local/bin/modogusto-deploy
#   ssh root@<CT100-IP> chmod +x /usr/local/bin/modogusto-deploy
# After that, deploy any time with: modogusto-deploy
# =============================================================

set -euo pipefail

# ---- Configure these for your server ----
APP_USER="root"                             # Linux user that runs the app
APP_DIR="/opt/app/FoodApp"                  # Root of the cloned repo on CT 100
VENV_DIR="$APP_DIR/backend/venv"           # Python virtualenv path
SERVICE_NAME="modogusto"                    # systemd service name
# -----------------------------------------

echo ""
echo "=== Modo Gusto Deploy ==="
echo ""

echo "--> Pulling latest code from main branch..."
sudo -u "$APP_USER" -H bash -lc "
cd $APP_DIR
git fetch origin
git checkout main
git pull origin main
"

echo "--> Installing Python dependencies..."
sudo -u "$APP_USER" -H bash -lc "
cd $APP_DIR/backend
source $VENV_DIR/bin/activate
pip install -r requirements.txt
"

echo "--> Restarting service..."
systemctl restart "$SERVICE_NAME"

echo "--> Waiting for service to come up..."
sleep 3

echo ""
systemctl status "$SERVICE_NAME" --no-pager
echo ""
echo "=== Deploy complete ==="
echo ""
