
import React, { useState, useMemo } from 'react';
import type { FC, SVGProps } from 'react';

// --- TYPE DEFINITIONS ---
type ErrorStatus = 'new' | 'seen' | 'resolved';

type ErrorInstance = {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  stackTrace: string;
};

type ErrorData = {
  id: string;
  type: string;
  message: string;
  status: ErrorStatus;
  firstSeen: string;
  lastSeen: string;
  count: number;
  instances: ErrorInstance[];
};

// --- MOCK DATA GENERATION ---
const generateMockErrors = (): ErrorData[] => {
  const errorTypes = ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError'];
  const messages = [
    'Cannot read properties of undefined',
    'is not defined',
    'Unexpected token',
    'Invalid array length',
    'URI malformed',
  ];
  const users = [
    { id: 'user-1', name: 'Alex Johnson', email: 'alex@example.com' },
    { id: 'user-2', name: 'Maria Garcia', email: 'maria@example.com' },
    { id: 'user-3', name: 'Chen Wei', email: 'chen@example.com' },
  ];

  return Array.from({ length: 15 }, (_, i) => {
    const typeIndex = Math.floor(Math.random() * errorTypes.length);
    const statusOptions: ErrorStatus[] = ['new', 'seen', 'resolved'];
    const count = Math.floor(Math.random() * 500) + 1;
    const lastSeen = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7);
    const firstSeen = new Date(lastSeen.getTime() - Math.random() * 1000 * 60 * 60 * 24 * 30);

    return {
      id: `err-${i + 1}`,
      type: errorTypes[typeIndex],
      message: messages[typeIndex] + ` (reading 'length')`,
      status: statusOptions[Math.floor(Math.random() * 3)],
      firstSeen: firstSeen.toISOString(),
      lastSeen: lastSeen.toISOString(),
      count,
      instances: Array.from({ length: Math.min(count, 20) }, () => ({
        id: `inst-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(lastSeen.getTime() - Math.random() * 1000 * 60 * 60 * 24).toISOString(),
        user: users[Math.floor(Math.random() * users.length)],
        stackTrace: `TypeError: Cannot read properties of undefined (reading 'length')\n    at https://app.manus.ai/static/js/main.chunk.js:2:12345\n    at Object.next (https://app.manus.ai/static/js/main.chunk.js:2:54321)`,
      })),
    };
  });
};

// --- SVG ICONS (from lucide-react) ---
const AlertCircle: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

const CheckCircle2: FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

const Eye: FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const Search: FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

// --- SPARKLINE CHART ---
const Sparkline: FC<{ data: number[]; className?: string }> = ({ data, className }) => {
    const width = 100;
    const height = 20;
    const max = Math.max(...data);
    const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / max) * height}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
    );
};

// --- MAIN COMPONENT ---
export default function ErrorBoundaryMonitor() {
  const [errors] = useState<ErrorData[]>(() => generateMockErrors().sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()));
  const [filter, setFilter] = useState<ErrorStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorData | null>(errors[0] || null);

  const filteredErrors = useMemo(() => {
    return errors
      .filter(e => filter === 'all' || e.status === filter)
      .filter(e => e.type.toLowerCase().includes(searchTerm.toLowerCase()) || e.message.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [errors, filter, searchTerm]);

  const statusConfig: Record<ErrorStatus, { icon: FC<SVGProps<SVGSVGElement>>; color: string; label: string }> = {
    new: { icon: AlertCircle, color: 'text-red-400', label: 'New' },
    seen: { icon: Eye, color: 'text-blue-400', label: 'Seen' },
    resolved: { icon: CheckCircle2, color: 'text-green-400', label: 'Resolved' },
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] text-white/90 flex flex-col md:flex-row font-sans text-sm p-4 gap-4">
      <div className="flex flex-col w-full md:w-1/3 lg:w-1/4 border border-white/10 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" placeholder="Search errors..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex items-center justify-between text-xs mt-3">
            {(['all', 'new', 'seen', 'resolved'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-md transition-colors ${filter === f ? 'bg-white/10' : 'hover:bg-white/5 text-white/60'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredErrors.map(error => (
            <div key={error.id} onClick={() => setSelectedError(error)} className={`p-3 border-b border-white/10 cursor-pointer ${selectedError?.id === error.id ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}>
              <div className="flex justify-between items-start">
                <p className="font-medium text-white/90 truncate pr-2">{error.type}: {error.message}</p>
                <span className="text-xs text-white/40 whitespace-nowrap">{timeAgo(error.lastSeen)}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                  {React.createElement(statusConfig[error.status].icon, { className: `w-3.5 h-3.5 ${statusConfig[error.status].color}` })}
                  <span className="text-xs text-white/60">{error.count.toLocaleString()} events</span>
                </div>
                <Sparkline data={Array.from({length: 20}, () => Math.random() * error.count)} className="w-16 h-4 text-white/30" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-white/10 rounded-lg overflow-hidden">
        {selectedError ? (
          <>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white truncate">{selectedError.type}: {selectedError.message}</h2>
              <div className="flex items-center gap-6 text-white/60 mt-2 text-xs">
                <div className="flex items-center gap-2">
                  {React.createElement(statusConfig[selectedError.status].icon, { className: `w-4 h-4 ${statusConfig[selectedError.status].color}` })}
                  <span>{statusConfig[selectedError.status].label}</span>
                </div>
                <span><strong className="text-white/80">{selectedError.count.toLocaleString()}</strong> events</span>
                <span>Last seen: <strong className="text-white/80">{timeAgo(selectedError.lastSeen)}</strong></span>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-black/20">
              <h3 className="font-semibold text-white/80 mb-2">Stack Trace</h3>
              <pre className="text-xs text-white/60 bg-[#0a0a0a] p-3 rounded-md border border-white/10 overflow-x-auto whitespace-pre-wrap break-words">{selectedError.instances[0]?.stackTrace || 'No stack trace available.'}</pre>
              <h3 className="font-semibold text-white/80 mt-4 mb-2">Affected User</h3>
              <div className="text-xs text-white/60 bg-[#0a0a0a] p-3 rounded-md border border-white/10">
                <p><strong>ID:</strong> {selectedError.instances[0]?.user.id}</p>
                <p><strong>Name:</strong> {selectedError.instances[0]?.user.name}</p>
                <p><strong>Email:</strong> {selectedError.instances[0]?.user.email}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40">Select an error to view details</div>
        )}
      </div>
    </div>
  );
}
