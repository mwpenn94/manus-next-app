
import React, { useState, useMemo } from 'react';
import { GitCommit, GitBranch, Clock, User, Plus, Minus, X, ArrowLeft } from 'lucide-react';

// --- MOCK DATA & TYPES ---
type Version = {
  id: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  timestamp: Date;
  branch: string | null;
  additions: number;
  deletions: number;
  content: string;
};

const mockVersions: Version[] = [
  {
    id: 'v12',
    author: { name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    branch: null,
    additions: 5,
    deletions: 2,
    content: "Initial draft of the project proposal.\n- Section 1: Introduction\n- Section 2: Goals\n- Section 3: Timeline"
  },
  {
    id: 'v11',
    author: { name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e290267072' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    branch: 'feat/new-section',
    additions: 25,
    deletions: 3,
    content: "Added a new section on budget and resources.\n- Section 1: Introduction\n- Section 2: Goals\n- Section 3: Timeline\n- Section 4: Budget and Resources"
  },
  {
    id: 'v10',
    author: { name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    branch: null,
    additions: 10,
    deletions: 10,
    content: "Revised the introduction and goals.\n- Section 1: Revised Introduction\n- Section 2: Updated Goals\n- Section 3: Timeline"
  },
  {
    id: 'v9',
    author: { name: 'Charlie', avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026706d' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    branch: null,
    additions: 2,
    deletions: 1,
    content: "Minor typo fixes.\n- Section 1: Revised Introduction\n- Section 2: Updated Goals\n- Section 3: Timeline"
  },
];

// --- HELPER FUNCTIONS ---

const diff = (a: string, b: string): { type: 'added' | 'removed' | 'common'; value: string }[] => {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const aSet = new Set(aLines);
  const bSet = new Set(bLines);

  const result: { type: 'added' | 'removed' | 'common'; value: string }[] = [];

  aLines.forEach(line => {
    if (!bSet.has(line)) {
      result.push({ type: 'removed', value: line });
    }
  });

  bLines.forEach(line => {
    if (!aSet.has(line)) {
      result.push({ type: 'added', value: line });
    } else {
        const commonLine = aLines.find(l => l === line);
        if(commonLine && !result.find(r => r.value === commonLine)){
            result.push({ type: 'common', value: line });
        }
    }
  });

  return result;
};

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// --- COMPARISON COMPONENT ---
const ComparisonView: React.FC<{ baseVersion: Version; compareVersion: Version; onBack: () => void; }> = ({ baseVersion, compareVersion, onBack }) => {
  const diffResult = useMemo(() => diff(baseVersion.content, compareVersion.content), [baseVersion.content, compareVersion.content]);

  const renderContent = (version: Version) => {
    const lines = version.content.split('\n');
    return (
      <pre className="font-mono text-sm bg-gray-800 p-4 rounded-lg overflow-x-auto">
        {lines.map((line, i) => {
          const diffLine = diffResult.find(d => d.value === line);
          let className = 'block';
          if (diffLine) {
            if (diffLine.type === 'added' && version === compareVersion) {
              className += ' bg-green-900/50';
            } else if (diffLine.type === 'removed' && version === baseVersion) {
              className += ' bg-red-900/50';
            }
          }
          return <span key={i} className={className}>{line}</span>;
        })}
      </pre>
    );
  };

  return (
    <div className="bg-gray-900 text-white font-sans w-full max-w-6xl mx-auto p-6 rounded-lg">
      <button onClick={onBack} className="flex items-center mb-4 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to History
      </button>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="border-b border-gray-700 pb-3 mb-3">
            <h3 className="font-bold text-lg">{baseVersion.id} (Base)</h3>
            <p className="text-sm text-gray-400">{timeAgo(baseVersion.timestamp)} by {baseVersion.author.name}</p>
          </div>
          {renderContent(baseVersion)}
        </div>
        <div>
          <div className="border-b border-gray-700 pb-3 mb-3">
            <h3 className="font-bold text-lg">{compareVersion.id} (Comparing)</h3>
            <p className="text-sm text-gray-400">{timeAgo(compareVersion.timestamp)} by {compareVersion.author.name}</p>
          </div>
          {renderContent(compareVersion)}
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function VersionHistory() {
  const [versions] = useState<Version[]>(mockVersions);
  const [comparison, setComparison] = useState<{ base: Version; compare: Version } | null>(null);

  if (comparison) {
    return <ComparisonView baseVersion={comparison.base} compareVersion={comparison.compare} onBack={() => setComparison(null)} />;
  }

  const [selectedForCompare, setSelectedForCompare] = useState<Version | null>(null);

  const handleCompareClick = (version: Version) => {
    if (selectedForCompare) {
      if (selectedForCompare.id !== version.id) {
        // Order them by timestamp
        const [base, compare] = [selectedForCompare, version].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setComparison({ base, compare });
      }
      setSelectedForCompare(null); // Reset selection
    } else {
      setSelectedForCompare(version);
    }
  };

  return (
    <div className="bg-gray-900 text-white font-sans w-full max-w-4xl mx-auto p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Version History</h1>
        {selectedForCompare && (
          <div className="bg-blue-800 text-blue-100 px-4 py-2 rounded-lg text-sm animate-pulse">
            Select another version to compare
          </div>
        )}
      </div>
      <div className="relative border-l-2 border-gray-700 ml-4">
        {versions.map((version, index) => (
          <div key={version.id} className="mb-10 ml-8">
            <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full ring-8 ring-gray-900">
              <GitCommit className="w-4 h-4 text-gray-300" />
            </span>
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <img src={version.author.avatarUrl} alt={version.author.name} className="w-8 h-8 rounded-full mr-3" />
                  <span className="font-semibold text-gray-200">{version.author.name}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Plus className="w-4 h-4 text-green-500 mr-1" />
                    <span>{version.additions}</span>
                  </div>
                  <div className="flex items-center">
                    <Minus className="w-4 h-4 text-red-500 mr-1" />
                    <span>{version.deletions}</span>
                  </div>
                </div>
              </div>
              <time className="flex items-center text-sm font-normal text-gray-500 mb-3">
                <Clock className="w-4 h-4 mr-2" />
                {timeAgo(version.timestamp)}
              </time>
              {version.branch && (
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-300 mb-3">
                  <GitBranch className="w-3 h-3 mr-1.5" />
                  {version.branch}
                </div>
              )}
              <div className="flex items-center justify-end space-x-2 mt-4">
                <button 
                  onClick={() => handleCompareClick(version)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedForCompare?.id === version.id ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  {selectedForCompare?.id === version.id ? 'Selected' : 'Compare'}
                </button>
                <button className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors">Restore</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
