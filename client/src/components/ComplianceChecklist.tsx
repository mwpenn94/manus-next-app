import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, FileDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- DATA TYPES ---
type ComplianceStatus = 'compliant' | 'non-compliant' | 'in-progress' | 'not-applicable';
type Framework = 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001';

interface Requirement {
  id: string;
  name: string;
  description: string;
  status: ComplianceStatus;
  evidenceLink?: string;
  assignee?: string;
  dueDate?: string;
  riskScore: number; // 1-10
}

interface FrameworkData {
  [key: string]: Requirement[];
}

// --- MOCK DATA ---
const mockData: FrameworkData = {
  SOC2: [
    { id: 'SOC2-1', name: 'Access Control', description: 'Logical and physical access controls are in place.', status: 'compliant', assignee: 'Alice', dueDate: '2026-06-15', riskScore: 3, evidenceLink: '#' },
    { id: 'SOC2-2', name: 'Change Management', description: 'Changes to systems are managed and documented.', status: 'in-progress', assignee: 'Bob', dueDate: '2026-07-01', riskScore: 6 },
    { id: 'SOC2-3', name: 'Risk Mitigation', description: 'Risk assessment and mitigation processes are established.', status: 'non-compliant', assignee: 'Charlie', dueDate: '2026-05-30', riskScore: 8 },
    { id: 'SOC2-4', name: 'Security Monitoring', description: 'Systems are monitored for security events.', status: 'compliant', assignee: 'Alice', dueDate: '2026-06-20', riskScore: 4 },
    { id: 'SOC2-5', name: 'Data Encryption', description: 'Data at rest and in transit is encrypted.', status: 'not-applicable', assignee: 'Dana', dueDate: '2026-08-01', riskScore: 5 },
  ],
  GDPR: [
    { id: 'GDPR-1', name: 'Data Protection Officer', description: 'A DPO has been appointed.', status: 'compliant', assignee: 'Eve', dueDate: '2026-05-25', riskScore: 2 },
    { id: 'GDPR-2', name: 'Lawful Basis for Processing', description: 'A lawful basis is identified for each processing activity.', status: 'in-progress', assignee: 'Frank', dueDate: '2026-07-10', riskScore: 7 },
    { id: 'GDPR-3', name: 'Data Subject Rights', description: 'Procedures are in place to handle data subject requests.', status: 'compliant', assignee: 'Grace', dueDate: '2026-06-30', riskScore: 4 },
    { id: 'GDPR-4', name: 'Data Breach Notification', description: 'A process for notifying authorities of data breaches is in place.', status: 'non-compliant', assignee: 'Heidi', dueDate: '2026-06-05', riskScore: 9 },
    { id: 'GDPR-5', name: 'Privacy by Design', description: 'Data protection is integrated into processing activities.', status: 'in-progress', assignee: 'Ivan', dueDate: '2026-08-15', riskScore: 6 },
  ],
  HIPAA: [
    { id: 'HIPAA-1', name: 'Security Rule - Admin Safeguards', description: 'Implement policies and procedures to prevent, detect, contain, and correct security violations.', status: 'compliant', assignee: 'Judy', dueDate: '2026-06-12', riskScore: 3 },
    { id: 'HIPAA-2', name: 'Security Rule - Physical Safeguards', description: 'Implement physical safeguard policies and procedures.', status: 'in-progress', assignee: 'Mallory', dueDate: '2026-07-20', riskScore: 7 },
    { id: 'HIPAA-3', name: 'Privacy Rule - Notice of Privacy', description: 'Provide a notice of privacy practices to individuals.', status: 'compliant', assignee: 'Judy', dueDate: '2026-06-25', riskScore: 4 },
    { id: 'HIPAA-4', name: 'Breach Notification Rule', description: 'Establish procedures for breach notification.', status: 'non-compliant', assignee: 'Trent', dueDate: '2026-06-10', riskScore: 9 },
    { id: 'HIPAA-5', name: 'Security Rule - Technical Safeguards', description: 'Implement technical policies and procedures for electronic information systems.', status: 'in-progress', assignee: 'Walter', dueDate: '2026-09-01', riskScore: 8 },
  ],
  ISO27001: [],
};

const statusConfig: { [key in ComplianceStatus]: { color: string; label: string; className: string } } = {
  compliant: { color: '#22c55e', label: 'Compliant', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'in-progress': { color: '#f59e0b', label: 'In Progress', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'non-compliant': { color: '#ef4444', label: 'Non-Compliant', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'not-applicable': { color: '#a1a1aa', label: 'N/A', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

const frameworks = Object.keys(mockData) as Framework[];

const FrameworkContent: React.FC<{ framework: Framework; data: FrameworkData }> = ({ framework, data }) => {
  const requirements = data[framework];
  const total = requirements.length;
  const compliantCount = requirements.filter(r => r.status === 'compliant').length;
  const progress = total > 0 ? (compliantCount / total) * 100 : 100;
  const totalRisk = requirements.reduce((acc, r) => acc + r.riskScore, 0);
  const avgRisk = total > 0 ? (totalRisk / total).toFixed(1) : '0.0';

  if (total === 0) {
    return <div className="text-center py-16 text-muted-foreground">No requirements match your search in this framework.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-card/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Compliance Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
            <Progress value={progress} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Average Risk Score</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRisk}</div>
            <p className="text-xs text-muted-foreground">out of 10</p>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg">
        <div className="divide-y divide-border">
          <AnimatePresence>
            {requirements.map((req: Requirement, index: number) => (
              <motion.div 
                key={req.id} 
                layout
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="p-4 hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <div className="flex-1 min-w-[250px]">
                    <p className="font-semibold text-foreground">{req.name}</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-prose">{req.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn('border', statusConfig[req.status].className)}>
                          <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: statusConfig[req.status].color }}></span>
                          {statusConfig[req.status].label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent><p>Risk Score: {req.riskScore}</p></TooltipContent>
                    </Tooltip>
                    <div className="text-sm text-muted-foreground w-20">{req.assignee}</div>
                    <div className="text-sm text-muted-foreground w-24">{req.dueDate}</div>
                    {req.evidenceLink && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={req.evidenceLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View Evidence</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default function ComplianceChecklist() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return mockData;
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered: FrameworkData = {};
    for (const framework of frameworks) {
      filtered[framework] = mockData[framework].filter(
        (req: Requirement) =>
          req.name.toLowerCase().includes(lowercasedFilter) ||
          req.description.toLowerCase().includes(lowercasedFilter) ||
          req.id.toLowerCase().includes(lowercasedFilter) ||
          req.assignee?.toLowerCase().includes(lowercasedFilter)
      );
    }
    return filtered;
  }, [searchTerm]);

  const handleExport = useCallback(() => {
    console.log("Exporting report...");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "compliance_report.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [filteredData]);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="w-full max-w-7xl mx-auto bg-background border-border shadow-lg">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Compliance Checklist</CardTitle>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search requirements..." 
                className="pl-9 w-full md:w-[250px] lg:w-[300px] bg-muted/40" 
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="SOC2" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              {frameworks.map((fw: Framework) => (
                <TabsTrigger key={fw} value={fw}>{fw}</TabsTrigger>
              ))}
            </TabsList>
            <AnimatePresence mode="wait">
              {frameworks.map((fw: Framework) => (
                <TabsContent key={fw} value={fw} className="mt-6" forceMount>
                  {/* The `forceMount` and conditional rendering below ensures content is always in the DOM for AnimatePresence to work correctly */}
                  {fw === (frameworks.find(f => f === fw)) && <FrameworkContent framework={fw} data={filteredData} />}
                </TabsContent>
              ))}
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
