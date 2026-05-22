# Production-Grade Sandboxed Online Compiler Backend

An enterprise-ready, high-performance, secure, and interactive online compiler backend built using Node.js, Express, and Socket.IO. It is designed to run in an Ubuntu Server VM and execute untrusted code in an isolated filesystem sandbox under an unprivileged `sandbox` user, managed via Linux `prlimit` constraints.

---

## 1. System Architecture

The backend consists of:
1. **REST API**: Standard endpoints for listing supported runtimes, running quick scripts, monitoring server resources, and forcing process stops.
2. **Socket.IO Real-Time Streaming**: Establishes interactive, line-buffered terminal-like streaming sessions with output cache replays, stdin input pipe forwarding, and Ctrl+C interrupt signals.
3. **Priority Queue System**: FIFO queue scheduler managing maximum execution counts and preventing resources from choking.
4. **Isolated Executors**: Modular compiler and interpreter drivers for 12 major programming languages.
5. **State Machine System**: Execution status lifecycles (`queued` -> `preparing` -> `compiling` -> `running` -> `completed` / `timeout` / `killed` / `crashed` -> `cleanup`).
6. **Background Sweepers**: System cleanup cron searching for orphaned workspaces, lingering background processes, and expired caches.

---

## 2. API Documentation

### REST Endpoints

#### `POST /api/run`
Submit a batch code script execution.
- **Request Body**:
```json
{
  "language": "python",
  "files": [
    {
      "name": "main.py",
      "content": "import sys\nprint('Hello world!')"
    }
  ],
  "profile": "interactive-terminal",
  "priority": "normal"
}
```
- **Response**:
```json
{
  "sessionId": "46fae8dc-37ea-4d83-bc27-7cf4c211fca3",
  "success": true,
  "state": "completed",
  "durationMs": 420,
  "compileOutput": "",
  "stdout": "Hello world!\n",
  "stderr": "",
  "error": null
}
```

#### `POST /api/stop`
Terminate an active session execution.
- **Request Body**:
```json
{
  "sessionId": "46fae8dc-37ea-4d83-bc27-7cf4c211fca3"
}
```

#### `GET /api/languages`
Retrieve list of supported language identifiers, their real-time runtime/compiler availability, absolute paths on this server, version strings, and installation guides.
- **Response**:
```json
{
  "languages": [
    {
      "language": "python",
      "label": "Python 3",
      "available": true,
      "version": "Python 3.10.12",
      "compilerPath": null,
      "runtimePath": "/usr/bin/python3",
      "installHint": null
    },
    {
      "language": "kotlin",
      "label": "Kotlin (kotlinc)",
      "available": false,
      "version": null,
      "compilerPath": null,
      "runtimePath": null,
      "installHint": "sudo snap install --classic kotlin"
    }
  ]
}
```

#### `GET /api/stats`
Returns live system metrics (CPU load, free RAM, disk usages, queued processes, active subprocess list).

---

### Socket.IO Event Specification

#### Client to Server Events
* **`execute`**: Starts execution.
  ```json
  {
    "sessionId": "optional-custom-uuid",
    "language": "cpp",
    "files": [{ "name": "main.cpp", "content": "#include <iostream>..." }],
    "profile": "interactive-terminal",
    "priority": "high"
  }
  ```
* **`stdin`**: Sends a string to the input stream of the active process.
* **`kill`**: Signals interruption (e.g. sending Ctrl+C). Expects value `'SIGINT'`.
* **`resize`**: Resize terminal (simulate PTY). Expects `{ cols: number, rows: number }`.

#### Server to Client Events
* **`state_change`**: Emits state machine phase changes (`preparing`, `compiling`, `running`, `completed`, etc.).
* **`compile_output`**: Emitted when compilation stderr/stdout prints lines.
* **`stdout`**: Live output stream.
* **`stderr`**: Live error stream.
* **`exit`**: Process termination. Returns `{ code: number, signal: string }`.
* **`execution_sync`**: Emitted upon reconnect, telling the client current status.

---

## 3. Ubuntu Server VM Sandboxing Setup

To execute untrusted user code safely inside your Ubuntu Server VM, follow these configuration instructions.

### Step 1: Create the Low-Privileged Sandbox User
Create a dedicated user named `sandbox` with no shell privileges and no home folder.
```bash
# Create a low-privileged system user without login shell access
sudo useradd -r -s /bin/false -M sandbox
```

### Step 2: Configure Sandbox Directory
Set up the execution root directory (e.g., `/sandbox`) where temporary folders are created:
```bash
# Create the root sandbox folder
sudo mkdir -p /sandbox

# Change owner to the user running the compiler server (e.g. appuser) so it can create session directories
sudo chown -R your_node_user:your_node_user /sandbox
```

### Step 3: Configure Passwordless Sudo for Sandbox Execution
To allow the compiler backend process (running under standard user `your_node_user`) to execute processes under the `sandbox` user context without entering passwords:
```bash
# Open the sudoers configuration file
sudo visudo
```
Add the following line to the end of the file:
```text
your_node_user ALL=(sandbox) NOPASSWD: ALL
```
*Replace `your_node_user` with the Linux username running the Node.js server (e.g. `ubuntu` or `app`).*

---

## 4. Language Runtimes Installation Guide

Install compilers and interpreters on the VM. Below is the command guide for all 12 supported languages to make them available to the compiler.

### 4.1 Quick Install (All-in-One script)
```bash
sudo apt update
sudo apt install -y build-essential gcc g++ default-jdk golang-go php ruby-full mono-complete coreutils
```

### 4.2 Individual Language Setup Instructions

#### 1. Python 3
- **Commands**: `sudo apt install python3`
- **Verification path**: `/usr/bin/python3`

#### 2. Node.js (JavaScript)
- **Commands**: `sudo apt install nodejs`
- **Verification path**: `/usr/bin/node`

#### 3. TypeScript
- **Commands**:
  ```bash
  sudo apt install npm
  sudo npm install -g typescript
  ```
- **Verification path**: `/usr/local/bin/tsc`

#### 4. C (GCC)
- **Commands**: `sudo apt install gcc`
- **Verification path**: `/usr/bin/gcc`

#### 5. C++ (G++)
- **Commands**: `sudo apt install g++`
- **Verification path**: `/usr/bin/g++`

#### 6. Java (Open JDK)
- **Commands**: `sudo apt install default-jdk`
- **Verification path**: `/usr/bin/javac` (compiler) and `/usr/bin/java` (interpreter)

#### 7. Go
- **Commands**: `sudo apt install golang-go`
- **Verification path**: `/usr/bin/go` or `/usr/local/go/bin/go`

#### 8. Rust
- **Commands**:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source $HOME/.cargo/env
  ```
- **Verification path**: `~/.cargo/bin/rustc`

#### 9. Kotlin
- **Commands**: `sudo snap install --classic kotlin`
- **Verification path**: `/snap/bin/kotlinc`

#### 10. PHP
- **Commands**: `sudo apt install php`
- **Verification path**: `/usr/bin/php`

#### 11. Ruby
- **Commands**: `sudo apt install ruby`
- **Verification path**: `/usr/bin/ruby`

#### 12. C# (Mono)
- **Commands**: `sudo apt install mono-complete`
- **Verification path**: `/usr/bin/mcs` (compiler) and `/usr/bin/mono` (interpreter)

---

## 5. Runtime Path Resolution & Verification

Headless execution environments (like systemd service workers or pm2 processes) often run with heavily stripped `PATH` variables. This typically prevents standard command execution and generates `ENOENT` process failures for user scripts (such as Cargo/Rust or Snap/Kotlin paths not being resolved).

To prevent this, the backend introduces a robust two-stage automatic resolution structure:

### 5.1 Enriched Global PATH Injection
The server builds an absolute routing path string covering all typical installation locations (defined in `runtimeConfig.js`):
- `/snap/bin` (Snap applications)
- `~/.cargo/bin` (Rust tools)
- `/usr/local/bin` (npm global packages)
- `/usr/bin`
- `/bin`
- `/usr/local/sbin`
- `/usr/sbin`
- `/sbin`

All subprocess invocations use the `buildSpawnEnv()` configuration utility which merges this robust `PATH` and relevant environment variables (like `GOPATH` or `RUSTUP_HOME`).

### 5.2 Automatic Startup Probing
At boot time, `runtimeDetector.js` executes:
1. **Candidate Path Verification**: Probes configured well-known candidate paths on disk.
2. **Dynamic Fallback**: Invokes a `which` shell utility lookup using the enriched environment if candidate paths don't match.
3. **Version Check**: Resolves compiler and runner versions to construct a system diagnostic table.

This diagnostic is printed on startup in the following console structure:
```text
╔══════════════════════════════════════════════════════╗
║           Runtime Detection Results                  ║
╠══════════════════════════════════════════════════════╣
║  Python 3             ✓  Python 3.10.12              ║
║  Node.js              ✓  v18.19.1                    ║
║  TypeScript (tsc)     ✓  Version 5.3.3               ║
║  C (GCC)              ✓  gcc (Ubuntu 11.4.0)         ║
║  C++ (G++)            ✓  g++ (Ubuntu 11.4.0)         ║
║  Java (javac/java)    ✓  javac 17.0.10               ║
║  Kotlin (kotlinc)     ✓  info: kotlinc-jvm 1.9.22    ║
║  Rust (rustc)         ✓  rustc 1.76.0                ║
║  Go                   ✓  go version go1.22.0         ║
║  PHP                  ✓  PHP 8.1.2 (cli)             ║
║  Ruby                 ✓  ruby 3.0.2p203              ║
║  C# (Mono)            ✓  Mono C# compiler version    ║
╚══════════════════════════════════════════════════════╝
```

---

## 6. Production Deployment with systemd

To run the Node.js application continuously as a service:
1. Create a service file:
```bash
sudo nano /etc/systemd/system/compiler.service
```
2. Insert config:
```ini
[Unit]
Description=Sandboxed Compiler Backend
After=network.target

[Service]
Type=simple
User=your_node_user
WorkingDirectory=/path/to/project/compiler
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production PORT=5000 SANDBOX_ROOT=/sandbox USE_SUDO=true SANDBOX_USER=sandbox

[Install]
WantedBy=multi-user.target
```
3. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable compiler.service
sudo systemctl start compiler.service
sudo systemctl status compiler.service
```

