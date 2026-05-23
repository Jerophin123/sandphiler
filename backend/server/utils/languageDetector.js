const path = require('path');

const EXTENSION_MAP = {
  '.py': 'python',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.java': 'java',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.rb': 'ruby',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.cs': 'csharp',
  '.dart': 'dart',
  '.sh': 'bash',
  '.bash': 'bash',
  '.sql': 'mysql',
  '.r': 'r',
  '.R': 'r'
};

const CODE_PATTERNS = [
  { language: 'python', regex: /(def\s+[a-zA-Z_]\w*\(|import\s+sys|print\s*\()/i },
  { language: 'cpp', regex: /(#include\s*<iostream>|std::cout|using\s+namespace\s+std;)/i },
  { language: 'c', regex: /(#include\s*<stdio\.h>|int\s+main\s*\(|printf\s*\()/i },
  { language: 'java', regex: /(public\s+class\s+\w+|public\s+static\s+void\s+main|System\.out\.println)/i },
  { language: 'javascript', regex: /(console\.log\s*\(|const\s+\w+\s*=\s*require\(|import\s+.*\s+from\s+)/i },
  { language: 'typescript', regex: /(let\s+\w+\s*:\s*\w+|interface\s+\w+\s*\{|type\s+\w+\s*=)/i },
  { language: 'go', regex: /(package\s+main|import\s+\(\s*"fmt"|func\s+main\s*\()/i },
  { language: 'rust', regex: /(fn\s+main\s*\(\)|println!\(|use\s+std::)/i },
  { language: 'php', regex: /(<\?php|echo\s+['"].*['"]\s*;)/i },
  { language: 'ruby', regex: /(def\s+[a-zA-Z_]\w*\n|puts\s+['"].*['"]|require\s+['"])/i },
  { language: 'kotlin', regex: /(fun\s+main\s*\(|println\s*\()/i },
  { language: 'csharp', regex: /(using\s+System;|namespace\s+\w+|static\s+void\s+Main|Console\.WriteLine)/i },
  { language: 'dart', regex: /(void\s+main\(\)\s*\{|import\s+['"]dart:|print\s*\()/i },
  { language: 'bash', regex: /(#!(\/usr)?\/bin\/(env\s+)?(bash|sh)|echo\s+['"].*['"])/i },
  { language: 'mysql', regex: /(select\s+.*\s+from|create\s+table|insert\s+into|delete\s+from|update\s+.*\s+set)/i },
  { language: 'r', regex: /(library\s*\(|plot\s*\(|print\s*\(|<-\s*\w+)/i }
];

/**
 * Infers language from filename or code snippet content analysis
 */
function detectLanguage(filename, code) {
  // 1. Try file extension mapping
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext];
    }
  }

  // 2. Scan code contents for patterns
  if (code) {
    for (const pattern of CODE_PATTERNS) {
      if (pattern.regex.test(code)) {
        return pattern.language;
      }
    }
  }

  // Fallback default
  return null;
}

module.exports = {
  detectLanguage,
  EXTENSION_MAP
};
