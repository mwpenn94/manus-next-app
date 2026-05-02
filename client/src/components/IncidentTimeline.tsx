
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Shield, Zap, Clock, ChevronDown, ChevronRight } from 'lucide-react';

type IncidentPhase = 'Detection' | 'Response' | 'Mitigation' | 'Resolution';

interface IncidentEvent {
  id: number;
  timestamp: string;
  phase: IncidentPhase;
  title: string;
  description: string;
  details?: string[];
}

const mockIncidentEvents: IncidentEvent[] = [
  {
    id: 1,
    timestamp: '2026-05-01T10:00:00Z',
    phase: 'Detection',
    title: 'Initial alert triggered',
    description: 'Automated monitoring system detected an anomaly in API response times.',
    details: ['High latency detected on `api-gateway-prod`', 'Error rate spiked to 5% on `auth-service`'],
  },
  {
    id: 2,
    timestamp: '2026-05-01T10:05:00Z',
    phase: 'Response',
    title: 'On-call engineer paged',
    description: 'PagerDuty alert sent to the SRE team. John Doe acknowledged the alert.',
  },
  {
    id: 3,
    timestamp: '2026-05-01T10:15:00Z',
    phase: 'Response',
    title: 'Incident channel created',
    description: 'Slack channel #incident-2026-05-01-api-latency created for coordination.',
    details: ['Key responders invited: Jane Smith (Infra), Bob Johnson (DBA)'],
  },
  {
    id: 4,
    timestamp: '2026-05-01T10:30:00Z',
    phase: 'Mitigation',
    title: 'Canary deployment rolled back',
    description: 'The latest deployment (v1.2.3) to `auth-service` was identified as a potential cause and rolled back.',
  },
  {
    id: 5,
    timestamp: '2026-05-01T10:45:00Z',
    phase: 'Mitigation',
    title: 'System stability confirmed',
    description: 'API response times and error rates returned to normal levels post-rollback.',
  },
  {
    id: 6,
    timestamp: '2026-05-01T11:00:00Z',
    phase: 'Resolution',
    title: 'Incident resolved',
    description: 'The incident is declared resolved. Monitoring continues.',
  },
  {
    id: 7,
    timestamp: '2026-05-01T11:30:00Z',
    phase: 'Resolution',
    title: 'Post-mortem scheduled',
    description: 'A post-mortem meeting has been scheduled for 2026-05-02 to analyze the root cause.',
    details: ['Root cause analysis points to a faulty database query in the new deployment.'],
  },
];

const phaseConfig: { [key in IncidentPhase]: { icon: React.ElementType; color: string } } = {
  Detection: { icon: Zap, color: 'text-yellow-400' },
  Response: { icon: AlertCircle, color: 'text-orange-400' },
  Mitigation: { icon: Shield, color: 'text-blue-400' },
  Resolution: { icon: CheckCircle, color: 'text-green-400' },
};

const TimelineEvent: React.FC<{ event: IncidentEvent; isLast: boolean; onToggle: () => void; isExpanded: boolean }> = ({ event, isLast, onToggle, isExpanded }) => {
  const PhaseIcon = phaseConfig[event.phase].icon;
  const phaseColor = phaseConfig[event.phase].color;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="flex">
      <div className="flex flex-col items-center mr-4">
        <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${phaseColor}`}>
          <PhaseIcon className="w-5 h-5" />
        </div>
        {!isLast && <div className="w-px flex-grow bg-white/10" />} 
      </div>
      <div className="flex-1 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${phaseColor}`}>{event.phase}</span>
            <span className="text-sm text-white/60">{formatTime(event.timestamp)}</span>
          </div>
          {event.details && (
            <button onClick={onToggle} className="text-white/60 hover:text-white transition-colors">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
        <h3 className="font-medium text-white mt-1">{event.title}</h3>
        <p className="text-sm text-white/60 mt-1">{event.description}</p>
        {isExpanded && event.details && (
          <div className="mt-3 bg-white/5 p-3 rounded-md border border-white/10 text-sm">
            <ul className="space-y-2">
              {event.details.map((detail, index) => (
                <li key={index} className="text-white/80">{detail}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default function IncidentTimeline() {
  const [events] = useState<IncidentEvent[]>(mockIncidentEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Set<IncidentPhase>>(new Set<IncidentPhase>(Object.keys(phaseConfig) as IncidentPhase[]));

  const toggleEventExpansion = (id: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set<number>(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleFilter = (phase: IncidentPhase) => {
    setActiveFilters(prev => {
      const newSet = new Set<IncidentPhase>(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet.size === 0 ? new Set<IncidentPhase>(Object.keys(phaseConfig) as IncidentPhase[]) : newSet;
    });
  };

  const filteredEvents = events.filter(event => activeFilters.has(event.phase));

  return (
    <div className="bg-[#0a0a0a] text-white p-4 md:p-6 rounded-lg border border-white/10 w-full max-w-3xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Incident Timeline</h2>
        <p className="text-sm text-white/60 flex items-center mt-2 sm:mt-0"><Clock size={14} className="mr-2" /> All times in UTC</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.keys(phaseConfig).map(phase => (
          <button 
            key={phase}
            onClick={() => toggleFilter(phase as IncidentPhase)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${activeFilters.has(phase as IncidentPhase) ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
            {phase}
          </button>
        ))}
      </div>

      <div>
        {filteredEvents.map((event, index) => (
          <TimelineEvent 
            key={event.id} 
            event={event} 
            isLast={index === filteredEvents.length - 1}
            onToggle={() => toggleEventExpansion(event.id)}
            isExpanded={expandedEvents.has(event.id)}
          />
        ))}
      </div>
    </div>
  );
}
