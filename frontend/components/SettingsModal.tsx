"use client";

import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { backendUrl, setBackendUrl } = useStore();
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 select-none">
          {/* Translucent overlay backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-md bg-[#0b0b0e] border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#08080a] border-b border-white/[0.04]">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Server className="w-4 h-4 text-amber-500" />
                <span className="font-sans">Connection Settings</span>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="text-graphite-400 hover:text-white transition-colors duration-150"
              >
                <X className="w-4.5 h-4.5" />
              </motion.button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 font-sans">
              <div className="bg-white/[0.02] border border-white/[0.04] px-5 py-3.5 rounded-2xl text-xs text-graphite-300 leading-relaxed font-mono">
                Configure the target address of your execution VM. Sandphiler dynamically binds your WebSocket streams to this network interface.
              </div>

              {/* Protocol Type Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-graphite-300 font-bold uppercase tracking-wider font-mono px-3.5">
                  Protocol Type
                </label>
                <div className="flex bg-black/40 p-1 border border-white/[0.06] rounded-full w-full justify-between">
                  <button
                    type="button"
                    onClick={() => setProtocol('http://')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-semibold transition-all duration-200 ${
                      protocol === 'http://'
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-md'
                        : 'text-graphite-300 hover:text-white'
                    }`}
                  >
                    HTTP / WS
                  </button>
                  <button
                    type="button"
                    onClick={() => setProtocol('https://')}
                    className={`flex-1 py-2 rounded-full text-xs font-mono font-semibold transition-all duration-200 ${
                      protocol === 'https://'
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-md'
                        : 'text-graphite-300 hover:text-white'
                    }`}
                  >
                    HTTPS / WSS (Secure)
                  </button>
                </div>
              </div>

              {/* IP Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-graphite-300 font-bold uppercase tracking-wider font-mono px-3.5">
                  VM IP Address or Domain
                </label>
                <input 
                  type="text" 
                  value={ip}
                  onChange={(e) => handleIpChange(e.target.value)}
                  placeholder="e.g. 43.204.130.188 or api.yourdomain.com"
                  className="px-5 py-2.5 bg-black/40 border border-white/[0.06] rounded-full text-white text-sm focus:outline-none focus:border-amber-500 font-mono transition-colors duration-200 shadow-inner"
                />
              </div>

              {/* Port Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-graphite-300 font-bold uppercase tracking-wider font-mono px-3.5">
                  Server PORT (Optional)
                </label>
                <input 
                  type="text" 
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="e.g. 5000"
                  className="px-5 py-2.5 bg-black/40 border border-white/[0.06] rounded-full text-white text-sm focus:outline-none focus:border-amber-500 font-mono transition-colors duration-200 shadow-inner"
                />
              </div>

              {/* Connection Test feedback */}
              {testState !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-5 py-3.5 border.5 rounded-2xl text-xs flex gap-2.5 items-start ${
                    testState === 'testing' ? 'bg-white/[0.02] border-white/[0.05] text-graphite-300' :
                    testState === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {testState === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-graphite-400 mt-0.5 flex-shrink-0" />}
                  {testState === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />}
                  {testState === 'failed' && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                  
                  <div className="flex-1 font-mono text-[11px]">
                    <span className="font-bold block text-xs">
                      {testState === 'testing' ? 'Testing network handshake...' :
                       testState === 'success' ? '✓ Server Connection Successful!' :
                       '✗ Connection Failed'}
                    </span>
                    {errorMessage && <span className="block mt-1 text-[10px] opacity-80 leading-normal">{errorMessage}</span>}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-5 py-4 bg-[#08080a] border-t border-white/[0.04]">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTestConnection}
                disabled={!ip || testState === 'testing'}
                className="px-5 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 disabled:pointer-events-none border border-white/[0.06] text-graphite-200 text-xs font-semibold font-mono tracking-wide transition-all shadow-sm"
              >
                TEST SERVER
              </motion.button>
              
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-full bg-transparent hover:bg-white/[0.04] text-graphite-300 hover:text-white text-xs font-semibold transition-colors duration-150"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!ip}
                  className="px-6 py-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-30 text-black text-xs font-bold font-mono tracking-wide transition-all border-t border-white/20 shadow-[0_4px_12px_rgba(217,119,6,0.15)]"
                >
                  SAVE SETTINGS
                </motion.button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
