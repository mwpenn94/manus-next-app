import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle, AlertTriangle, CheckCircle, ShieldAlert, Wrench, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type Definitions
type RiskLikelihood = 1 | 2 | 3 | 4 | 5;
type RiskImpact = 1 | 2 | 3 | 4 | 5;
type MitigationStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
type RiskCategory = 'Technical' | 'Project' | 'Business' | 'Security';

interface RiskItem {
  id: string;
  title: string;
  description: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  category: RiskCategory;
  mitigationStatus: MitigationStatus;
  owner: string;
}

// Mock Data
const mockRisks: RiskItem[] = [
  { id: 'R001', title: 'API Rate Limiting Failure', description: 'The primary API gateway may fail under heavy load, leading to service outages.', likelihood: 4, impact: 5, category: 'Technical', mitigationStatus: 'In Progress', owner: 'DevOps Team' },
  { id: 'R002', title: 'Third-Party Data Breach', description: 'A key vendor could experience a data breach, exposing sensitive customer information.', likelihood: 2, impact: 5, category: 'Security', mitigationStatus: 'Completed', owner: 'Security Team' },
  { id: 'R003', title: 'Project Scope Creep', description: 'Uncontrolled changes to the project scope may delay the release schedule.', likelihood: 3, impact: 3, category: 'Project', mitigationStatus: 'In Progress', owner: 'PMO' },
  { id: 'R004', title: 'Market Competitor Launch', description: 'A major competitor is expected to launch a similar product, impacting market share.', likelihood: 4, impact: 4, category: 'Business', mitigationStatus: 'Not Started', owner: 'Marketing' },
  { id: 'R005', title: 'Database Scalability Issues', description: 'The current database architecture may not scale effectively with user growth.', likelihood: 5, impact: 4, category: 'Technical', mitigationStatus: 'In Progress', owner: 'DBA Team' },
  { id: 'R006', title: 'Regulatory Compliance Failure', description: 'Failure to meet new GDPR requirements could result in significant fines.', likelihood: 2, impact: 4, category: 'Business', mitigationStatus: 'Completed', owner: 'Legal' },
  { id: 'R007', title: 'Key Personnel Departure', description: 'The lead architect leaving could jeopardize the project timeline and quality.', likelihood: 3, impact: 4, category: 'Project', mitigationStatus: 'Blocked', owner: 'HR' },
  { id: 'R008', title: 'Authentication Service Outage', description: 'The single sign-on service is a single point of failure.', likelihood: 2, impact: 3, category: 'Security', mitigationStatus: 'Not Started', owner: 'Security Team' },
  { id: 'R009', title: 'Inaccurate Cost Estimation', description: 'Initial project budget may be insufficient due to overlooked expenses.', likelihood: 3, impact: 2, category: 'Project', mitigationStatus: 'In Progress', owner: 'Finance' },
  { id: 'R010', title: 'Frontend Performance Bottlenecks', description: 'The web application is slow to load on older devices.', likelihood: 4, impact: 2, category: 'Technical', mitigationStatus: 'Completed', owner: 'Frontend Team' },
  { id: 'R011', title: 'Supply Chain Disruption', description: 'Critical hardware components are sourced from a single supplier in a volatile region.', likelihood: 1, impact: 5, category: 'Business', mitigationStatus: 'Not Started', owner: 'Operations' },
  { id: 'R012', title: 'Cross-Site Scripting (XSS) Vulnerability', description: 'A potential XSS vulnerability was identified in the user profile module.', likelihood: 3, impact: 5, category: 'Security', mitigationStatus: 'In Progress', owner: 'Security Team' },
];

const likelihoodLabels: { [key in RiskLikelihood]: string } = {
    1: 'Very Low',
    2: 'Low',
    3: 'Medium',
    4: 'High',
    5: 'Very High',
};

const impactLabels: { [key in RiskImpact]: string } = {
    1: 'Very Low',
    2: 'Low',
    3: 'Medium',
    4: 'High',
    5: 'Very High',
};

const riskScoreConfig: { [key: number]: { color: string; label: string } } = {
    1: { color: 'bg-green-900', label: 'Very Low' },
    2: { color: 'bg-green-800', label: 'Very Low' },
    3: { color: 'bg-green-700', label: 'Low' },
    4: { color: 'bg-yellow-800', label: 'Low' },
    5: { color: 'bg-yellow-700', label: 'Medium' },
    6: { color: 'bg-yellow-600', label: 'Medium' },
    8: { color: 'bg-orange-700', label: 'Medium' },
    9: { color: 'bg-orange-600', label: 'High' },
    10: { color: 'bg-red-800', label: 'High' },
    12: { color: 'bg-red-700', label: 'High' },
    15: { color: 'bg-red-600', label: 'Very High' },
    16: { color: 'bg-red-500', label: 'Very High' },
    20: { color: 'bg-purple-700', label: 'Extreme' },
    25: { color: 'bg-purple-800', label: 'Catastrophic' },
};

const getRiskScoreConfig = (score: number): { color: string; label: string } => {
    const thresholds = Object.keys(riskScoreConfig).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
        if (score >= threshold) return riskScoreConfig[threshold];
    }
    return riskScoreConfig[1];
};

const getRiskScoreColor = (score: number): string => {
    return getRiskScoreConfig(score).color;
};

export default function RiskAssessmentMatrix() {
    const [risks, setRisks] = useState<RiskItem[]>(mockRisks);
    const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
    const [filterCategory, setFilterCategory] = useState<RiskCategory | 'all'>('all');

    const filteredRisks = useMemo(() => {
        if (filterCategory === 'all') return risks;
        return risks.filter(risk => risk.category === filterCategory);
    }, [risks, filterCategory]);

    const handleAddRisk = (newRisk: Omit<RiskItem, 'id'>) => {
        const newId = `R${(risks.length + 1).toString().padStart(3, '0')}`;
        setRisks([...risks, { ...newRisk, id: newId }]);
    };

    const exportRiskRegister = () => {
        const headers = ['ID', 'Title', 'Description', 'Category', 'Likelihood', 'Impact', 'Risk Score', 'Mitigation Status', 'Owner'];
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        const csvContent = [
            headers.join(','),
            ...filteredRisks.map(r => 
                [r.id, escapeCsv(r.title), escapeCsv(r.description), r.category, r.likelihood, r.impact, r.likelihood * r.impact, r.mitigationStatus, escapeCsv(r.owner)].join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-s-8,' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'risk_register.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card className="w-full max-w-6xl mx-auto bg-background text-foreground border-border">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Risk Assessment Matrix</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Select value={filterCategory} onValueChange={(value: RiskCategory | 'all') => setFilterCategory(value)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by category..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="Technical">Technical</SelectItem>
                                <SelectItem value="Project">Project</SelectItem>
                                <SelectItem value="Business">Business</SelectItem>
                                <SelectItem value="Security">Security</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={exportRiskRegister}>Export Register</Button>
                        <AddRiskDialog onAddRisk={handleAddRisk} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-6 gap-1">
                    <div className="col-start-2 col-span-5 grid grid-cols-5 text-center text-sm font-bold text-muted-foreground">
                        {Object.values(impactLabels).map(label => <div key={label}>{label}</div>)}
                    </div>
                    <div className="row-start-2 row-span-5 grid grid-rows-5 text-right text-sm font-bold text-muted-foreground">
                        {Object.values(likelihoodLabels).reverse().map(label => <div key={label} className="flex items-center justify-end pr-2">{label}</div>)}
                    </div>
                    <div className="col-start-2 col-span-5 row-start-2 row-span-5 grid grid-cols-5 grid-rows-5 border-t border-l border-border">
                        {Array.from({ length: 5 }).map((_, rowIndex) => (
                            Array.from({ length: 5 }).map((_, colIndex) => {
                                const likelihood = (5 - rowIndex) as RiskLikelihood;
                                const impact = (colIndex + 1) as RiskImpact;
                                const score = likelihood * impact;
                                const cellColor = getRiskScoreColor(score);
                                const cellRisks = filteredRisks.filter(r => r.likelihood === likelihood && r.impact === impact);

                                return (
                                    <div
                                        key={`${likelihood}-${impact}`}
                                        className={cn("relative h-24 border-r border-b border-border", cellColor, "opacity-50")}
                                    >
                                        <div className="absolute top-1 left-1 text-xs text-white/50">{score}</div>
                                        <div className="flex flex-wrap gap-2 p-2 items-center justify-center h-full">
                                            {cellRisks.map((risk, index) => (
                                                <TooltipProvider key={risk.id}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <motion.div
                                                                initial={{ scale: 0, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                transition={{ delay: 0.1 * index, type: "spring", stiffness: 300, damping: 20 }}
                                                                onClick={() => setSelectedRisk(risk)}
                                                                className={cn(
                                                                    "w-5 h-5 rounded-full cursor-pointer border-2",
                                                                    getRiskScoreColor(risk.likelihood * risk.impact),
                                                                    selectedRisk?.id === risk.id ? "border-white" : "border-black/20",
                                                                    "hover:border-white transition-all duration-200 flex items-center justify-center"
                                                                )}
                                                                
                                                            >
                                                                <div className='w-3 h-3 bg-white/70 rounded-full'/>
                                                            </motion.div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{risk.title}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>
                <AnimatePresence>
                    {selectedRisk && <RiskDetailPanel risk={selectedRisk} onClose={() => setSelectedRisk(null)} />}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

const AddRiskDialog: React.FC<{ onAddRisk: (risk: Omit<RiskItem, 'id'>) => void }> = ({ onAddRisk }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<RiskCategory>('Technical');
    const [likelihood, setLikelihood] = useState<RiskLikelihood>(3);
    const [impact, setImpact] = useState<RiskImpact>(3);
    const [owner, setOwner] = useState('');

    const handleSubmit = () => {
        if (!title || !description || !owner) return;
        onAddRisk({
            title,
            description,
            category,
            likelihood,
            impact,
            mitigationStatus: 'Not Started',
            owner,
        });
        setIsOpen(false);
        setTitle('');
        setDescription('');
        setOwner('');
        setCategory('Technical');
        setLikelihood(3);
        setImpact(3);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Add New Risk</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Risk</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Input id="description" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="owner" className="text-right">Owner</Label>
                        <Input id="owner" value={owner} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwner(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select value={category} onValueChange={(value: RiskCategory) => setCategory(value)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Technical">Technical</SelectItem>
                                <SelectItem value="Project">Project</SelectItem>
                                <SelectItem value="Business">Business</SelectItem>
                                <SelectItem value="Security">Security</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Likelihood</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Slider value={[likelihood]} onValueChange={(value: number[]) => setLikelihood(value[0] as RiskLikelihood)} min={1} max={5} step={1} />
                            <span className="font-bold w-4">{likelihood}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Impact</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Slider value={[impact]} onValueChange={(value: number[]) => setImpact(value[0] as RiskImpact)} min={1} max={5} step={1} />
                            <span className="font-bold w-4">{impact}</span>
                        </div>
                    </div>
                    <Button onClick={handleSubmit} className="w-full col-span-4">Add Risk</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const RiskDetailPanel: React.FC<{ risk: RiskItem; onClose: () => void }> = ({ risk, onClose }) => {
    const score = risk.likelihood * risk.impact;
    const scoreConfig = getRiskScoreConfig(score);

    const StatusIcon = {
        'Not Started': <Circle className="w-4 h-4 text-muted-foreground" />,
        'In Progress': <Wrench className="w-4 h-4 text-blue-500" />,
        'Completed': <CheckCircle className="w-4 h-4 text-green-500" />,
        'Blocked': <AlertTriangle className="w-4 h-4 text-red-500" />,
    }[risk.mitigationStatus];

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mt-4 p-4 border-t border-border"
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold flex items-center">
                        <ShieldAlert className="w-5 h-5 mr-2" /> {risk.title} <span className="text-sm text-muted-foreground ml-2">({risk.id})</span>
                    </h3>
                    <p className="text-muted-foreground mt-1">{risk.description}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}><CircleX className="w-5 h-5" /></Button>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <Label className="text-muted-foreground">Risk Score</Label>
                    <div className="flex items-center mt-1">
                        <div className={cn("w-4 h-4 rounded-full mr-2", getRiskScoreColor(score))}></div>
                        <p className="font-bold text-lg">{score}</p>
                        <p className="ml-2">({scoreConfig.label})</p>
                    </div>
                </div>
                <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-semibold mt-1"><Badge variant="secondary">{risk.category}</Badge></p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Owner</Label>
                    <p className="font-semibold mt-1">{risk.owner}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Likelihood</Label>
                    <p className="font-semibold mt-1">{risk.likelihood} - {likelihoodLabels[risk.likelihood]}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Impact</Label>
                    <p className="font-semibold mt-1">{risk.impact} - {impactLabels[risk.impact]}</p>
                </div>
                <div>
                    <Label className="text-muted-foreground">Mitigation Status</Label>
                    <div className="flex items-center mt-1 font-semibold">
                        {StatusIcon}
                        <span className="ml-2">{risk.mitigationStatus}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
