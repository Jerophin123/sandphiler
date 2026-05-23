import { create } from 'zustand';
import { CodeFile, ConnectionStatus, ExecutionState, Snippet } from '../types';

interface Preferences {
  fontSize: number;
  lineWrapping: boolean;
  theme: 'dark' | 'light';
  minimap: boolean;
}

interface AppState {
  // Connection state
  backendUrl: string;
  connectionStatus: ConnectionStatus;
  
  // Code states
  language: string;
  files: CodeFile[];
  activeFileIndex: number;
  
  // Execution states
  activeSessionId: string | null;
  executionState: ExecutionState;
  executionStats: {
    durationMs?: number;
    memoryUsagePlaceholder?: string;
  };
  
  // UI & History states
  snippets: Snippet[];
  preferences: Preferences;
  terminalLogs: string[];
  showTerminal: boolean;
  showSidebarMobile: boolean;

  // Actions
  setBackendUrl: (url: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLanguage: (lang: string) => void;
  setFiles: (files: CodeFile[]) => void;
  updateActiveFileContent: (content: string) => void;
  setActiveSessionId: (id: string | null) => void;
  setExecutionState: (state: ExecutionState) => void;
  setExecutionStats: (stats: { durationMs?: number; memoryUsagePlaceholder?: string }) => void;
  clearTerminalLogs: () => void;
  addTerminalLog: (text: string) => void;
  saveSnippet: (title: string) => void;
  loadSnippet: (id: string) => void;
  deleteSnippet: (id: string) => void;
  updatePreferences: (updates: Partial<Preferences>) => void;
  hydrateStore: () => void;
  setShowTerminal: (show: boolean) => void;
  setShowSidebarMobile: (show: boolean) => void;
}

const DEFAULT_TEMPLATES: Record<string, CodeFile[]> = {
  python: [{
    name: 'main.py',
    content: `import sys

print("=== Interactive Python Test ===")
sys.stdout.flush()

name = input("What is your name? ")
print(f"Hello, {name}!")
`
  }],
  cpp: [{
    name: 'main.cpp',
    content: `#include <iostream>
using namespace std;

int main() {
    cout << "=== Interactive C++ Test ===" << endl;
    cout << "Enter a number: ";
    int x;
    if (cin >> x) {
        cout << "Double of " << x << " is " << (x * 2) << endl;
    }
    return 0;
}
`
  }],
  c: [{
    name: 'main.c',
    content: `#include <stdio.h>

int main() {
    printf("=== C Sandboxed Execution ===\\n");
    printf("Successfully compiled and executing C program.\\n");
    return 0;
}
`
  }],
  java: [{
    name: 'main.java',
    content: `import java.util.Scanner;

public class main {
    public static void main(String[] args) {
        System.out.println("=== Java Sandbox Execution ===");
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your favorite coding language: ");
        String lang = scanner.nextLine();
        System.out.println("Excellent! You entered: " + lang);
    }
}
`
  }],
  javascript: [{
    name: 'main.js',
    content: `console.log("=== Node.js Execution ===");
console.log("Node version:", process.version);
`
  }],
  typescript: [{
    name: 'main.ts',
    content: `const welcome: string = "=== TypeScript Sandbox ===";
console.log(welcome);

interface Programmer {
  name: string;
  role: string;
}

const user: Programmer = { name: "Developer", role: "Coder" };
console.log("Interface typing valid. Hello,", user.name);
`
  }],
  go: [{
    name: 'main.go',
    content: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	fmt.Println("=== Go Language Sandbox ===")
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter some text: ")
	text, _ := reader.ReadString('\\n')
	fmt.Printf("Received: %s", strings.ToUpper(text))
}
`
  }],
  rust: [{
    name: 'main.rs',
    content: `fn main() {
    println!("=== Rust Compilation Cache Test ===");
    println!("Rust compiler compiled executable successfully.");
}
`
  }],
  php: [{
    name: 'main.php',
    content: `<?php
echo "=== PHP Sandbox Execution ===\\n";
echo "PHP Version: " . phpversion() . "\\n";
`
  }],
  ruby: [{
    name: 'main.rb',
    content: `puts "=== Ruby Execution ==="
puts "Executing Ruby version: #{RUBY_VERSION}"
`
  }],
  kotlin: [{
    name: 'main.kt',
    content: `fun main() {
    println("=== Kotlin Sandboxed Execution ===")
    println("Kotlin JVM runtime active.")
}
`
  }],
  csharp: [{
    name: 'Main.cs',
    content: `using System;

class Program {
    static void Main() {
        Console.WriteLine("=== C# Sandboxed Execution ===");
        Console.WriteLine("Running under Mono Runtime CLR.");
    }
}
`
  }],
  dart: [{
    name: 'main.dart',
    content: `import 'dart:io';

void main() {
    print("=== Dart Sandboxed Execution ===");
    stdout.write("Enter your name: ");
    String? name = stdin.readLineSync();
    if (name != null && name.isNotEmpty) {
        print("Hello, $name! Welcome to Dart JIT sandbox.");
    } else {
        print("Hello, anonymous developer!");
    }
}
`
  }],
  bash: [{
    name: 'main.sh',
    content: `#!/bin/bash

echo "=== Bash Sandboxed Execution ==="
echo "Executing under restricted sandbox context."
echo "Current System User: $(whoami)"
echo "Memory Limits Verification:"
ulimit -a | grep -E "max user processes|virtual memory" || true

echo -e "\\nAvailable Files in Session:"
ls -la

echo -e "\\nEnvironment Isolation Check:"
echo "Host PWD Env Variable: $PWD"
`
  }]
};

// Safe localStorage helper
const getStorageItem = (key: string, fallback: string): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) || fallback;
  }
  return fallback;
};

const setStorageItem = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://43.204.130.188:5000';

export const useStore = create<AppState>((set, get) => ({
  backendUrl: DEFAULT_BACKEND_URL,
  connectionStatus: 'disconnected',
  
  language: 'python',
  files: DEFAULT_TEMPLATES.python,
  activeFileIndex: 0,
  
  activeSessionId: null,
  executionState: 'idle',
  executionStats: {},
  
  snippets: [],
  
  preferences: {
    fontSize: 14,
    lineWrapping: false,
    theme: 'dark',
    minimap: false
  },
  
  terminalLogs: [],
  showTerminal: false,
  showSidebarMobile: false,
  
  hydrateStore: () => {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('compiler_backend_url');
      const storedSnippets = localStorage.getItem('compiler_snippets');
      const storedFontSize = localStorage.getItem('compiler_pref_font_size');
      const storedLineWrap = localStorage.getItem('compiler_pref_line_wrap');
      const storedTheme = localStorage.getItem('compiler_pref_theme');
      const storedMinimap = localStorage.getItem('compiler_pref_minimap');

      set({
        backendUrl: storedUrl || DEFAULT_BACKEND_URL,
        snippets: storedSnippets ? JSON.parse(storedSnippets) : [],
        preferences: {
          fontSize: storedFontSize ? parseInt(storedFontSize, 10) : 14,
          lineWrapping: storedLineWrap === 'true',
          theme: (storedTheme || 'dark') as 'dark' | 'light',
          minimap: storedMinimap === 'true'
        }
      });
    }
  },

  setBackendUrl: (url) => {
    setStorageItem('compiler_backend_url', url);
    set({ backendUrl: url });
  },
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setLanguage: (lang) => {
    const templates = DEFAULT_TEMPLATES[lang] || [{ name: 'main.txt', content: '' }];
    set({ language: lang, files: templates, activeFileIndex: 0 });
  },

  setFiles: (files) => set({ files }),
  
  updateActiveFileContent: (content) => {
    const { files, activeFileIndex } = get();
    const updatedFiles = [...files];
    if (updatedFiles[activeFileIndex]) {
      updatedFiles[activeFileIndex] = {
        ...updatedFiles[activeFileIndex],
        content
      };
      set({ files: updatedFiles });
    }
  },
  
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  
  setExecutionState: (state) => set({ executionState: state }),
  
  setExecutionStats: (stats) => set({ executionStats: stats }),
  
  clearTerminalLogs: () => set({ terminalLogs: [] }),
  
  addTerminalLog: (text) => set((state) => ({ terminalLogs: [...state.terminalLogs, text] })),
  
  saveSnippet: (title) => {
    const { files, language, snippets } = get();
    const newSnippet: Snippet = {
      id: crypto.randomUUID(),
      title,
      language,
      files,
      lastModified: Date.now()
    };
    const updated = [newSnippet, ...snippets];
    setStorageItem('compiler_snippets', JSON.stringify(updated));
    set({ snippets: updated });
  },
  
  loadSnippet: (id) => {
    const { snippets } = get();
    const target = snippets.find(s => s.id === id);
    if (target) {
      set({
        language: target.language,
        files: target.files,
        activeFileIndex: 0
      });
    }
  },
  
  deleteSnippet: (id) => {
    const { snippets } = get();
    const filtered = snippets.filter(s => s.id !== id);
    setStorageItem('compiler_snippets', JSON.stringify(filtered));
    set({ snippets: filtered });
  },
  
  updatePreferences: (updates) => {
    const { preferences } = get();
    const next = { ...preferences, ...updates };
    
    // Save to localStorage
    if (updates.fontSize !== undefined) setStorageItem('compiler_pref_font_size', updates.fontSize.toString());
    if (updates.lineWrapping !== undefined) setStorageItem('compiler_pref_line_wrap', updates.lineWrapping.toString());
    if (updates.theme !== undefined) setStorageItem('compiler_pref_theme', updates.theme);
    if (updates.minimap !== undefined) setStorageItem('compiler_pref_minimap', updates.minimap.toString());
    
    set({ preferences: next });
  },

  setShowTerminal: (show) => set({ showTerminal: show }),
  setShowSidebarMobile: (show) => set({ showSidebarMobile: show })
}));
