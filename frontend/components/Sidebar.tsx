"use client";

import React from 'react';
import LanguageIcon from './LanguageIcon';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { 
  Code2, 
  Settings2,
  Plus, 
  Minus,
  Sparkles
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { id: 'python', label: 'Python 3', ext: '.py' },
  { id: 'cpp', label: 'C++', ext: '.cpp' },
  { id: 'c', label: 'C language', ext: '.c' },
  { id: 'java', label: 'Java', ext: '.java' },
  { id: 'javascript', label: 'Javascript', ext: '.js' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
  { id: 'go', label: 'Go Language', ext: '.go' },
  { id: 'rust', label: 'Rust', ext: '.rs' },
  { id: 'php', label: 'PHP Script', ext: '.php' },
  { id: 'ruby', label: 'Ruby', ext: '.rb' },
  { id: 'kotlin', label: 'Kotlin', ext: '.kt' },
  { id: 'csharp', label: 'C# (Mono)', ext: '.cs' },
];

export default function Sidebar() {
  const { 
    language, 
    setLanguage, 
    preferences,
    updatePreferences
  } = useStore();

  const handleFontSizeChange = (amount: number) => {
    const nextSize = preferences.fontSize + amount;
    if (nextSize >= 10 && nextSize <= 28) {
      updatePreferences({ fontSize: nextSize });
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-black/20 select-none overflow-hidden font-sans">
      
      {/* 1. Language Runtime Section */}
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 mb-3.5 text-graphite-300 text-[10px] font-bold font-mono tracking-wider uppercase">
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Language Runtimes</span>
        </div>
        
        {/* Scrollable Language list container */}
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto sleek-scrollbar pr-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = language === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`relative flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-mono text-left transition-colors duration-150 ${
                  isActive 
                    ? 'text-white font-semibold' 
                    : 'text-graphite-400 hover:text-graphite-200'
                }`}
              >
                {/* Framer Motion Shared Active Selection Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeLanguageBg"
                    className="absolute inset-0 bg-white/[0.05] border border-white/[0.06] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <span className="relative z-10 flex items-center gap-2.5">
                  <LanguageIcon languageId={lang.id} className="w-4 h-4" />
                  <span>{lang.label}</span>
                </span>
                <span className="relative z-10 text-[10px] opacity-50 font-medium">{lang.ext}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Editor Preferences Settings */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.05] select-none mt-auto">
        <div className="flex items-center gap-1.5 mb-3.5 text-graphite-300 text-[10px] font-bold font-mono tracking-wider uppercase">
          <Settings2 className="w-3.5 h-3.5 text-amber-500" />
          <span>UI Settings</span>
        </div>
        
        <div className="flex flex-col gap-3 text-[11px] font-mono text-graphite-300">
          {/* Font Size controls */}
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] p-2 rounded-full px-3.5">
            <span className="text-graphite-300 font-medium">Font Size</span>
            <div className="flex items-center gap-1 bg-black/40 px-1 rounded-full border border-white/[0.05]">
              <motion.button 
                whileTap={{ scale: 0.85 }}
                onClick={() => handleFontSizeChange(-1)}
                className="p-1 hover:text-white transition-colors duration-150 text-graphite-400"
              >
                <Minus className="w-3 h-3" />
              </motion.button>
              <span className="w-8 text-center font-bold text-white text-[10px] tracking-tight">{preferences.fontSize}px</span>
              <motion.button 
                whileTap={{ scale: 0.85 }}
                onClick={() => handleFontSizeChange(1)}
                className="p-1 hover:text-white transition-colors duration-150 text-graphite-400"
              >
                <Plus className="w-3 h-3" />
              </motion.button>
            </div>
          </div>

          {/* Line Wrap Toggle */}
          <button 
            onClick={() => updatePreferences({ lineWrapping: !preferences.lineWrapping })}
            className="flex justify-between items-center w-full bg-white/[0.02] border border-white/[0.04] p-2 rounded-full px-3.5 hover:bg-white/[0.04] transition-colors duration-150 group"
          >
            <span className="text-graphite-300 font-medium group-hover:text-graphite-200">Line Wrapping</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all duration-200 border ${
              preferences.lineWrapping 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/25 shadow-[0_0_8px_rgba(217,119,6,0.08)]' 
                : 'bg-black/30 text-graphite-400 border-white/[0.05]'
            }`}>
              {preferences.lineWrapping ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Minimap Toggle */}
          <button 
            onClick={() => updatePreferences({ minimap: !preferences.minimap })}
            className="flex justify-between items-center w-full bg-white/[0.02] border border-white/[0.04] p-2 rounded-full px-3.5 hover:bg-white/[0.04] transition-colors duration-150 group"
          >
            <span className="text-graphite-300 font-medium group-hover:text-graphite-200">Editor Minimap</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all duration-200 border ${
              preferences.minimap 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/25 shadow-[0_0_8px_rgba(217,119,6,0.08)]' 
                : 'bg-black/30 text-graphite-400 border-white/[0.05]'
            }`}>
              {preferences.minimap ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

    </aside>
  );
}
