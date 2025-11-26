import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { getSessions } from './services/storage';
import { Session } from './types';
import SessionList from './components/SessionList';
import ActiveSession from './components/ActiveSession';
import SessionDetail from './components/SessionDetail';
import { Mic2, LayoutDashboard, Settings } from 'lucide-react';

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
};

const Dashboard: React.FC = () => {
    const [sessions, setSessions] = useState<Session[]>([]);

    useEffect(() => {
        setSessions(getSessions());
    }, []);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-secondary mt-1">Manage your meeting recordings and transcripts.</p>
                </div>
            </div>
            
            <SessionList sessions={sessions} />
        </div>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-background text-white flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 bg-surface fixed h-full hidden md:flex flex-col p-6">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center">
                        <Mic2 size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">ScribeAI</span>
                </div>
                
                <nav className="space-y-2 flex-1">
                    <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavLink to="/record" icon={<Mic2 size={20} />} label="New Session" />
                </nav>

                <div className="pt-6 border-t border-white/10">
                    <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/5">
                        <p className="text-xs text-secondary mb-2">AI Status</p>
                        <div className="flex items-center gap-2 text-sm text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            Gemini 2.5 Active
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 md:p-10 overflow-auto">
                {children}
            </main>
        </div>
    );
}

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/record" element={<ActiveSession />} />
          <Route path="/session/:id" element={<SessionDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
