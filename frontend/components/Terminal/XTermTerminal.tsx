"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../../store/useStore';
import { Square, TerminalSquare, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import '@xterm/xterm/css/xterm.css';

export default function XTermTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const { 
    backendUrl, 
    setConnectionStatus, 
    connectionStatus, 
    executionState, 
    setExecutionState,
    setExecutionStats,
    addTerminalLog,
    clearTerminalLogs,
    files,
    language,
    activeSessionId,
    setActiveSessionId,
    showTerminal
  } = useStore();

  const [termHeight, setTermHeight] = useState(250);
  const isResizing = useRef(false);

  // Set compact terminal height on mobile load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTermHeight(180);
    }
  }, []);

  const executionStateRef = useRef(executionState);
  useEffect(() => {
    executionStateRef.current = executionState;
  }, [executionState]);

  const safeFit = () => {
    try {
      const term = termInstance.current as any;
      const fitAddon = fitAddonRef.current;
      const element = terminalRef.current;

      if (!term || !fitAddon || !element) return;

      // Ensure the terminal is open, connected to the DOM, and its renderer service is fully initialized
      if (!term.element || !document.body.contains(term.element)) return;
      if (!term._core || !term._core._renderService || !term._core._renderService.dimensions) {
        // If not fully initialized yet, defer it to the next tick to prevent the dimensions crash
        setTimeout(safeFit, 50);
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fitAddon.fit();
      }
    } catch (err) {
      console.warn('xterm.js fit error ignored:', err);
    }
  };

  // Resize handler for bottom terminal pane drag-to-resize
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const nextHeight = window.innerHeight - e.clientY;
    if (nextHeight >= 150 && nextHeight <= 600) {
      setTermHeight(nextHeight);
      safeFit();
    }
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    safeFit();
  };

  // Socket connection manager reacting to backendUrl changes
  useEffect(() => {
    console.log(`Connecting terminal socket to ${backendUrl}...`);
    setConnectionStatus('connecting');
    
    const socket = io(backendUrl, {
      reconnectionAttempts: 5,
      timeout: 10000,
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setConnectionStatus('connected');
      if (termInstance.current) {
        termInstance.current.writeln('\x1b[1;32m✓ Connected to execution server.\x1b[0m');
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectionStatus('disconnected');
      setExecutionState('idle');
      if (termInstance.current) {
        termInstance.current.writeln('\x1b[1;31m✗ Disconnected from execution server.\x1b[0m');
      }
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
      if (termInstance.current) {
        termInstance.current.writeln('\x1b[1;31m✗ Failed to connect to server. Check IP/Port in settings.\x1b[0m');
      }
    });

    // Inbound streams from VM sandbox
    socket.on('state_change', (data: { state: any }) => {
      setExecutionState(data.state);
    });

    socket.on('compile_output', (data: string) => {
      if (termInstance.current) {
        // Filter out successful compilation and cache reuse messages
        const lines = data.split(/\r?\n/);
        const filteredLines = lines.filter(line => {
          const l = line.trim().toLowerCase();
          return !(
            l.includes('compilation successful') || 
            l.includes('reused') && l.includes('cached') ||
            l.includes('successful') && l.includes('compilation')
          );
        });

        const filteredData = filteredLines.join('\n');
        if (filteredData.trim()) {
          termInstance.current.write(filteredData.replace(/\r?\n/g, '\r\n') + '\r\n');
        }
      }
    });

    socket.on('stdout', (data: string) => {
      if (termInstance.current) {
        // Manually replace raw \n with \r\n to prevent staircase effect
        termInstance.current.write(data.replace(/\r?\n/g, '\r\n'));
      }
      addTerminalLog(data);
    });

    socket.on('stderr', (data: string) => {
      if (termInstance.current) {
        // Manually replace raw \n with \r\n to prevent staircase effect
        termInstance.current.write(data.replace(/\r?\n/g, '\r\n'));
      }
      addTerminalLog(data);
    });

    socket.on('exit', (data: { code: number; signal: string }) => {
      setExecutionState('idle');
      setActiveSessionId(null);
      if (termInstance.current) {
        termInstance.current.writeln(`\r\n\x1b[1;30mProcess finished with exit code ${data.code}\x1b[0m`);
      }
    });

    socket.on('execution_error', (data: string) => {
      setExecutionState('idle');
      setActiveSessionId(null);
      if (termInstance.current) {
        termInstance.current.writeln(`\n\x1b[1;31mExecution Error: ${data}\x1b[0m`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl]);

  // Listen for Navbar events (Compile, Stop, and Reconnect) to trigger WebSocket signals
  useEffect(() => {
    const handleRun = () => {
      if (socketRef.current && socketRef.current.connected) {
        if (termInstance.current) {
          termInstance.current.clear();
        }
        clearTerminalLogs();
        
        socketRef.current.emit('execute', {
          files,
          language,
          profile: 'interactive-terminal',
          priority: 'normal'
        });
      } else {
        if (termInstance.current) {
          termInstance.current.writeln('\x1b[1;31m✗ WebSocket Offline. Check connection settings in Navbar.\x1b[0m');
        }
      }
    };

    const handleKill = () => {
      stopExecution();
    };

    const handleReconnect = () => {
      if (socketRef.current) {
        console.log("Manually reconnecting socket...");
        setConnectionStatus('connecting');
        if (termInstance.current) {
          termInstance.current.writeln('\x1b[1;33mℹ Manually reconnecting to execution server...\x1b[0m');
        }
        socketRef.current.disconnect();
        socketRef.current.connect();
      } else {
        if (termInstance.current) {
          termInstance.current.writeln('\x1b[1;31m✗ Socket manager is not initialized.\x1b[0m');
        }
      }
    };

    window.addEventListener('compiler_trigger_run', handleRun);
    window.addEventListener('compiler_trigger_kill', handleKill);
    window.addEventListener('compiler_trigger_reconnect', handleReconnect);

    return () => {
      window.removeEventListener('compiler_trigger_run', handleRun);
      window.removeEventListener('compiler_trigger_kill', handleKill);
      window.removeEventListener('compiler_trigger_reconnect', handleReconnect);
    };
  }, [files, language]);

  // Terminal initialization
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create Terminal instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: 'JetBrains Mono, monospace',
      convertEol: true, // Fixes staircase indentation by converting \n to \r\n
      theme: {
        background: '#151720', // Warm deep-slate surface matching the parent card container
        foreground: '#eaeaea',
        cursor: '#d97706', // Accent amber
        black: '#151720',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#eaeaea'
      },
      scrollback: 1000
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    termInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;30mSystem Terminal Ready.\x1b[0m');

    safeFit();

    let inputLine = '';

    // Key press event listener -> handle local echo and forward to sandbox process stdin
    term.onData((data) => {
      if (data === '\r') {
        term.write('\r\n');
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('stdin', inputLine + '\n');
        }
        inputLine = '';
      } else if (data === '\x7f' || data === '\x08') { // Backspace
        if (inputLine.length > 0) {
          inputLine = inputLine.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        const code = data.charCodeAt(0);
        // Only allow printable characters and tabs
        if (code >= 32 || data === '\t') {
          inputLine += data;
          term.write(data);
        }
      }
    });

    // Resize listener
    const handleResizeListener = () => {
      safeFit();
    };
    window.addEventListener('resize', handleResizeListener);

    return () => {
      window.removeEventListener('resize', handleResizeListener);
      term.dispose();
      termInstance.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Recalculate terminal size on toggle transition
  useEffect(() => {
    if (showTerminal) {
      const timer = setTimeout(() => {
        safeFit();
      }, 50);
      const timer2 = setTimeout(() => {
        safeFit();
      }, 300);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [showTerminal]);

  // Force stop execution
  const stopExecution = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('kill', 'SIGKILL');
      setExecutionState('idle');
      setActiveSessionId(null);
    }
  };

  const clearTerminal = () => {
    if (termInstance.current) {
      termInstance.current.clear();
      clearTerminalLogs();
    }
  };

  // Helper status color classes
  const getStateBadgeColor = () => {
    switch (executionState) {
      case 'queued': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'preparing': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      case 'compiling': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'running': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse';
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'crashed': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      default: return 'bg-[#1e2235]/40 text-graphite-300 border border-white/[0.05]';
    }
  };

  return (
    <div 
      className={`w-full flex-shrink-0 flex flex-col bg-[#151720] rounded-2xl relative overflow-hidden transition-all duration-300 ${
        showTerminal 
          ? 'opacity-100 border border-white/[0.08] shadow-2xl' 
          : 'h-0 opacity-0 border-none pointer-events-none'
      }`}
      style={{ height: showTerminal ? `${termHeight}px` : '0px' }}
    >
      {/* Top drag resize handle bar */}
      <div 
        className="absolute top-0 left-0 w-full h-[6px] cursor-ns-resize hover:bg-amber-500/30 transition-all z-20"
        onMouseDown={startResize}
      />

      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e1017] border-b border-white/[0.04] text-xs font-mono text-graphite-300 select-none">
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-3.5 h-3.5 text-graphite-400" />
          <span className="font-sans font-medium text-xs text-graphite-200">Interactive Terminal</span>
          {executionState !== 'idle' && (
            <span className={`px-3 py-0.5 rounded-full text-[10px] capitalize font-sans ${getStateBadgeColor()}`}>
              {executionState}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {executionState !== 'idle' && (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={stopExecution}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 text-[10px] font-semibold transition"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              Kill
            </motion.button>
          )}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={clearTerminal}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full hover:bg-white/[0.04] hover:text-white transition text-[10px] text-graphite-400 font-semibold"
          >
            <Trash2 className="w-3 h-3" />
            Clear Log
          </motion.button>
        </div>
      </div>

      {/* Actual Terminal Screen */}
      <div className="flex-1 w-full p-3 bg-[#151720] overflow-hidden relative">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
}
