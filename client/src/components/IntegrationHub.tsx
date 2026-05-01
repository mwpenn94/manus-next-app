import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Briefcase, Database, MessageSquare, Code, CheckCircle, PlusCircle, Clock, Zap, GitBranch, BarChart2, Slack, Github } from 'lucide-react';

type IntegrationStatus = 'Connected' | 'Available' | 'Coming Soon';
type IntegrationCategory = 'Communication' | 'Storage' | 'Analytics' | 'Dev Tools';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: IntegrationStatus;
  category: IntegrationCategory;
}

const allIntegrationsData: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Team communication and collaboration.', icon: Slack, status: 'Connected', category: 'Communication' },
  { id: 'github', name: 'GitHub', description: 'Code hosting and version control.', icon: Github, status: 'Connected', category: 'Dev Tools' },
  { id: 'postgres', name: 'PostgreSQL', description: 'Open-source relational database.', icon: Database, status: 'Available', category: 'Storage' },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Web analytics service.', icon: BarChart2, status: 'Available', category: 'Analytics' },
  { id: 'jira', name: 'Jira', description: 'Project management and issue tracking.', icon: Briefcase, status: 'Available', category: 'Dev Tools' },
  { id: 'aws-s3', name: 'AWS S3', description: 'Scalable object storage in the cloud.', icon: Database, status: 'Coming Soon', category: 'Storage' },
  { id: 'discord', name: 'Discord', description: 'Community and voice chat platform.', icon: MessageSquare, status: 'Available', category: 'Communication' },
  { id: 'vercel', name: 'Vercel', description: 'Platform for frontend developers.', icon: Zap, status: 'Coming Soon', category: 'Dev Tools' },
];

const categories: IntegrationCategory[] = ['Communication', 'Storage', 'Analytics', 'Dev Tools'];

const StatusIndicator: React.FC<{ status: IntegrationStatus }> = ({ status }) => {
  const statusConfig = {
    Connected: { icon: CheckCircle, color: 'text-green-500', label: 'Connected' },
    Available: { icon: PlusCircle, color: 'text-blue-500', label: 'Available' },
    'Coming Soon': { icon: Clock, color: 'text-gray-400', label: 'Coming Soon' },
  };
  const { icon: Icon, color, label } = statusConfig[status];
  return (
    <div className={`flex items-center text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3 mr-1.5" />
      {label}
    </div>
  );
};

export default function IntegrationHub() {
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'All'>('All');
  const [integrations, setIntegrations] = useState<Integration[]>(allIntegrationsData);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [wizardStep, setWizardStep] = useState(0);

  const connectedCount = useMemo(() => integrations.filter(int => int.status === 'Connected').length, [integrations]);

  const filteredIntegrations = useMemo(() => {
    if (activeCategory === 'All') return integrations;
    return integrations.filter(int => int.category === activeCategory);
  }, [activeCategory, integrations]);

  const handleConnectClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setWizardStep(1);
  };

  const handleWizardClose = () => {
    setSelectedIntegration(null);
    setWizardStep(0);
  };

  const handleFinishSetup = () => {
    if (!selectedIntegration) return;
    setIntegrations(prev =>
      prev.map(int => (int.id === selectedIntegration.id ? { ...int, status: 'Connected' } : int))
    );
    handleWizardClose();
  };

  const renderWizardContent = () => {
    if (!selectedIntegration) return null;
    switch (wizardStep) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Connect to {selectedIntegration.name}</DialogTitle>
              <DialogDescription>Follow the steps to authenticate and configure the integration.</DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">Step 1: Authenticate with {selectedIntegration.name}</div>
            <DialogFooter>
              <Button variant="outline" onClick={handleWizardClose}>Cancel</Button>
              <Button onClick={() => setWizardStep(2)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </DialogFooter>
          </>
        );
      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Configure {selectedIntegration.name}</DialogTitle>
              <DialogDescription>Set your preferences for the integration.</DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">Step 2: Configuration options would be here.</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
              <Button onClick={handleFinishSetup}>Finish Setup</Button>
            </DialogFooter>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-8 font-sans min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integration Hub</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your connections and explore new integrations.</p>
        </header>

        <Card className="mb-8 bg-white/80 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex -space-x-2 overflow-hidden mr-4">
                {integrations.filter(i => i.status === 'Connected').slice(0, 5).map(int => (
                  <int.icon key={int.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 p-1.5 text-gray-600 dark:text-gray-300" />
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{connectedCount} Connected Integrations</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">All your tools, working in harmony.</p>
              </div>
            </div>
            <Button variant="ghost">Manage Connections <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <div className="flex items-center space-x-2 mb-6">
          <Button variant={activeCategory === 'All' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveCategory('All')}>All</Button>
          {categories.map(cat => (
            <Button key={cat} variant={activeCategory === cat ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveCategory(cat)}>{cat}</Button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredIntegrations.map(integration => (
            <motion.div layout key={integration.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
              <Card className="h-full flex flex-col bg-white/60 dark:bg-black/40 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300 border-gray-200 dark:border-gray-800">
                <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <integration.icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <StatusIndicator status={integration.status} />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{integration.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex-grow">{integration.description}</p>
                  <div className="mt-6">
                    {integration.status === 'Available' && (
                      <Button className="w-full" onClick={() => handleConnectClick(integration)}>Connect</Button>
                    )}
                    {integration.status === 'Connected' && (
                      <Button variant="outline" className="w-full cursor-default">Connected</Button>
                    )}
                    {integration.status === 'Coming Soon' && (
                      <Button variant="outline" className="w-full" disabled>Coming Soon</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Dialog open={wizardStep > 0} onOpenChange={handleWizardClose}>
        <DialogContent className="sm:max-w-[425px]">
          {renderWizardContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
