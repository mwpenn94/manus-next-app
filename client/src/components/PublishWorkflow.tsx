import React, { useState } from 'react';
import { FileText, User, Calendar, Clock, CheckCircle, XCircle, Send, ShieldCheck, Rocket, GitMerge } from 'lucide-react';

// --- TYPES ---
type StageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';
type StageName = 'Draft' | 'Review' | 'Approved' | 'Published';

interface Assignee {
  name: string;
  avatar: string;
}

interface Stage {
  name: StageName;
  status: StageStatus;
  assignees: Assignee[];
  dueDate: string;
  completedAt?: string;
}

interface TimelineEvent {
  stage: StageName;
  timestamp: string;
  action: string;
}

// --- MOCK DATA ---
const initialStages: Stage[] = [
  {
    name: 'Draft',
    status: 'in_progress',
    assignees: [{ name: 'Alex', avatar: 'A' }],
    dueDate: '2026-05-10',
  },
  {
    name: 'Review',
    status: 'pending',
    assignees: [{ name: 'Brenda', avatar: 'B' }, { name: 'Charles', avatar: 'C' }],
    dueDate: '2026-05-15',
  },
  {
    name: 'Approved',
    status: 'pending',
    assignees: [{ name: 'Diana', avatar: 'D' }],
    dueDate: '2026-05-20',
  },
  {
    name: 'Published',
    status: 'pending',
    assignees: [],
    dueDate: '2026-05-25',
  },
];

const initialTimeline: TimelineEvent[] = [
    { stage: 'Draft', action: 'Created', timestamp: '2026-05-01T10:00:00Z' }
];


// --- HELPER COMPONENTS ---

const StatusBadge = ({ status }: { status: StageStatus }) => {
  const statusStyles: Record<StageStatus, { text: string; bg: string; icon: React.ReactNode }> = {
    pending: { text: 'Pending', bg: 'bg-gray-200 text-gray-700', icon: <Clock className="w-3 h-3" /> },
    in_progress: { text: 'In Progress', bg: 'bg-blue-200 text-blue-800', icon: <FileText className="w-3 h-3" /> },
    completed: { text: 'Completed', bg: 'bg-green-200 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { text: 'Rejected', bg: 'bg-red-200 text-red-800', icon: <XCircle className="w-3 h-3" /> },
  };

  const { text, bg, icon } = statusStyles[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${bg}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
};

const ActionButton = ({ stage, onAction }: { stage: Stage, onAction: (stageName: StageName, action: 'submit' | 'approve' | 'reject' | 'publish') => void }) => {
    if (stage.status === 'completed' || stage.status === 'rejected') return null;

    switch(stage.name) {
        case 'Draft':
            return <button onClick={() => onAction('Draft', 'submit')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"><Send className="w-4 h-4" /> Submit for Review</button>
        case 'Review':
            return (
                <div className="flex gap-2">
                    <button onClick={() => onAction('Review', 'approve')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"><CheckCircle className="w-4 h-4" /> Approve</button>
                    <button onClick={() => onAction('Review', 'reject')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"><XCircle className="w-4 h-4" /> Reject</button>
                </div>
            )
        case 'Approved':
            return <button onClick={() => onAction('Approved', 'publish')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"><Rocket className="w-4 h-4" /> Publish</button>
        default:
            return null;
    }
}

// --- MAIN COMPONENT ---
export default function PublishWorkflow() {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(initialTimeline);

  const handleAction = (stageName: StageName, action: 'submit' | 'approve' | 'reject' | 'publish') => {
    const now = new Date().toISOString();
    let newStages = [...stages];
    let newTimeline = [...timeline];

    const currentStageIndex = newStages.findIndex(s => s.name === stageName);

    if (currentStageIndex === -1) return;

    newStages[currentStageIndex].status = 'completed';
    newStages[currentStageIndex].completedAt = now;
    newTimeline.push({ stage: stageName, action: action, timestamp: now });

    if (action === 'approve' || action === 'submit') {
        if (currentStageIndex + 1 < newStages.length) {
            newStages[currentStageIndex + 1].status = 'in_progress';
        }
    } else if (action === 'reject') {
        if (currentStageIndex > 0) {
            newStages[currentStageIndex - 1].status = 'in_progress';
            newStages[currentStageIndex].status = 'rejected';
        }
    } else if (action === 'publish') {
        // Final stage, nothing more to start
    }

    setStages(newStages);
    setTimeline(newTimeline);
  };

  return (
    <div className="bg-gray-50/50 font-sans p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Publishing Workflow</h1>
      <p className="text-gray-600 mb-8">Track the content pipeline from draft to publication.</p>

      <div className="grid grid-cols-4 gap-6 mb-12">
        {stages.map((stage, index) => (
          <div key={stage.name} className={`bg-white border rounded-lg shadow-sm p-5 flex flex-col ${stage.status === 'in_progress' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{index + 1}. {stage.name}</h2>
                <StatusBadge status={stage.status} />
            </div>
            <div className="space-y-3 text-sm text-gray-600 mb-5 flex-grow">
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div className="flex -space-x-2 overflow-hidden">
                        {stage.assignees.map(a => (
                            <div key={a.name} className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600" title={a.name}>{a.avatar}</div>
                        ))}
                        {stage.assignees.length === 0 && <span className="text-gray-500 italic">N/A</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Due by {new Date(stage.dueDate).toLocaleDateString()}</span>
                </div>
                {stage.completedAt && (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed on {new Date(stage.completedAt).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100">
                <ActionButton stage={stage} onAction={handleAction} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><GitMerge className="w-5 h-5 text-gray-500"/> Timeline</h3>
        <div className="border-l-2 border-gray-200 ml-2">
            {timeline.slice().reverse().map((event, index) => (
                <div key={index} className="relative mb-6">
                    <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white border-2 border-gray-200 rounded-full"></div>
                    <div className="ml-8">
                        <p className="font-semibold text-gray-700">{event.stage} - <span className="capitalize font-medium">{event.action}</span></p>
                        <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
