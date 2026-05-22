# Sandphiler Compiler Platform - NextJS 16 App Router Frontend

This is a premium, handcrafted, human-designed compiler workspace frontend built in NextJS 16, TypeScript, Tailwind CSS, Monaco Editor, and xterm.js. It features a dark graphite, VSCode-inspired editor and dynamic connection mapping options to speak to the VM-based sandboxed compiler backend server across local network routing.

---

## 1. Directory Structure Layout

```text
D:\compiler-frontend\
├── app\
│   ├── layout.tsx             # Sets up custom layout variables & google fonts
│   ├── page.tsx               # Main IDE split workspace dashboard page
│   └── globals.css            # Tailwind directives and custom scrollbar rules
├── components\
│   ├── Navbar.tsx             # Controls Run/Stop executions & settings trigger
│   ├── Sidebar.tsx            # Controls switching languages and font sizes
│   ├── SettingsModal.tsx      # Customizes dynamic VM server IP configurations (with health check tool)
│   ├── Editor\
│   │   └── MonacoEditor.tsx   # SSR-safe code input editor
│   └── Terminal\
│       └── XTermTerminal.tsx  # Dynamic lazy-loaded xterm.js interactive WebSocket shell
├── store\
│   └── useStore.ts            # Zustand global state manager with default scripts
├── types\
│   └── index.ts               # Global TypeScript definitions
├── package.json               # System dependencies configuration
├── tsconfig.json              # TypeScript compilation rules
├── tailwind.config.ts         # Custom Tailwind graphite matte color tokens
├── postcss.config.mjs         # CSS compiler processing
├── next.config.mjs            # Next.js configurations
└── README.md                  # This setup documentation
```

---

## 2. Installation & Running Locally

Follow these steps on your Windows machine to boot the developer server:

### Step 1: Install Node.js Dependencies
Navigate to the frontend project folder in your terminal and install dependencies:
```bash
cd D:\compiler-frontend
npm install
```

### Step 2: Start NextJS 16 Development Server
```bash
npm run dev
```
The server will spin up on **`http://localhost:3000`** in your browser.

---

## 3. Connecting to the Ubuntu VM Compiler Server

Since your compiler VM IP address changes depending on local routing setups (e.g. DHCP leases), the frontend supports **dynamic endpoint configuration** directly from the UI:

1. Open `http://localhost:3000` in your web browser.
2. In the top-right corner of the navbar, click the **Settings Cog** icon.
3. In the modal, input the LAN IP Address and Port of your active VM compiler server:
   - **VM IP Address**: `192.168.21.134` (or your active VM routing address)
   - **Server Port**: `5000`
4. Click the **TEST SERVER** button. The modal will make an asynchronous GET handshake to check if the server is healthy.
5. If the server is reachable and active, you will see `✓ Server Connection Successful!`.
6. Click **SAVE SETTINGS** to persist this configuration. The xterm.js terminal will instantly reconnect.
7. Swap runtimes on the sidebar and click **RUN CODE** on the navbar to execute sandboxed code instantly across the LAN!
