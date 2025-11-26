import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '../types';
import { Clock, FileText, ChevronRight, Mic, Monitor } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionListProps {
  sessions: Session[];
}

const SessionList: React.FC<SessionListProps> = ({ sessions }) => {
  const navigate = useNavigate();

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 text-secondary">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <h3 className="text-xl font-semibold mb-2">No sessions yet</h3>
        <p className="text-sm">Start a new recording to create transcripts and summaries.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => navigate(`/session/${session.id}`)}
          className="bg-surface hover:bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${session.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {session.source === 'mic' ? <Mic size={20} /> : <Monitor size={20} />}
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                  {session.title || 'Untitled Session'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                  </span>
                  <span>•</span>
                  <span>{Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</span>
                </div>
              </div>
            </div>
            <ChevronRight className="text-secondary group-hover:text-white transition-colors" />
          </div>
          
          {session.summary ? (
            <p className="mt-3 text-sm text-secondary line-clamp-2 pl-1">
               {typeof session.summary === 'string' 
                ? JSON.parse(session.summary).summary 
                : (session.summary as any).summary || "No summary available."}
            </p>
          ) : (
             <p className="mt-3 text-sm text-secondary line-clamp-2 pl-1 italic">
               {session.transcript || "No transcript available."}
             </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default SessionList;
