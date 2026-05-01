import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, History, ChevronDown, ExternalLink } from 'lucide-react';

// --- TYPES ---
type ConsentSubOption = {
  id: string;
  label: string;
  description: string;
};

type ConsentCategory = {
  id: 'essential' | 'analytics' | 'marketing' | 'personalization';
  title: string;
  description: string;
  subOptions: ConsentSubOption[];
  isMandatory?: boolean;
};

type ConsentState = {
  [key in ConsentCategory['id']]?: {
    enabled: boolean;
    subOptions: { [key: string]: boolean };
  };
};

type ConsentLogEntry = {
  id: number;
  timestamp: Date;
  action: string;
  details: string;
};

// --- MOCK DATA ---
const consentCategories: ConsentCategory[] = [
  {
    id: 'essential',
    title: 'Essential Cookies',
    description: 'These items are required to enable basic website functionality.',
    isMandatory: true,
    subOptions: [
      { id: 'session', label: 'Session Management', description: 'Maintains your session across pages.' },
      { id: 'security', label: 'Security', description: 'Protects against cross-site request forgery.' },
      { id: 'preferences', label: 'Basic Preferences', description: 'Remembers your essential settings.' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'These items help the website operator understand how its website performs.',
    subOptions: [
      { id: 'performance', label: 'Performance Monitoring', description: 'Collects data on page load times and server health.' },
      { id: 'usage', label: 'Usage Tracking', description: 'Tracks user interaction with features to improve them.' },
      { id: 'demographics', label: 'Audience Demographics', description: 'Anonymously groups users by demographics.' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'These items are used to deliver advertising that is more relevant to you.',
    subOptions: [
      { id: 'retargeting', label: 'Ad Retargeting', description: 'Shows you ads on other sites based on your visit.' },
      { id: 'third_party', label: 'Third-Party Ads', description: 'Allows ad networks to track your browsing habits.' },
      { id: 'profiling', label: 'Ad Profiling', description: 'Builds a profile of your interests for targeted ads.' },
    ],
  },
  {
    id: 'personalization',
    title: 'Personalization',
    description: 'These items enable the website to remember choices you make to give you better functionality.',
    subOptions: [
      { id: 'recommendations', label: 'Content Recommendations', description: 'Suggests articles or products based on your activity.' },
      { id: 'localization', label: 'Localization', description: 'Remembers your region and language preferences.' },
      { id: 'ui_customization', label: 'UI Customization', description: 'Allows you to customize the interface layout.' },
    ],
  },
];

const initialConsentLog: ConsentLogEntry[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    action: 'Initial Consent', 
    details: 'Essential, Analytics enabled.',
  },
];

// --- HELPER FUNCTIONS & COMPONENTS ---
const CategoryItem: React.FC<{ 
    category: ConsentCategory;
    consent: ConsentState;
    onToggleCategory: (id: ConsentCategory['id'], enabled: boolean) => void;
    onToggleSubOption: (catId: ConsentCategory['id'], subId: string, enabled: boolean) => void;
}> = ({ category, consent, onToggleCategory, onToggleSubOption }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isEnabled = consent[category.id]?.enabled ?? false;

    return (
        <motion.div layout className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                    <h4 className="font-semibold text-foreground">{category.title}</h4>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Switch
                        id={`switch-${category.id}`}
                        checked={isEnabled}
                        onCheckedChange={(checked: boolean) => onToggleCategory(category.id, checked)}
                        disabled={category.isMandatory}
                        aria-label={`Toggle ${category.title}`}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={category.isMandatory}>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown className="h-4 w-4" /></motion.div>
                    </Button>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && !category.isMandatory && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <Separator className="mb-4" />
                        <div className="space-y-3 pl-2">
                            {category.subOptions.map((subOption) => (
                                <div key={subOption.id} className="flex items-start gap-3">
                                    <Checkbox
                                        id={`${category.id}-${subOption.id}`}
                                        checked={isEnabled && (consent[category.id]?.subOptions[subOption.id] ?? false)}
                                        onCheckedChange={(checked: boolean) => onToggleSubOption(category.id, subOption.id, checked)}
                                        disabled={!isEnabled}
                                        aria-label={subOption.label}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label htmlFor={`${category.id}-${subOption.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {subOption.label}
                                        </label>
                                        <p className="text-sm text-muted-foreground">{subOption.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---
export default function ConsentManager() {
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [consentLog, setConsentLog] = useState<ConsentLogEntry[]>(initialConsentLog);
    const [activeTab, setActiveTab] = useState<'preferences' | 'history'>('preferences');

    const initialConsentState = useMemo(() => {
        const state: ConsentState = {};
        consentCategories.forEach(cat => {
            const enabled = cat.isMandatory || false;
            state[cat.id] = {
                enabled,
                subOptions: cat.subOptions.reduce((acc, sub) => {
                    acc[sub.id] = enabled;
                    return acc;
                }, {} as { [key: string]: boolean })
            };
        });
        return state;
    }, []);

    const [consents, setConsents] = useState<ConsentState>(initialConsentState);

    const handleToggleCategory = useCallback((id: ConsentCategory['id'], enabled: boolean) => {
        setConsents(prev => {
            const newConsents = { ...prev };
            const categoryConsents = newConsents[id];
            if (categoryConsents) {
                categoryConsents.enabled = enabled;
                Object.keys(categoryConsents.subOptions).forEach(subId => {
                    categoryConsents.subOptions[subId] = enabled;
                });
            }
            return newConsents;
        });
    }, []);

    const handleToggleSubOption = useCallback((catId: ConsentCategory['id'], subId: string, enabled: boolean) => {
        setConsents(prev => {
            const newConsents = { ...prev };
            const categoryConsents = newConsents[catId];
            if (categoryConsents) {
                categoryConsents.subOptions[subId] = enabled;
                // If all sub-options are disabled, disable the main category toggle
                if (Object.values(categoryConsents.subOptions).every(val => !val)) {
                    categoryConsents.enabled = false;
                }
                // If at least one is enabled, ensure the main category is enabled
                if (enabled) {
                    categoryConsents.enabled = true;
                }
            }
            return newConsents;
        });
    }, []);

    const handleSave = useCallback(() => {
        const now = new Date();
        const changes: string[] = [];
        Object.entries(consents).forEach(([key, value]) => {
            if (value.enabled) {
                changes.push(consentCategories.find(c => c.id === key)?.title || key);
            }
        });
        const details = changes.length > 0 ? `Enabled: ${changes.join(', ')}.` : 'All optional categories disabled.';
        
        const newLogEntry: ConsentLogEntry = {
            id: consentLog.length + 1,
            timestamp: now,
            action: 'Preferences Updated',
            details: details,
        };
        setConsentLog(prev => [newLogEntry, ...prev]);
        setLastUpdated(now);
        setActiveTab('preferences'); // Or show a success message
    }, [consents, consentLog.length]);

    const handleWithdraw = useCallback(() => {
        setConsents(initialConsentState);
        const now = new Date();
        const newLogEntry: ConsentLogEntry = {
            id: consentLog.length + 1,
            timestamp: now,
            action: 'Consent Withdrawn',
            details: 'All optional consents revoked.',
        };
        setConsentLog(prev => [newLogEntry, ...prev]);
        setLastUpdated(now);
    }, [initialConsentState, consentLog.length]);

    return (
        <Card className="w-full max-w-4xl mx-auto bg-background text-foreground shadow-2xl">
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold">Privacy & Consent Center</CardTitle>
                    <p className="text-sm text-muted-foreground">Last updated: {lastUpdated.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="border-green-500/50 bg-green-500/10 text-green-400">
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        GDPR Compliant
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex border-b border-border mb-4">
                    <Button variant={activeTab === 'preferences' ? 'ghost' : 'ghost'} onClick={() => setActiveTab('preferences')} className={cn('rounded-none border-b-2', activeTab === 'preferences' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>Preferences</Button>
                    <Button variant={activeTab === 'history' ? 'ghost' : 'ghost'} onClick={() => setActiveTab('history')} className={cn('rounded-none border-b-2', activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>History</Button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'preferences' ? (
                            <div className="space-y-4">
                                {consentCategories.map(category => (
                                    <CategoryItem 
                                        key={category.id} 
                                        category={category} 
                                        consent={consents} 
                                        onToggleCategory={handleToggleCategory}
                                        onToggleSubOption={handleToggleSubOption}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                                {consentLog.map((entry, index) => (
                                    <motion.div 
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg"
                                    >
                                        <History className="h-5 w-5 mt-1 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="font-semibold">{entry.action}</p>
                                            <p className="text-sm text-muted-foreground">{entry.details}</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">{entry.timestamp.toLocaleString()}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t border-border pt-6">
                <Button variant="link" className="text-muted-foreground p-0 h-auto">
                    <a href="/cookie-policy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        Cookie Policy <ExternalLink className="h-4 w-4" />
                    </a>
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleWithdraw}>Withdraw All</Button>
                    <Button onClick={handleSave}>Save Preferences</Button>
                </div>
            </CardFooter>
        </Card>
    );
}
