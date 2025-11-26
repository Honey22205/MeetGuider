import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById, deleteSession } from '../services/storage';
import { Session } from '../types';
import { ArrowLeft, Clock, Trash2, CheckCircle2, List, FileText } from 'lucide-react';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (id) {
      const data = getSessionById(id);
      if (data) {
        setSession(data);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  if (!session) return null;

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSession(session.id);
      navigate('/');
    }
  };

  const parsedSummary = session.summary ? JSON.parse(session.summary) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-secondary hover:text-white transition-colors"
        >
            <ArrowLeft size={20} />
            Back to Dashboard
        </button>
        <button 
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
        >
            <Trash2 size={20} />
        </button>
      </div>

      <div className="bg-surface border border-white/10 rounded-2xl p-8 shadow-xl">
         <div className="mb-6 border-b border-white/10 pb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{session.title}</h1>
            <div className="flex items-center gap-4 text-secondary text-sm">
                <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {new Date(session.createdAt).toLocaleDateString()} • {new Date(session.createdAt).toLocaleTimeString()}
                </span>
                <span className="bg-white/5 px-2 py-0.5 rounded text-xs border border-white/10">
                    {session.source.toUpperCase()} SOURCE
                </span>
            </div>
         </div>

         {parsedSummary && (
             <div className="grid md:grid-cols-2 gap-6 mb-8">
                 <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <List size={20} />
                        Key Points
                    </h3>
                    <ul className="space-y-2">
                        {parsedSummary.keyPoints?.map((point: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                {point}
                            </li>
                        ))}
                    </ul>
                 </div>
                 <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} />
                        Action Items
                    </h3>
                    <ul className="space-y-2">
                        {parsedSummary.actionItems?.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                 </div>
             </div>
         )}

         <div>
             <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                 <FileText size={20} />
                 Full Transcript
             </h3>
             <div className="bg-black/30 rounded-xl p-6 text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm max-h-[500px] overflow-y-auto border border-white/5">
                 {session.transcript}
             </div>
         </div>
      </div>
    </div>
  );
};

export default SessionDetail;
