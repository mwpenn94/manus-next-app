import React, { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, AlertTriangle, Bell, Zap } from 'lucide-react';

// Type definitions
type ConditionType = 'metric' | 'event';
type Operator = 'above' | 'below' | 'equals';
type Aggregation = 'avg' | 'sum' | 'min' | 'max';
type NotificationChannel = 'email' | 'slack' | 'pagerduty';

interface Condition {
  id: string;
  type: ConditionType;
  metric: string;
  operator: Operator;
  aggregation: Aggregation;
  threshold: number;
  duration: number; // in minutes
}

interface Notification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
}

interface EscalationPolicy {
  id: string;
  delay: number; // in minutes
  channel: NotificationChannel;
  recipient: string;
}

const METRICS = ['cpu.usage.percent', 'memory.usage.bytes', 'disk.io.ops', 'network.in.bytes'];
const AGGREGATIONS: Aggregation[] = ['avg', 'sum', 'min', 'max'];
const OPERATORS: Operator[] = ['above', 'below', 'equals'];
const CHANNELS: NotificationChannel[] = ['email', 'slack', 'pagerduty'];

// Mock data generators
const createMockCondition = (): Condition => ({
  id: `cond-${Date.now()}-${Math.random()}`,
  type: 'metric',
  metric: METRICS[0],
  operator: 'above',
  aggregation: 'avg',
  threshold: 80,
  duration: 5,
});

const createMockNotification = (): Notification => ({
  id: `notif-${Date.now()}-${Math.random()}`,
  channel: 'slack',
  recipient: '#alerts-channel',
});

const createMockEscalation = (): EscalationPolicy => ({
    id: `esc-${Date.now()}-${Math.random()}`,
    delay: 15,
    channel: 'pagerduty',
    recipient: 'on-call-eng',
});

export default function AlertRuleBuilder() {
  const [ruleName, setRuleName] = useState<string>('High CPU Usage Alert');
  const [conditions, setConditions] = useState<Condition[]>([createMockCondition()]);
  const [notifications, setNotifications] = useState<Notification[]>([createMockNotification()]);
  const [escalationPolicies, setEscalationPolicies] = useState<EscalationPolicy[]>([createMockEscalation()]);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const updateCondition = <K extends keyof Condition>(id: string, key: K, value: Condition[K]) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const updateNotification = <K extends keyof Notification>(id: string, key: K, value: Notification[K]) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, [key]: value } : n));
  };

  const updateEscalation = <K extends keyof EscalationPolicy>(id: string, key: K, value: EscalationPolicy[K]) => {
    setEscalationPolicies(prev => prev.map(e => e.id === id ? { ...e, [key]: value } : e));
  };

  const addCondition = useCallback(() => setConditions(prev => [...prev, createMockCondition()]), []);
  const removeCondition = useCallback((id: string) => setConditions(prev => prev.filter(c => c.id !== id)), []);
  const addNotification = useCallback(() => setNotifications(prev => [...prev, createMockNotification()]), []);
  const removeNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);
  const addEscalationPolicy = useCallback(() => setEscalationPolicies(prev => [...prev, createMockEscalation()]), []);
  const removeEscalationPolicy = useCallback((id: string) => setEscalationPolicies(prev => prev.filter(e => e.id !== id)), []);

  return (
    <div className="bg-[#0a0a0a] text-white font-sans p-4 lg:p-6 max-w-4xl mx-auto rounded-xl border border-white/10 shadow-2xl shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-white">Alert Rule Builder</h1>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <span className={`text-sm font-medium ${isEnabled ? 'text-green-400' : 'text-white/40'}`}>{isEnabled ? 'Enabled' : 'Disabled'}</span>
          <button onClick={() => setIsEnabled(!isEnabled)} className={`w-12 h-6 rounded-full flex items-center transition-colors ${isEnabled ? 'bg-green-500' : 'bg-white/20'}`}>
            <span className={`block w-5 h-5 rounded-full bg-white transform transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="ruleName" className="block text-sm font-medium text-white/60 mb-2">Rule Name</label>
          <input id="ruleName" type="text" value={ruleName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-base text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g., High CPU Usage Alert" />
        </div>

        <div className="p-4 border border-white/10 rounded-lg space-y-3 bg-black/20">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-white/80 flex items-center gap-2"><Zap size={18} className="text-purple-400"/> Conditions</h2>
                <button onClick={addCondition} className="flex items-center gap-1 text-sm bg-blue-600/50 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md transition-colors"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-2">{conditions.map(c => (
                <div key={c.id} className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:items-center gap-2 bg-white/5 p-2 rounded-md text-sm">
                    <select value={c.aggregation} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(c.id, 'aggregation', e.target.value as Aggregation)} className="bg-transparent border border-white/10 rounded-md p-1.5 w-full"><option value="" disabled>Aggregation</option>{AGGREGATIONS.map(a => <option key={a} value={a}>{a}</option>)}</select>
                    <select value={c.metric} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(c.id, 'metric', e.target.value)} className="bg-transparent border border-white/10 rounded-md p-1.5 w-full col-span-2 md:col-span-2"><option value="" disabled>Metric</option>{METRICS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <select value={c.operator} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(c.id, 'operator', e.target.value as Operator)} className="bg-transparent border border-white/10 rounded-md p-1.5 w-full"><option value="" disabled>Operator</option>{OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                    <input type="number" value={c.threshold} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(c.id, 'threshold', parseFloat(e.target.value))} className="w-full bg-transparent border border-white/10 rounded-md p-1.5" />
                    <div className="flex items-center gap-2"><span className="text-white/60">for</span><input type="number" value={c.duration} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(c.id, 'duration', parseInt(e.target.value))} className="w-full bg-transparent border border-white/10 rounded-md p-1.5" /><span className="text-white/60">min</span></div>
                    <button onClick={() => removeCondition(c.id)} className="lg:ml-auto text-white/40 hover:text-red-500 transition-colors justify-self-end"><Trash2 size={16} /></button>
                </div>
            ))}</div>
        </div>

        <div className="p-4 border border-white/10 rounded-lg space-y-3 bg-black/20">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-white/80 flex items-center gap-2"><Bell size={18} className="text-blue-400"/> Notifications</h2>
                <button onClick={addNotification} className="flex items-center gap-1 text-sm bg-blue-600/50 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md transition-colors"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-2">{notifications.map(n => (
                <div key={n.id} className="flex items-center gap-2 bg-white/5 p-2 rounded-md text-sm">
                    <select value={n.channel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateNotification(n.id, 'channel', e.target.value as NotificationChannel)} className="bg-transparent border border-white/10 rounded-md p-1.5"><option value="" disabled>Channel</option>{CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}</select>
                    <input type="text" value={n.recipient} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotification(n.id, 'recipient', e.target.value)} className="bg-transparent border border-white/10 rounded-md p-1.5 flex-grow" placeholder="Recipient (e.g., #channel, user@example.com)" />
                    <button onClick={() => removeNotification(n.id)} className="ml-auto text-white/40 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
            ))}</div>
        </div>

        <div className="p-4 border border-white/10 rounded-lg space-y-3 bg-black/20">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-white/80 flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-400"/> Escalation Policies</h2>
                <button onClick={addEscalationPolicy} className="flex items-center gap-1 text-sm bg-blue-600/50 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md transition-colors"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-2">{escalationPolicies.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-white/5 p-2 rounded-md text-sm">
                    <span className="text-white/60">After</span>
                    <input type="number" value={p.delay} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEscalation(p.id, 'delay', parseInt(e.target.value))} className="w-20 bg-transparent border border-white/10 rounded-md p-1.5" />
                    <span className="text-white/60">min, notify</span>
                    <select value={p.channel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateEscalation(p.id, 'channel', e.target.value as NotificationChannel)} className="bg-transparent border border-white/10 rounded-md p-1.5"><option value="" disabled>Channel</option>{CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}</select>
                    <input type="text" value={p.recipient} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEscalation(p.id, 'recipient', e.target.value)} className="bg-transparent border border-white/10 rounded-md p-1.5 flex-grow" placeholder="Escalation recipient" />
                    <button onClick={() => removeEscalationPolicy(p.id)} className="ml-auto text-white/40 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
            ))}</div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-md transition-colors">Cancel</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Save Rule</button>
      </div>
    </div>
  );
}
