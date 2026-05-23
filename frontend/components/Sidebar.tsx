"use client";

import React from 'react';
import LanguageIcon from './LanguageIcon';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { id: 'bash', label: 'Bash Shell', ext: '.sh' },
  { id: 'c', label: 'C Language', ext: '.c' },
  { id: 'csharp', label: 'C# (Mono)', ext: '.cs' },
  { id: 'cpp', label: 'C++', ext: '.cpp' },
  { id: 'dart', label: 'Dart', ext: '.dart' },
  { id: 'go', label: 'Go Language', ext: '.go' },
  { id: 'java', label: 'Java', ext: '.java' },
  { id: 'javascript', label: 'Javascript', ext: '.js' },
  { id: 'kotlin', label: 'Kotlin', ext: '.kt' },
  { id: 'mysql', label: 'MySQL', ext: '.sql' },
  { id: 'php', label: 'PHP Script', ext: '.php' },
  { id: 'python', label: 'Python 3', ext: '.py' },
  { id: 'r', label: 'R Language', ext: '.R' },
  { id: 'ruby', label: 'Ruby', ext: '.rb' },
  { id: 'rust', label: 'Rust', ext: '.rs' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
];

export default function Sidebar() {
  const { 
    language, 
    setLanguage, 
  } = useStore();

  return (
    <aside className="w-full h-full flex flex-col bg-black/20 select-none overflow-hidden font-sans">
      
      {/* 1. Language Runtime Section */}
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 mb-3.5 text-graphite-300 text-[10px] font-bold font-mono tracking-wider uppercase">
          <Code2 className="w-3.5 h-3.5 text-emerald-500" />
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
                    ? 'text-[#2db55d] font-bold' 
                    : 'text-graphite-400 hover:text-white'
                }`}
              >
                {/* Framer Motion Shared Active Selection Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeLanguageBg"
                    className="absolute inset-0 bg-[#2db55d]/10 border border-[#2db55d]/20 rounded-full shadow-[inset_0_1px_1px_rgba(45,181,93,0.05)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <span className="relative z-10 flex items-center gap-2.5">
                  <LanguageIcon languageId={lang.id} className="w-4 h-4" />
                  <span>{lang.label}</span>
                </span>
                <span className={`relative z-10 text-[10px] font-medium transition-colors ${isActive ? 'text-[#2db55d]/60 font-bold' : 'opacity-50'}`}>{lang.ext}</span>
              </button>
            );
          })}
        </div>
      </div>

    </aside>
  );
}
