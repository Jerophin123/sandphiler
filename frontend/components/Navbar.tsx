"use client";

import React, { useState } from 'react';
import { Play, Square, Settings, Wifi, WifiOff, Terminal, Menu } from 'lucide-react';
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
    setShowSidebarMobile
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
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] font-semibold font-mono tracking-wide animate-pulse flex-shrink-0">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
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
      <header className="mx-3.5 mt-3.5 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#151720]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl select-none sticky top-0 z-40 gap-2 shadow-2xl">
        
        {/* Left section: Platform Branding & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSidebarMobile(!showSidebarMobile)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-graphite-300 transition-colors flex-shrink-0"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4 flex-shrink-0" />
          </motion.button>

          <motion.div 
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_2px_10px_rgba(217,119,6,0.1)] flex-shrink-0"
          >
            <Terminal className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
          </motion.div>
          
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white font-sans flex items-center gap-1.5">
              Sandphiler
              <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wider flex-shrink-0">v1.0</span>
            </h1>
            <p className="text-[9px] text-graphite-400 font-mono tracking-widest uppercase truncate">
              SANDBOX WORKSPACE
            </p>
          </div>
        </div>

        {/* Center section: Play/Stop Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {executionState === 'running' ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -0.5 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleKill}
              className="flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold font-mono tracking-wider transition-all duration-200 shadow-[0_2px_12px_rgba(239,68,68,0.1)] flex-shrink-0"
            >
              <Square className="w-3 h-3 fill-current flex-shrink-0" />
              <span className="hidden sm:inline">STOP EXECUTION</span>
              <span className="sm:hidden">STOP</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -0.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRun}
              disabled={connectionStatus !== 'connected'}
              className="flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-30 disabled:pointer-events-none text-black text-xs font-bold font-mono tracking-wider transition-all duration-200 shadow-[0_4px_16px_rgba(217,119,6,0.25)] border-t border-white/20 flex-shrink-0"
            >
              <Play className="w-3 h-3 fill-current flex-shrink-0" />
              <span className="hidden sm:inline">RUN CODE</span>
              <span className="sm:hidden">RUN</span>
            </motion.button>
          )}

          {/* Toggle Terminal Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowTerminal(!showTerminal)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full border text-xs font-bold font-mono tracking-wider transition-all duration-200 shadow-lg flex-shrink-0 ${
              showTerminal 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 animate-none' 
                : 'bg-white/[0.03] border-white/[0.08] text-graphite-300 hover:bg-white/[0.08] hover:text-white'
            }`}
            title={showTerminal ? "Close Terminal" : "Open Terminal"}
          >
            <Terminal className="w-3.5 h-3.5 animate-none flex-shrink-0" />
            <span className="hidden sm:inline">{showTerminal ? 'CLOSE TERMINAL' : 'OPEN TERMINAL'}</span>
            <span className="sm:hidden">{showTerminal ? 'CLOSE' : 'TERM'}</span>
          </motion.button>
        </div>

        {/* Right section: System Status and Settings */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {getConnectionBadge()}
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
