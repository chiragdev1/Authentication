#!/usr/bin/env bash
# one-time setup for a fresh Ubuntu 24.04 VPS. Run as root, with -t so it can ask for your sudo password:
#   scp deploy/setup-vps.sh root@203.0.113.10:/root/ && ssh -t root@203.0.113.10 bash /root/setup-vps.sh
# safe to re-run. Walkthrough: docs/VPS-ACCESS.md
set -euo pipefail

# you: personal ssh key, sudo with a password
ADMIN_USER=chirag
# github actions only: its own key, runs docker, no sudo
DEPLOY_USER=deploy
APP_DIR=/opt/ckauth
EDGE_DIR=/opt/edge

echo "==> System updates"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Docker (official repository)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# cap container logs so they can't fill the disk
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl restart docker
systemctl enable docker

# creates a user with an empty, locked-down ~/.ssh/authorized_keys
create_user() {
  local user=$1
  if ! id "$user" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" "$user"
  fi
  install -d -m 700 -o "$user" -g "$user" "/home/$user/.ssh"
  touch "/home/$user/.ssh/authorized_keys"
  chown "$user:$user" "/home/$user/.ssh/authorized_keys"
  chmod 600 "/home/$user/.ssh/authorized_keys"
}

echo "==> Deploy user ($DEPLOY_USER)"
create_user "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
# its key is the github actions one, added later (docs/VPS-ACCESS.md, part 3)

echo "==> Admin user ($ADMIN_USER)"
create_user "$ADMIN_USER"
# docker group = root-equivalent, same as sudo; it just saves typing sudo before every docker command
# the deploy group lets you edit the app folders that github actions also writes to
usermod -aG sudo,docker,"$DEPLOY_USER" "$ADMIN_USER"
# your laptop key, the one you used to log in as root
if [ -s /root/.ssh/authorized_keys ]; then
  sort -u /root/.ssh/authorized_keys "/home/$ADMIN_USER/.ssh/authorized_keys" -o "/home/$ADMIN_USER/.ssh/authorized_keys"
fi
if passwd -S "$ADMIN_USER" | grep -q " L "; then
  echo "    Choose a password for $ADMIN_USER. It is only used for sudo, never for SSH logins."
  passwd "$ADMIN_USER"
fi

echo "==> App directories"
# shared by you and github actions through the deploy group; the setgid bit (the leading 2) makes
# every file created inside belong to that group, whoever creates it
install -d -m 2770 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
# shared reverse proxy for every site on this vps; each project writes its own file in sites/
install -d -m 2775 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$EDGE_DIR" "$EDGE_DIR/sites"

echo "==> Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> SSH hardening"
if [ -s "/home/$ADMIN_USER/.ssh/authorized_keys" ]; then
  cat > /etc/ssh/sshd_config.d/99-hardening.conf <<CONF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers $ADMIN_USER $DEPLOY_USER
CONF
  sshd -t
  systemctl reload ssh
  echo "    Root and password logins are off. From now on: ssh $ADMIN_USER@<vps-ip>"
else
  echo "    SKIPPED: $ADMIN_USER has no SSH key yet, so root and password logins stay on."
  echo "    Log in as root with your key first (docs/VPS-ACCESS.md, part 1), then re-run this script."
fi

echo "==> Done. Test 'ssh $ADMIN_USER@<vps-ip>' in a NEW terminal before closing this one."
