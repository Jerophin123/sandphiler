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
  mono-complete

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

sudo snap install kotlin --classic

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

sudo chown sandbox:sandbox /sandbox

sudo chmod 755 /sandbox

echo "=================================================="
echo " Configuring Passwordless Sandbox Execution"
echo "=================================================="

CURRENT_USER=$(whoami)

SUDOERS_FILE="/etc/sudoers.d/sandphiler-sandbox"

echo "$CURRENT_USER ALL=(sandbox) NOPASSWD:ALL" | sudo tee $SUDOERS_FILE

sudo chmod 440 $SUDOERS_FILE

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
