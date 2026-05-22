export interface CodeFile {
  name: string;
  content: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export type ExecutionState =
  | 'idle'
  | 'queued'
  | 'preparing'
  | 'compiling'
  | 'running'
  | 'completed'
  | 'timeout'
  | 'killed'
  | 'crashed'
  | 'cleanup';

export interface Snippet {
  id: string;
  language: string;
  title: string;
  files: CodeFile[];
  lastModified: number;
}

export interface ExecutionStats {
  durationMs?: number;
  memoryUsagePlaceholder?: string;
  exitCode?: number | null;
  signal?: string | null;
}
