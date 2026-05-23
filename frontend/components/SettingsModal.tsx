"use client";

import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, SlidersHorizontal, Minus, Plus, Settings, Globe, Lock, Activity } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { backendUrl, setBackendUrl, preferences, updatePreferences } = useStore();
  const [activeTab, setActiveTab] = useState<'connection' | 'editor'>('connection');
  const [protocol, setProtocol] = useState<'http://' | 'https://'>('http://');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('5000');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Parse current backendUrl on open
  useEffect(() => {
    if (isOpen) {
      try {
        const url = new URL(backendUrl);
        setProtocol(url.protocol === 'https:' ? 'https://' : 'http://');
        setIp(url.hostname);
        setPort(url.port || '');
        setTestState('idle');
        setErrorMessage('');
      } catch (err) {
        setProtocol('http://');
        setIp('43.204.130.188');
        setPort('5000');
      }
    }
  }, [isOpen, backendUrl]);

  const handleFontSizeChange = (amount: number) => {
    const nextSize = preferences.fontSize + amount;
    if (nextSize >= 10 && nextSize <= 28) {
      updatePreferences({ fontSize: nextSize });
    }
  };

  const handleIpChange = (val: string) => {
    const cleaned = val.trim();
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      try {
        const url = new URL(cleaned);
        setProtocol(url.protocol === 'https:' ? 'https://' : 'http://');
        setIp(url.hostname);
        if (url.port) {
          setPort(url.port);
        } else {
          setPort('');
        }
      } catch (e) {
        setIp(cleaned);
      }
    } else {
      setIp(cleaned);
    }
  };

  const getFormattedUrl = () => {
    const cleanIp = ip.trim();
    const cleanPort = port.trim();
    return cleanPort ? `${protocol}${cleanIp}:${cleanPort}` : `${protocol}${cleanIp}`;
  };

  const handleSave = () => {
    setBackendUrl(getFormattedUrl());
    onClose();
  };

  const handleTestConnection = async () => {
    setTestState('testing');
    setErrorMessage('');
    const targetUrl = `${getFormattedUrl()}/health`;

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000); // 4-second timeout limit

      const res = await fetch(targetUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(id);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'healthy') {
          setTestState('success');
        } else {
          setTestState('failed');
          setErrorMessage('Server responded, but system state is unhealthy.');
        }
      } else {
        setTestState('failed');
        setErrorMessage(`Server returned status code: ${res.status}`);
      }
    } catch (err: any) {
      setTestState('failed');
      setErrorMessage(
        err.name === 'AbortError' 
          ? 'Connection timed out. Check VM firewall or network settings.' 
          : 'Could not reach server. Verify VM IP address is correct.'
      );
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 select-none">
          {/* Translucent overlay backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-2xl bg-charcoal-700/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-charcoal-800/60 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#2db55d]/10 border border-[#2db55d]/20 text-[#2db55d]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm leading-tight font-sans">Workspace Settings</h2>
                  <p className="text-[10px] text-graphite-400 mt-0.5">Customize environment options and server connections</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="p-1.5 rounded-full hover:bg-white/[0.05] text-graphite-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Modal Content - Two Column Layout */}
            <div className="flex h-[280px] md:h-[310px] overflow-hidden">
              
              {/* Left Sidebar Categories */}
              <div className="w-[180px] flex-shrink-0 bg-charcoal-800/40 border-r border-white/[0.04] p-4 flex flex-col gap-1.5 select-none justify-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('connection')}
                  className={`relative w-full px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-2.5 text-left z-10 ${
                    activeTab === 'connection' ? 'text-[#2db55d]' : 'text-graphite-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Server className="w-4 h-4 flex-shrink-0" />
                  Connection
                  {activeTab === 'connection' && (
                    <motion.div
                      layoutId="activeModalCategoryBg"
                      className="absolute inset-0 bg-[#2db55d]/10 border border-[#2db55d]/20 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`relative w-full px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-2.5 text-left z-10 ${
                    activeTab === 'editor' ? 'text-[#2db55d]' : 'text-graphite-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
                  Editor UI
                  {activeTab === 'editor' && (
                    <motion.div
                      layoutId="activeModalCategoryBg"
                      className="absolute inset-0 bg-[#2db55d]/10 border border-[#2db55d]/20 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>

              {/* Right Settings Pane */}
              <div className="flex-grow overflow-y-auto sleek-scrollbar bg-charcoal-700/30 p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'connection' ? (
                    <motion.div 
                      key="connection-settings"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="bg-[#2db55d]/5 border border-[#2db55d]/10 px-4 py-3 rounded-2xl text-[11px] text-[#2db55d] leading-normal font-mono flex gap-2">
                        <span className="font-bold flex-shrink-0">ℹ</span>
                        <span>Configure VM backend target. Sandphiler binds compilation queries and standard input loops dynamically to this network host.</span>
                      </div>

                      {/* Protocol Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-graphite-400 font-bold uppercase tracking-wider font-mono px-1 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> Protocol
                        </label>
                        <div className="flex bg-black/40 p-1 border border-white/[0.04] rounded-2xl w-full justify-between">
                          <button
                            type="button"
                            onClick={() => setProtocol('http://')}
                            className={`relative flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                              protocol === 'http://' ? 'bg-[#2db55d] text-white shadow-md' : 'text-graphite-400 hover:text-white'
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                            Standard (HTTP / WS)
                          </button>
                          <button
                            type="button"
                            onClick={() => setProtocol('https://')}
                            className={`relative flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                              protocol === 'https://' ? 'bg-[#2db55d] text-white shadow-md' : 'text-graphite-400 hover:text-white'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                            Secure (HTTPS / WSS)
                          </button>
                        </div>
                      </div>

                      {/* Host Address & Port Input Group */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 flex flex-col gap-1.5">
                          <label className="text-[10px] text-graphite-400 font-bold uppercase tracking-wider font-mono px-1">
                            VM Host IP / Domain
                          </label>
                          <div className="flex items-center h-11 bg-black/40 border border-white/[0.06] rounded-2xl focus-within:border-[#2db55d] transition-colors duration-200 overflow-hidden shadow-inner px-3">
                            <span className="text-graphite-400 text-xs font-mono select-none px-2 border-r border-white/[0.08] mr-2.5 h-7 flex items-center bg-white/[0.02] rounded-lg">
                              {protocol}
                            </span>
                            <input 
                              type="text" 
                              value={ip}
                              onChange={(e) => handleIpChange(e.target.value)}
                              placeholder="192.168.1.50"
                              className="flex-grow bg-transparent border-none outline-none text-white text-sm font-mono focus:ring-0 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-graphite-400 font-bold uppercase tracking-wider font-mono px-1">
                            Port
                          </label>
                          <div className="flex items-center h-11 bg-black/40 border border-white/[0.06] rounded-2xl focus-within:border-[#2db55d] transition-colors duration-200 overflow-hidden shadow-inner px-3">
                            <input 
                              type="text" 
                              value={port}
                              onChange={(e) => setPort(e.target.value)}
                              placeholder="5000"
                              className="w-full bg-transparent border-none outline-none text-white text-sm font-mono focus:ring-0 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Connection Test feedback */}
                      {testState !== 'idle' && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`px-4 py-3 border rounded-2xl text-xs flex gap-3 items-start transition-colors ${
                            testState === 'testing' ? 'bg-white/[0.02] border-white/[0.06] text-graphite-300' :
                            testState === 'success' ? 'bg-[#2db55d]/10 border-[#2db55d]/20 text-[#2db55d]' :
                            'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}
                        >
                          {testState === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-graphite-400 mt-0.5 flex-shrink-0" />}
                          {testState === 'success' && <CheckCircle2 className="w-4 h-4 text-[#2db55d] mt-0.5 flex-shrink-0" />}
                          {testState === 'failed' && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                          
                          <div className="flex-1 font-mono text-[11px]">
                            <span className="font-bold block text-xs">
                              {testState === 'testing' ? 'Testing network handshake...' :
                               testState === 'success' ? '✓ Server Connection Successful!' :
                               '✗ Connection Failed'}
                            </span>
                            {errorMessage && <span className="block mt-1 text-[10px] opacity-80 leading-normal font-sans">{errorMessage}</span>}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="editor-settings"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="bg-white/[0.02] border border-white/[0.04] px-5 py-3.5 rounded-2xl text-[11px] text-graphite-400 leading-normal font-mono flex gap-2">
                        <span className="font-bold flex-shrink-0">⚙</span>
                        <span>Tune the visual preferences of your coding editor panels. All configurations are stored locally and reflect in real time.</span>
                      </div>

                      {/* Font Size controls */}
                      <div className="flex justify-between items-center bg-black/40 border border-white/[0.06] p-3.5 px-5 rounded-2xl">
                        <div>
                          <span className="text-white font-semibold text-xs block">Editor Font Size</span>
                          <span className="text-[10px] text-graphite-400 mt-0.5 block">Adjust text size of editor lines</span>
                        </div>
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                          <motion.button 
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleFontSizeChange(-1)}
                            className="p-1.5 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors text-graphite-400"
                            type="button"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </motion.button>
                          <span className="w-10 text-center font-bold text-white text-xs tracking-tight font-mono">{preferences.fontSize}px</span>
                          <motion.button 
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleFontSizeChange(1)}
                            className="p-1.5 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors text-graphite-400"
                            type="button"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Line Wrap Toggle */}
                      <button 
                        type="button"
                        onClick={() => updatePreferences({ lineWrapping: !preferences.lineWrapping })}
                        className="flex justify-between items-center w-full bg-black/40 border border-white/[0.06] p-3.5 px-5 rounded-2xl hover:bg-white/[0.02] transition-colors group text-left"
                      >
                        <div>
                          <span className="text-white font-semibold text-xs block">Line Wrapping</span>
                          <span className="text-[10px] text-graphite-400 mt-0.5 block">Wrap code lines exceeding editor boundaries</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 border font-mono ${
                          preferences.lineWrapping 
                            ? 'bg-[#2db55d]/10 text-[#2db55d] border-[#2db55d]/25 shadow-[0_0_8px_rgba(45,181,93,0.08)]' 
                            : 'bg-black/30 text-graphite-400 border-white/[0.05]'
                        }`}>
                          {preferences.lineWrapping ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </button>

                      {/* Minimap Toggle */}
                      <button 
                        type="button"
                        onClick={() => updatePreferences({ minimap: !preferences.minimap })}
                        className="flex justify-between items-center w-full bg-black/40 border border-white/[0.06] p-3.5 px-5 rounded-2xl hover:bg-white/[0.02] transition-colors group text-left"
                      >
                        <div>
                          <span className="text-white font-semibold text-xs block">Editor Minimap</span>
                          <span className="text-[10px] text-graphite-400 mt-0.5 block">Display high-level code minimap outline</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 border font-mono ${
                          preferences.minimap 
                            ? 'bg-[#2db55d]/10 text-[#2db55d] border-[#2db55d]/25 shadow-[0_0_8px_rgba(45,181,93,0.08)]' 
                            : 'bg-black/30 text-graphite-400 border-white/[0.05]'
                        }`}>
                          {preferences.minimap ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* Unified Footer */}
            <div className="pl-[204px] pr-6 py-4 bg-charcoal-800/60 border-t border-white/[0.04] flex items-center justify-end gap-2.5 flex-shrink-0">
              {activeTab === 'connection' ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTestConnection}
                    disabled={!ip || testState === 'testing'}
                    className="mr-auto px-4 py-2.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 disabled:pointer-events-none border border-white/[0.06] text-graphite-200 text-xs font-semibold font-mono tracking-wide transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    TEST
                  </motion.button>
                  
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full bg-transparent hover:bg-white/[0.04] text-graphite-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={!ip}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-[#32c968] hover:to-[#22b55f] disabled:opacity-30 text-white text-xs font-bold font-mono tracking-wide transition-all border-t border-white/20 shadow-[0_4px_12px_rgba(45,181,93,0.2)]"
                  >
                    SAVE
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-[#32c968] hover:to-[#22b55f] text-white text-xs font-bold font-mono tracking-wide transition-all border-t border-white/20 shadow-[0_4px_12px_rgba(45,181,93,0.2)] text-center cursor-pointer"
                >
                  DONE
                </motion.button>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </>
  );
}
