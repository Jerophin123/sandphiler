"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MonacoEditor from '../components/Editor/MonacoEditor';
import { useStore } from '../store/useStore';

// SSR-Safe dynamic loader for the xterm.js terminal emulator
const XTermTerminal = dynamic(
  () => import('../components/Terminal/XTermTerminal'),
  { ssr: false, loading: () => (
    <div className="h-[250px] flex items-center justify-center bg-charcoal-700 border border-white/[0.08] rounded-2xl text-graphite-400 font-mono text-xs">
      Initializing terminal subsystem...
    </div>
  )}
);

export default function WorkspacePage() {
  const hydrateStore = useStore((state) => state.hydrateStore);
  const showTerminal = useStore((state) => state.showTerminal);
  const language = useStore((state) => state.language);
  const showSidebarMobile = useStore((state) => state.showSidebarMobile);
  const setShowSidebarMobile = useStore((state) => state.setShowSidebarMobile);
  const showSidebar = useStore((state) => state.showSidebar);

  useEffect(() => {
    hydrateStore();
  }, [hydrateStore]);

  // Auto-close mobile drawer when user switches language runtimes
  useEffect(() => {
    setShowSidebarMobile(false);
  }, [language, setShowSidebarMobile]);

  return (
    <main className="flex flex-col h-screen bg-charcoal-800 bg-gradient-to-b from-charcoal-800 to-charcoal-900 text-graphite-100 overflow-hidden font-sans">
      
      {/* 1. Translucent Navbar header */}
      <Navbar />

      {/* 2. Floating Workspace Layout */}
      <div className={`flex-grow flex p-3.5 overflow-hidden relative transition-all duration-300 ${
        showSidebar ? 'gap-3.5' : 'gap-3.5 md:gap-0'
      }`}>
        
        {/* Mobile Sidebar Slide-over Drawer Overlay */}
        <AnimatePresence>
          {showSidebarMobile && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex md:hidden"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSidebarMobile(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Slide-in sidebar container */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-[260px] max-w-[80vw] h-full bg-charcoal-700 border-r border-white/[0.08] flex flex-col z-10 shadow-2xl"
              >
                {/* Close Button inside Drawer */}
                <div className="absolute top-4 right-4 z-20">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSidebarMobile(false)}
                    className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/[0.06] text-graphite-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Renders the Sidebar */}
                <Sidebar />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Sidebar Card (Desktop) */}
        <div className={`hidden md:block flex-shrink-0 h-full bg-charcoal-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          showSidebar ? 'w-[245px] opacity-100 border border-white/[0.08]' : 'w-0 opacity-0 border-0 pointer-events-none'
        }`}>
          <Sidebar />
        </div>

        {/* Workspace Central area */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          showTerminal ? 'gap-3.5' : 'gap-0'
        }`}>
          
          {/* Upper Monaco Editor screen Card */}
          <div className="flex-1 w-full min-h-[200px] bg-charcoal-700 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            <MonacoEditor />
          </div>

          {/* Lower xterm.js terminal pane Card */}
          <div className={`w-full flex-shrink-0 transition-all duration-300 ${
            showTerminal ? 'opacity-100' : 'h-0 opacity-0 overflow-hidden pointer-events-none'
          }`} style={{ height: showTerminal ? 'auto' : '0px' }}>
            <XTermTerminal />
          </div>

        </div>

      </div>

    </main>
  );
}
