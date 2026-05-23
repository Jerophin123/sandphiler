"use client";

import React, { useState } from 'react';
import { Play, Square, Settings, Wifi, WifiOff, Terminal, Menu, RotateCw, Sidebar as SidebarIcon, PanelBottom } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import SettingsModal from './SettingsModal';

export default function Navbar() {
  const { 
    connectionStatus, 
    executionState, 
    backendUrl, 
    showTerminal, 
    setShowTerminal,
    showSidebarMobile,
    setShowSidebarMobile,
    showSidebar,
    setShowSidebar
  } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRun = () => {
    setShowTerminal(true);
    const event = new CustomEvent('compiler_trigger_run');
    window.dispatchEvent(event);
  };

  const handleKill = () => {
    const event = new CustomEvent('compiler_trigger_kill');
    window.dispatchEvent(event);
  };

  const handleReconnect = () => {
    const event = new CustomEvent('compiler_trigger_reconnect');
    window.dispatchEvent(event);
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-semibold font-mono tracking-wide shadow-[0_2px_8px_rgba(16,185,129,0.08)] flex-shrink-0">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Online
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-semibold font-mono tracking-wide animate-pulse flex-shrink-0">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Connecting
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/25 text-[10px] font-semibold font-mono tracking-wide shadow-[0_2px_8px_rgba(239,68,68,0.08)] flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            Offline
          </span>
        );
    }
  };

  return (
    <>
      <header className="mx-3.5 mt-3.5 flex items-center justify-between px-4 sm:px-6 py-1.5 bg-charcoal-800/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl select-none sticky top-0 z-40 gap-2 shadow-2xl">
        
        {/* Left section: Platform Branding & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">


          <motion.div 
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_2px_10px_rgba(16,185,129,0.15)] flex-shrink-0"
          >
            <Terminal className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
          </motion.div>
          
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white font-sans flex items-center gap-1.5">
              Sandphiler
              <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider flex-shrink-0">v1.5</span>
            </h1>
            <p className="text-[9px] text-graphite-400 font-mono tracking-widest uppercase truncate">
              SANDBOX WORKSPACE
            </p>
          </div>
        </div>

        {/* Center section: Unified Layout & Execution Control Pill */}
        <div className="flex items-center gap-1.5 p-1 bg-black/35 border border-white/[0.08] rounded-full flex-shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
          {/* Mobile Sidebar Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSidebarMobile(!showSidebarMobile)}
            className={`md:hidden flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0 ${
              showSidebarMobile
                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm' 
                : 'text-graphite-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Toggle Sidebar"
          >
            <SidebarIcon className="w-4 h-4 flex-shrink-0" />
          </motion.button>

          {/* Desktop Sidebar Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSidebar(!showSidebar)}
            className={`hidden md:flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0 ${
              showSidebar
                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm' 
                : 'text-graphite-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Toggle Sidebar"
          >
            <SidebarIcon className="w-4 h-4 flex-shrink-0" />
          </motion.button>

          {/* Execution Control (Play/Stop) */}
          {executionState === 'running' ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleKill}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all duration-200 shadow-[0_2px_12px_rgba(239,68,68,0.1)] flex-shrink-0"
              title="Stop Execution"
            >
              <Square className="w-3.5 h-3.5 fill-current flex-shrink-0" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRun}
              disabled={connectionStatus !== 'connected'}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-[#32c968] hover:to-[#22b55f] disabled:opacity-30 disabled:pointer-events-none text-white transition-all duration-200 shadow-[0_4px_16px_rgba(45,181,93,0.35)] border-t border-white/20 flex-shrink-0"
              title="Run Code"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5 flex-shrink-0" />
            </motion.button>
          )}

          {/* Toggle Terminal Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTerminal(!showTerminal)}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0 ${
              showTerminal 
                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm' 
                : 'text-graphite-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title={showTerminal ? "Close Terminal" : "Open Terminal"}
          >
            <PanelBottom className="w-4 h-4 flex-shrink-0" />
          </motion.button>
        </div>

        {/* Right section: System Status and Settings */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {getConnectionBadge()}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReconnect}
            disabled={connectionStatus === 'connecting'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold font-mono tracking-wide transition-all duration-200 flex-shrink-0 ${
              connectionStatus === 'disconnected'
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.12)] animate-pulse'
                : connectionStatus === 'connecting'
                ? 'bg-white/[0.03] border-white/[0.08] text-graphite-400 cursor-not-allowed opacity-50'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-graphite-300 hover:text-white'
            }`}
            title={connectionStatus === 'connecting' ? "Connecting..." : "Reconnect / Refresh Connection"}
          >
            <motion.div
              animate={connectionStatus === 'connecting' ? { rotate: 360 } : {}}
              transition={connectionStatus === 'connecting' ? { repeat: Infinity, duration: 1.2, ease: "linear" } : { duration: 0.2 }}
              whileHover={connectionStatus !== 'connecting' ? { rotate: 180 } : {}}
            >
              <RotateCw className="w-3.5 h-3.5 flex-shrink-0" />
            </motion.div>
            {connectionStatus === 'disconnected' && <span>Reconnect</span>}
            {connectionStatus === 'connected' && <span className="hidden sm:inline">Refresh</span>}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, rotate: 30 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-graphite-300 transition-colors duration-200 hover:text-white shadow-inner flex-shrink-0"
            title="Connection Settings"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
          </motion.button>
        </div>
      </header>

      {/* Render Connection settings modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
