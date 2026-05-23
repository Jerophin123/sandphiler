#!/bin/bash

# =========================================================

# Sandphiler Compiler Backend Ubuntu Setup

# =========================================================

set -e

echo "=================================================="
echo " Updating Ubuntu Packages"
echo "=================================================="

sudo apt update

echo "=================================================="
echo " Installing Core Compilers & Runtimes"
echo "=================================================="

sudo apt install -y \
  build-essential \
  gcc \
  g++ \
  openjdk-21-jdk \
  nodejs \
  npm \
  golang \
  php \
  ruby-full \
  mono-complete \
  mysql-server \
  r-base

echo "=================================================="
echo " Installing TypeScript"
echo "=================================================="

sudo npm install -g typescript

echo "=================================================="
echo " Installing Rust"
echo "=================================================="

curl https://sh.rustup.rs -sSf | sh -s -- -y

echo "=================================================="
echo " Loading Rust Environment"
echo "=================================================="

source ~/.cargo/env

echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc

source ~/.bashrc

echo "=================================================="
echo " Installing Kotlin"
echo "=================================================="

sudo snap install kotlin --classic || true

echo "=================================================="
echo " Installing Dart SDK"
echo "=================================================="

sudo apt-get update
sudo apt-get install -y apt-transport-https wget gpg
wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor --yes -o /usr/share/keyrings/dart.gpg
echo 'deb [signed-by=/usr/share/keyrings/dart.gpg arch=amd64] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main' | sudo tee /etc/apt/sources.list.d/dart_stable.list
sudo apt-get update
sudo apt-get install -y dart || true

echo "=================================================="
echo " Creating Sandbox User"
echo "=================================================="

if id "sandbox" &>/dev/null; then
echo "Sandbox user already exists"
else
sudo adduser --disabled-password --gecos "" sandbox
fi

echo "=================================================="
echo " Creating Sandbox Workspace"
echo "=================================================="

sudo mkdir -p /sandbox
sudo mkdir -p /sandbox/.cache
sudo mkdir -p /sandbox/go

sudo chown -R sandbox:sandbox /sandbox

sudo chmod -R 755 /sandbox

echo "=================================================="
echo " Configuring Control Groups (cgroups v2)"
echo "=================================================="

# Install cgroup-tools for cgexec utility support
sudo apt install -y cgroup-tools || true

# Set up dedicated sandphiler cgroup parent folder for dynamic sandbox sessions
sudo mkdir -p /sys/fs/cgroup/sandphiler
sudo chown -R sandbox:sandbox /sys/fs/cgroup/sandphiler

# Delegate cgroups v2 controllers inside parent group to subtree if available
if [ -f "/sys/fs/cgroup/cgroup.subtree_control" ]; then
  # Try to enable memory, cpu, and pids controllers in the root control group
  # so that children groups (like our delegated sandphiler) can use them
  echo "+memory +cpu +pids" | sudo tee /sys/fs/cgroup/cgroup.subtree_control > /dev/null || true
  
  # Also enable memory, cpu, and pids in the sandphiler parent group's subtree control
  # so that session-specific child cgroups can actually access and set memory.max and pids.max
  if [ -f "/sys/fs/cgroup/sandphiler/cgroup.subtree_control" ]; then
    echo "+memory +cpu +pids" | sudo tee /sys/fs/cgroup/sandphiler/cgroup.subtree_control > /dev/null || true
  fi
fi

echo "=================================================="
echo " Configuring Passwordless Sandbox Execution"
echo "=================================================="

# Detect the actual user who invoked sudo, falling back to current user
REAL_USER=${SUDO_USER:-$(whoami)}

SUDOERS_FILE="/etc/sudoers.d/sandphiler-sandbox"

# Grant permission to the invoking user
echo "$REAL_USER ALL=(sandbox) NOPASSWD:ALL" | sudo tee $SUDOERS_FILE

# Also grant permission to 'ubuntu' user to be safe if that is running the backend
if [ "$REAL_USER" != "ubuntu" ]; then
  echo "ubuntu ALL=(sandbox) NOPASSWD:ALL" | sudo tee -a $SUDOERS_FILE
fi

sudo chmod 440 $SUDOERS_FILE

# Ensure the host user's home directory is traversable (+x) by the sandbox user
# so sandboxed processes can access any globally-installed local compilers/tools (like rustc, cargo, npm/nvm binaries)
REAL_USER_HOME=$(eval echo "~$REAL_USER")
if [ -d "$REAL_USER_HOME" ]; then
  echo "Making home directory $REAL_USER_HOME traversable for sandbox user"
  sudo chmod 755 "$REAL_USER_HOME"
  
  # Also make .cargo and .rustup and .npm readable/traversable if they exist
  if [ -d "$REAL_USER_HOME/.cargo" ]; then
    sudo chmod -R 755 "$REAL_USER_HOME/.cargo"
  fi
  if [ -d "$REAL_USER_HOME/.rustup" ]; then
    sudo chmod -R 755 "$REAL_USER_HOME/.rustup"
  fi
  if [ -d "$REAL_USER_HOME/.npm" ]; then
    sudo chmod -R 755 "$REAL_USER_HOME/.npm"
  fi
fi

echo "=================================================="
echo " Installing Useful Runtime Tools"
echo "=================================================="

sudo apt install -y \
  coreutils \
  procps \
  psmisc


echo "=================================================="
echo " Verifying Installed Compilers"
echo "=================================================="

echo ""
echo "[Python]"
python3 --version || true

echo ""
echo "[Node.js]"
node --version || true

echo ""
echo "[TypeScript]"
tsc --version || true

echo ""
echo "[Java]"
java --version || true

echo ""
echo "[C Compiler]"
gcc --version | head -n 1 || true

echo ""
echo "[C++ Compiler]"
g++ --version | head -n 1 || true

echo ""
echo "[Go]"
go version || true

echo ""
echo "[Rust]"
rustc --version || true

echo ""
echo "[Cargo]"
cargo --version || true

echo ""
echo "[PHP]"
php --version | head -n 1 || true

echo ""
echo "[Ruby]"
ruby --version || true

echo ""
echo "[Kotlin]"
kotlinc -version || true

echo ""
echo "[Mono]"
mono --version | head -n 1 || true

echo ""
echo "[MCS Compiler]"
mcs --version || true

echo ""
echo "[Dart]"
dart --version || true

echo ""
echo "[R Language]"
Rscript --version || true

echo ""
echo "[Bash]"
bash --version || true

echo "=================================================="
echo " Provisioning Secure MySQL Sandbox User"
echo "=================================================="

# Enable and start mysql service
sudo systemctl start mysql || true
sudo systemctl enable mysql || true

# Provision sql_sandbox user with ALL PRIVILEGES
sudo mysql -e "CREATE USER IF NOT EXISTS 'sql_sandbox'@'localhost' IDENTIFIED BY '1168mysql';" || true
sudo mysql -e "ALTER USER 'sql_sandbox'@'localhost' IDENTIFIED BY '1168mysql';" || true
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'sql_sandbox'@'localhost' WITH GRANT OPTION;" || true
sudo mysql -e "FLUSH PRIVILEGES;" || true

echo "=================================================="
echo " Installing Server Dependencies"
echo "=================================================="

# Run npm install directly in the source directory to install newly added dependencies (like mysql2)
sudo npm install --unsafe-perm || npm install

echo "=================================================="
echo " Installing Sandbox Node.js Dependencies"
echo "=================================================="

# Create /sandbox/node_modules and install mysql2 on /sandbox
# This ensures it is resolvable by sandboxed node processes running in /sandbox/session-id
sudo mkdir -p /sandbox
sudo npm --prefix /sandbox install mysql2 --unsafe-perm
sudo chown -R sandbox:sandbox /sandbox/node_modules /sandbox/package.json /sandbox/package-lock.json 2>/dev/null || true
sudo chmod -R 755 /sandbox/node_modules


echo "=================================================="
echo " Configuring Outbound Network Blocking for Sandbox"
echo "=================================================="

# Apply outbound internet block for sandbox user (allowing loopback lo interface)
if sudo iptables -C OUTPUT -m owner --uid-owner sandbox ! -o lo -j REJECT &>/dev/null; then
  echo "Outbound internet blocking rule for sandbox already exists."
else
  echo "Applying iptables rule to block outbound internet for 'sandbox' user (loopback allowed)..."
  sudo iptables -A OUTPUT -m owner --uid-owner sandbox ! -o lo -j REJECT
fi

# Preseed answers for iptables-persistent to ensure silent, non-interactive installation
echo "iptables-persistent iptables-persistent/autosave_v4 boolean true" | sudo debconf-set-selections
echo "iptables-persistent iptables-persistent/autosave_v6 boolean true" | sudo debconf-set-selections

# Persist the iptables rules across reboots
echo "Installing iptables-persistent for firewall persistence..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent || true
sudo netfilter-persistent save || true

echo "=================================================="
echo " Testing Sandbox Execution"
echo "=================================================="

sudo -u sandbox bash -c 'echo "Sandbox execution working successfully"'

echo "=================================================="
echo " Setup Completed Successfully"
echo "=================================================="

echo ""
echo "Now restart your Node.js backend."
echo ""
echo "Recommended:"
echo "CTRL + C"
echo "npm start"
echo ""
echo "Sandbox directory:"
echo "/sandbox"
echo ""
echo "Sandbox user:"
echo "sandbox"
echo ""
echo "Rust PATH:"
echo "$HOME/.cargo/bin"
