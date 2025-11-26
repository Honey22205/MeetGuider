export interface Session {
  id: string;
  title: string;
  createdAt: string; // ISO String
  durationSeconds: number;
  transcript: string;
  summary: string | null;
  status: SessionStatus;
  source: 'mic' | 'tab';
}

export type SessionStatus = 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export interface SummaryResult {
  summary: string;
  actionItems: string[];
  keyPoints: string[];
}
