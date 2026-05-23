"use client";

import React, { useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useStore } from '../../store/useStore';
import LanguageIcon from '../LanguageIcon';
import { Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MonacoEditor() {
  const { files, activeFileIndex, updateActiveFileContent, preferences, language } = useStore();
  const activeFile = files[activeFileIndex] || { content: '' };
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    updateActiveFileContent(value || '');
  };

  // Maps custom language string to Monaco editor languages
  const getMonacoLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      python: 'python',
      cpp: 'cpp',
      c: 'c',
      java: 'java',
      javascript: 'javascript',
      typescript: 'typescript',
      go: 'go',
      rust: 'rust',
      php: 'php',
      ruby: 'ruby',
      kotlin: 'kotlin',
      csharp: 'csharp',
      dart: 'dart',
      bash: 'shell',
      mysql: 'sql',
      r: 'r',
    };
    return map[lang.toLowerCase()] || 'text';
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    // Configure Monaco Theme options to match premium dark theme
    monaco.editor.defineTheme('matte-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '52525b', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ffa116', fontStyle: 'bold' }, // LeetCode Orange keywords
        { token: 'string', foreground: '2db55d' }, // LeetCode Green string highlights
        { token: 'number', foreground: '3b82f6' },
      ],
      colors: {
        'editor.background': '#1e1e1e', // LeetCode dark charcoal background
        'editor.foreground': '#d4d4d8',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#eaeaea',
        'editor.lineHighlightBackground': '#2d2d2d3b', // Subtly highlighted line
        'editor.selectionBackground': '#3f3f4680',
        'editorCursor.foreground': '#2db55d', // LeetCode green cursor
      },
    });
    
    monaco.editor.setTheme('matte-dark');
  };

  const options = {
    fontSize: preferences.fontSize,
    minimap: { enabled: preferences.minimap },
    wordWrap: (preferences.lineWrapping ? 'on' : 'off') as 'on' | 'off',
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontFamily: 'JetBrains Mono, monospace',
    scrollbar: {
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      useShadows: false,
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] overflow-hidden font-sans">
      
      {/* Premium IDE Tab Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/[0.04] text-graphite-300 text-xs select-none gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {/* Active Code file tab indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1e1e1e] border border-white/[0.08] rounded-full text-white font-medium shadow-[0_2px_8px_rgba(0,0,0,0.15)] min-w-0">
            <LanguageIcon languageId={language} className="w-4 h-4 flex-shrink-0" />
            <span className="font-mono text-xs tracking-wide truncate max-w-[120px] sm:max-w-none">{activeFile.name || 'main.java'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Copy Code Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-graphite-300 hover:text-white transition duration-200 text-[10px] font-bold font-mono tracking-wider shadow-sm flex-shrink-0"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-400">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-graphite-400 flex-shrink-0" />
                <span>COPY</span>
              </>
            )}
          </motion.button>

          {/* Selected language pill */}
          <span className="px-2.5 py-1 rounded-full bg-[#2db55d]/10 border border-[#2db55d]/20 uppercase text-[#2db55d] font-mono tracking-widest text-[9px] font-bold shadow-sm flex-shrink-0">
            {language}
          </span>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full relative bg-[#1e1e1e]">
        <Editor
          height="100%"
          theme="matte-dark"
          language={getMonacoLanguage(language)}
          value={activeFile.content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={options}
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] text-graphite-400 font-mono text-xs">
              Loading workspace editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
