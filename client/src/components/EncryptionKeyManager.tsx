import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Shield, KeyRound, RotateCw, AlertTriangle, Plus, ChevronDown, ChevronRight, Share2, BarChart2 } from 'lucide-react';

type KeyStatus = 'active' | 'rotating' | 'expired' | 'revoked';
type KeyAlgorithm = 'AES-256' | 'RSA-4096';

interface Key {
  id: string;
  name: string;
  algorithm: KeyAlgorithm;
  status: KeyStatus;
  creationDate: Date;
  expiryDate: Date;
  rotationSchedule: number; // in days
  usage: number;
  parentId?: string;
}

const initialKeys: Key[] = [
  { id: 'master-01', name: 'Primary Master Key', algorithm: 'RSA-4096', status: 'active', creationDate: new Date('2025-11-01T10:00:00Z'), expiryDate: new Date('2027-11-01T10:00:00Z'), rotationSchedule: 730, usage: 1204 },
  { id: 'data-enc-01', name: 'Customer Data Key', algorithm: 'AES-256', status: 'active', creationDate: new Date('2026-01-15T14:30:00Z'), expiryDate: new Date('2026-07-15T14:30:00Z'), rotationSchedule: 180, usage: 85930, parentId: 'master-01' },
  { id: 'data-enc-02', name: 'Financial Records Key', algorithm: 'AES-256', status: 'rotating', creationDate: new Date('2025-08-20T09:00:00Z'), expiryDate: new Date('2026-02-20T09:00:00Z'), rotationSchedule: 180, usage: 45102, parentId: 'master-01' },
  { id: 'backup-01', name: 'Cold Storage Backup Key', algorithm: 'RSA-4096', status: 'expired', creationDate: new Date('2024-05-01T00:00:00Z'), expiryDate: new Date('2025-05-01T00:00:00Z'), rotationSchedule: 365, usage: 580, parentId: 'master-01' },
  { id: 'service-master-01', name: 'Service Layer Master', algorithm: 'RSA-4096', status: 'active', creationDate: new Date('2026-03-10T12:00:00Z'), expiryDate: new Date('2028-03-10T12:00:00Z'), rotationSchedule: 730, usage: 890 },
  { id: 'auth-token-key', name: 'API Auth Token Signing Key', algorithm: 'AES-256', status: 'active', creationDate: new Date('2026-04-01T18:00:00Z'), expiryDate: new Date('2026-06-01T18:00:00Z'), rotationSchedule: 60, usage: 150320, parentId: 'service-master-01' },
  { id: 'log-key-01', name: 'Audit Log Encryption Key', algorithm: 'AES-256', status: 'revoked', creationDate: new Date('2025-09-10T00:00:00Z'), expiryDate: new Date('2026-03-10T00:00:00Z'), rotationSchedule: 180, usage: 75000, parentId: 'service-master-01' },
  { id: 'standalone-01', name: 'Internal Tooling Key', algorithm: 'AES-256', status: 'active', creationDate: new Date('2026-04-20T11:00:00Z'), expiryDate: new Date('2027-04-20T11:00:00Z'), rotationSchedule: 365, usage: 1250 },
];

const statusConfig: Record<KeyStatus, { color: string; icon: React.ElementType }> = {
  active: { color: 'bg-green-500', icon: Shield },
  rotating: { color: 'bg-yellow-500', icon: RotateCw },
  expired: { color: 'bg-gray-500', icon: AlertTriangle },
  revoked: { color: 'bg-red-500', icon: AlertTriangle },
};

const Countdown = ({ to }: { to: Date }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = to.getTime() - now;
      if (distance < 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    }, 1000);
    return () => clearInterval(interval);
  }, [to]);

  return <span>{timeLeft}</span>;
};

const KeyNode = ({ keyItem, allKeys, onSelect, selectedKeyId, level = 0 }: { keyItem: Key; allKeys: Key[]; onSelect: (key: Key) => void; selectedKeyId: string | null; level?: number }) => {
  const children = allKeys.filter(k => k.parentId === keyItem.id);
  const [isOpen, setIsOpen] = useState(level < 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div
        className={cn(
          'flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted',
          selectedKeyId === keyItem.id && 'bg-muted'
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={() => onSelect(keyItem)}
      >
        <div className="flex items-center gap-2 truncate">
          {children.length > 0 ? (
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          ) : (
            <div className="w-4" />
          )}
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-sm">{keyItem.name}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className={cn('h-2.5 w-2.5 rounded-full', statusConfig[keyItem.status].color)} />
            </TooltipTrigger>
            <TooltipContent>
              <p className="capitalize">{keyItem.status}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <AnimatePresence>
        {isOpen && children.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {children.map(child => <KeyNode key={child.id} keyItem={child} allKeys={allKeys} onSelect={onSelect} selectedKeyId={selectedKeyId} level={level + 1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function EncryptionKeyManager() {
  const [keys, setKeys] = useState<Key[]>(initialKeys);
  const [selectedKey, setSelectedKey] = useState<Key | null>(keys.find(k => k.id === 'data-enc-01') || null);
  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [newKeyAlgo, setNewKeyAlgo] = useState<KeyAlgorithm>('AES-256');

  const keyHierarchy = useMemo(() => keys.filter(k => !k.parentId), [keys]);

  const handleGenerateKey = useCallback(() => {
    const newKey: Key = {
      id: `gen-${Date.now()}`,
      name: `${newKeyAlgo} Key #${(Math.random() * 1000).toFixed(0)}`,
      algorithm: newKeyAlgo,
      status: 'active',
      creationDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rotationSchedule: 365,
      usage: 0,
      parentId: selectedKey?.id,
    };
    setKeys(prev => [...prev, newKey]);
    setGenerateOpen(false);
  }, [newKeyAlgo, selectedKey]);

  const handleRevokeKey = useCallback((keyId: string) => {
    setKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'revoked' } : k));
    if (selectedKey?.id === keyId) {
      setSelectedKey(prev => prev ? { ...prev, status: 'revoked' } : null);
    }
  }, [selectedKey]);

  const maxUsage = useMemo(() => Math.max(...keys.map(k => k.usage), 1), [keys]);

  return (
    <div className="w-full h-full bg-background text-foreground p-4 flex gap-4">
      <Card className="w-1/3 flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Key Hierarchy</CardTitle>
          <Dialog open={isGenerateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate New Key</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <Select value={newKeyAlgo} onValueChange={(v: string) => setNewKeyAlgo(v as KeyAlgorithm)}>
                  <SelectTrigger><SelectValue placeholder="Select Algorithm" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AES-256">AES-256</SelectItem>
                    <SelectItem value="RSA-4096">RSA-4096</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">New key will be a child of the currently selected key: {selectedKey?.name || 'None'}</p>
              </div>
              <DialogFooter>
                <Button onClick={handleGenerateKey}>Generate Key</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          {keyHierarchy.map(key => <KeyNode key={key.id} keyItem={key} allKeys={keys} onSelect={setSelectedKey} selectedKeyId={selectedKey?.id || null} />)}
        </CardContent>
      </Card>

      <Card className="w-2/3">
        <AnimatePresence mode="wait">
          {selectedKey ? (
            <motion.div key={selectedKey.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-muted-foreground" />
                    {selectedKey.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedKey.id}</p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={selectedKey.status === 'revoked'}>Revoke Key</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Confirm Revocation</h4>
                        <p className="text-sm text-muted-foreground">Are you sure you want to revoke this key? This action cannot be undone.</p>
                      </div>
                      <Button variant="destructive" onClick={() => handleRevokeKey(selectedKey.id)}>Confirm Revoke</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('capitalize', statusConfig[selectedKey.status].color)}>{selectedKey.status}</Badge>
                  </div>
                  <div className="text-sm"><span className="font-semibold">Algorithm:</span> {selectedKey.algorithm}</div>
                  <div className="text-sm"><span className="font-semibold">Created:</span> {selectedKey.creationDate.toLocaleDateString()}</div>
                  <div className="text-sm"><span className="font-semibold">Expires in:</span> <Countdown to={selectedKey.expiryDate} /></div>
                  <div className="text-sm"><span className="font-semibold">Rotation:</span> Every {selectedKey.rotationSchedule} days</div>
                  <div className="text-sm"><span className="font-semibold">Parent Key:</span> {keys.find(k => k.id === selectedKey.parentId)?.name || 'None'}</div>
                </div>
                <Separator className="my-6" />
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2"><BarChart2 className="h-5 w-5"/>Key Usage Statistics</h4>
                  <div className="space-y-2">
                     <div className="flex items-center gap-4 text-sm">
                        <span className="w-24">Total Operations:</span>
                        <span className="font-mono text-lg">{selectedKey.usage.toLocaleString()}</span>
                     </div>
                     <div className="flex items-center gap-4 text-sm">
                        <span className="w-24">Usage Level:</span>
                        <div className="w-full bg-muted rounded-full h-2.5">
                            <motion.div 
                                className="bg-primary h-2.5 rounded-full"
                                style={{ width: `${(selectedKey.usage / maxUsage) * 100}%` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(selectedKey.usage / maxUsage) * 100}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                     </div>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a key to view its details.</p>
            </div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
