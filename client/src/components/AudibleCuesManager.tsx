import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Play, Upload, Settings, Wind, X, Clock, Sun, Moon, Ear, EarOff, BrainCircuit, CheckCircle, AlertTriangle, Terminal, Hourglass, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SoundEvent = 'processing_start' | 'thinking' | 'tool_execution' | 'completion' | 'error' | 'waiting_for_input';

type SoundCue = {
  id: SoundEvent;
  name: string;
  sound: string;
  volume: number;
  delay: number; // in ms
  visualAlternative: boolean;
  icon: React.ElementType;
};

type VoiceProfile = {
  id: string;
  name: string;
  lang: string;
};

type CustomSound = {
  id: number;
  name: string;
  fileName: string;
};

const initialCues: SoundCue[] = [
  { id: 'processing_start', name: 'Processing Start', sound: 'default_start.mp3', volume: 80, delay: 0, visualAlternative: false, icon: Bot },
  { id: 'thinking', name: 'Thinking', sound: 'default_thinking.mp3', volume: 60, delay: 200, visualAlternative: true, icon: BrainCircuit },
  { id: 'tool_execution', name: 'Tool Execution', sound: 'default_tool.mp3', volume: 75, delay: 0, visualAlternative: false, icon: Terminal },
  { id: 'completion', name: 'Completion', sound: 'default_success.mp3', volume: 90, delay: 0, visualAlternative: true, icon: CheckCircle },
  { id: 'error', name: 'Error', sound: 'default_error.mp3', volume: 100, delay: 0, visualAlternative: true, icon: AlertTriangle },
  { id: 'waiting_for_input', name: 'Waiting for Input', sound: 'default_prompt.mp3', volume: 70, delay: 500, visualAlternative: false, icon: Hourglass },
];

const availableVoices: VoiceProfile[] = [
  { id: 'voice_nova', name: 'Nova', lang: 'en-US' },
  { id: 'voice_echo', name: 'Echo', lang: 'en-GB' },
  { id: 'voice_onyx', name: 'Onyx', lang: 'en-AU' },
  { id: 'voice_luna', name: 'Luna', lang: 'fr-FR' },
];

const WaveformVisualizer = ({ playing }: { playing: boolean }) => {
  const waveData = useMemo(() => Array.from({ length: 30 }, () => Math.random() * 0.8 + 0.2), []);

  return (
    <svg viewBox="0 0 100 20" className="w-full h-8">
      <g>
        {waveData.map((d, i) => (
          <motion.rect
            key={i}
            x={i * 3.3}
            y={10 - (d * 10)}
            width={2}
            height={d * 20}
            rx={1}
            className="text-primary"
            fill="currentColor"
            animate={{ height: playing ? d * 20 : 2, y: playing ? 10 - (d * 10) : 9 }}
            transition={{ duration: 0.2, delay: i * 0.01, repeat: playing ? Infinity : 0, repeatType: 'mirror' }}
          />
        ))}
      </g>
    </svg>
  );
};

export default function AudibleCuesManager() {
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();
  const [cues, setCues] = useState<SoundCue[]>(initialCues);

  // Load persisted audio settings
  useEffect(() => {
    const saved = (prefs?.generalSettings as any)?.audibleCuesSettings;
    if (saved) {
      if (saved.cueVolumes) {
        setCues((prev) => prev.map((c) => ({
          ...c,
          volume: saved.cueVolumes[c.id] ?? c.volume,
          visualAlternative: saved.cueVisual?.[c.id] ?? c.visualAlternative,
        })));
      }
      if (saved.voiceSpeed !== undefined) setVoiceSpeed([saved.voiceSpeed]);
      if (saved.voicePitch !== undefined) setVoicePitch([saved.voicePitch]);
      if (saved.selectedVoice) setSelectedVoice(saved.selectedVoice);
      if (saved.quietHours) setQuietHours(saved.quietHours);
      // globalMute handled by quiet hours toggle
    }
  }, [prefs]);

  const persistSettings = useCallback((updates: Record<string, unknown>) => {
    const current = (prefs?.generalSettings ?? {}) as Record<string, unknown>;
    const existing = (current.audibleCuesSettings ?? {}) as Record<string, unknown>;
    savePrefsMut.mutate({ generalSettings: { ...current, audibleCuesSettings: { ...existing, ...updates } } });
  }, [prefs, savePrefsMut]);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([
    { id: 1, name: 'Custom Success Chime', fileName: 'chime.wav' },
    { id: 2, name: 'Sci-Fi Processing', fileName: 'sci-fi-hum.mp3' },
  ]);
  const [voiceSpeed, setVoiceSpeed] = useState([1]);
  const [voicePitch, setVoicePitch] = useState([1]);
  const [selectedVoice, setSelectedVoice] = useState(availableVoices[0].id);
  const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '07:00' });
  const [spatialAudio, setSpatialAudio] = useState({ enabled: true, mode: 'balanced' });
  const [playingCue, setPlayingCue] = useState<string | null>(null);

  const handleCueUpdate = useCallback((id: SoundEvent, field: keyof SoundCue, value: any) => {
    setCues(prev => prev.map(cue => (cue.id === id ? { ...cue, [field]: value } : cue)));
  }, []);

  const playSound = (soundId: string) => {
    setPlayingCue(soundId);
    setTimeout(() => setPlayingCue(null), 1500);
  };

  const renderCueSettings = (cue: SoundCue) => (
    <motion.div key={cue.id} layout className="p-4 bg-card/50 rounded-lg border border-border mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <cue.icon className="w-6 h-6 text-muted-foreground" />
          <span className="font-medium text-foreground">{cue.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <Select defaultValue={cue.sound}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a sound" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={cue.sound}>Default</SelectItem>
              {customSounds.map(s => <SelectItem key={s.id} value={s.fileName}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => playSound(cue.id)} disabled={!!playingCue}>
                  <Play className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Preview Sound</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="mt-4">
        <WaveformVisualizer playing={playingCue === cue.id} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div>
          <label className="text-sm text-muted-foreground">Volume</label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              defaultValue={[cue.volume]}
              max={100}
              step={1}
              onValueChange={(value) => handleCueUpdate(cue.id, 'volume', value[0])}
            />
            <span className="text-sm font-mono w-12 text-right">{cue.volume}%</span>
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Timing (Delay)</label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              defaultValue={[cue.delay]}
              max={1000}
              step={50}
              onValueChange={(value) => handleCueUpdate(cue.id, 'delay', value[0])}
            />
            <span className="text-sm font-mono w-16 text-right">{cue.delay}ms</span>
          </div>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor={`vis-alt-${cue.id}`} className="text-sm font-medium text-muted-foreground">Visual Alternative</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild><Badge variant="outline">?</Badge></TooltipTrigger>
              <TooltipContent><p>Show a visual indicator alongside the audio cue.</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id={`vis-alt-${cue.id}`}
          checked={cue.visualAlternative}
          onCheckedChange={(checked) => handleCueUpdate(cue.id, 'visualAlternative', checked)}
        />
      </div>
    </motion.div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card/80 backdrop-blur-sm border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-6 h-6" />
                    Audible Cues Manager
                </CardTitle>
                <CardDescription className="mt-1">Configure audio feedback for hands-free mode.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Hands-Free Audio</span>
                <Switch defaultChecked />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="events">Sound Events</TabsTrigger>
            <TabsTrigger value="voice">Voice Feedback</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>
          <AnimatePresence mode="wait">
            <motion.div
                key={useMemo(() => Math.random(), [])} // Force re-render for animation
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
              <TabsContent value="events" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  {cues.map(renderCueSettings)}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="voice" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <label className="text-base font-medium">Voice Profile</label>
                    <p className="text-sm text-muted-foreground mb-4">Select the voice for spoken feedback.</p>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger className="w-full md:w-[280px]">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.lang})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div>
                    <label htmlFor="voice-speed" className="text-base font-medium">Voice Speed</label>
                    <p className="text-sm text-muted-foreground mb-2">Adjust the rate of speech.</p>
                    <div className="flex items-center gap-4">
                        <Slider id="voice-speed" value={voiceSpeed} onValueChange={setVoiceSpeed} max={2} min={0.5} step={0.1} />
                        <span className="text-sm font-mono w-12 text-right">{voiceSpeed[0].toFixed(1)}x</span>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <label htmlFor="voice-pitch" className="text-base font-medium">Voice Pitch</label>
                    <p className="text-sm text-muted-foreground mb-2">Adjust the pitch of the voice.</p>
                    <div className="flex items-center gap-4">
                        <Slider id="voice-pitch" value={voicePitch} onValueChange={setVoicePitch} max={1.5} min={0.5} step={0.1} />
                        <span className="text-sm font-mono w-12 text-right">{voicePitch[0].toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-6">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-medium">Custom Sounds</h3>
                        <p className="text-sm text-muted-foreground mb-4">Upload your own audio files for cues.</p>
                        <div className="space-y-2">
                            {customSounds.map(sound => (
                                <div key={sound.id} className="flex items-center justify-between p-2 bg-card/50 rounded-md border border-border">
                                    <p className="text-sm font-medium">{sound.name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{sound.fileName}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full mt-4">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Sound
                        </Button>
                    </div>
                    <Separator />
                    <div>
                        <h3 className="text-base font-medium">Spatial Audio</h3>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-sm text-muted-foreground">Enable positional audio for a more immersive experience.</p>
                            <Switch checked={spatialAudio.enabled} onCheckedChange={(c) => setSpatialAudio(p => ({...p, enabled: c}))} />
                        </div>
                        <AnimatePresence>
                        {spatialAudio.enabled && (
                            <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="mt-4">
                                <Select value={spatialAudio.mode} onValueChange={(m) => setSpatialAudio(p => ({...p, mode: m}))}>
                                    <SelectTrigger className="w-full md:w-[280px]">
                                        <SelectValue placeholder="Select positioning mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="balanced">Balanced</SelectItem>
                                        <SelectItem value="wide">Wide Stereo</SelectItem>
                                        <SelectItem value="focused">Focused Center</SelectItem>
                                    </SelectContent>
                                </Select>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="accessibility" className="mt-6">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-medium">Quiet Hours</h3>
                        <div className="flex items-center justify-between mt-2">
                            <div>
                                <p className="text-sm text-muted-foreground">Automatically disable all sounds during specific times.</p>
                            </div>
                            <Switch checked={quietHours.enabled} onCheckedChange={(c) => setQuietHours(p => ({...p, enabled: c}))} />
                        </div>
                        <AnimatePresence>
                        {quietHours.enabled && (
                            <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="mt-4 flex items-center gap-4">
                                <div className="grid gap-1">
                                    <label className="text-xs text-muted-foreground">Start time</label>
                                    <input type="time" value={quietHours.start} onChange={e => setQuietHours(p => ({...p, start: e.target.value}))} className="bg-input border border-border rounded-md px-2 py-1 text-sm" />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-xs text-muted-foreground">End time</label>
                                    <input type="time" value={quietHours.end} onChange={e => setQuietHours(p => ({...p, end: e.target.value}))} className="bg-input border border-border rounded-md px-2 py-1 text-sm" />
                                </div>
                                <div className="flex items-center pt-5">
                                    <Sun className="w-5 h-5 text-yellow-400 mr-2" />
                                    <span className="text-sm text-muted-foreground">to</span>
                                    <Moon className="w-5 h-5 text-blue-300 ml-2" />
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                    <Separator />
                    <div>
                        <h3 className="text-base font-medium">Visual Alternatives</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-4">Manage visual indicators that appear alongside audio cues for accessibility.</p>
                        <div className="space-y-3">
                            {cues.map(cue => (
                                <div key={`acc-${cue.id}`} className="flex items-center justify-between p-2 bg-card/50 rounded-md border border-border">
                                    <div className="flex items-center gap-3">
                                        <cue.icon className="w-5 h-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">{cue.name}</span>
                                    </div>
                                    <Switch
                                        checked={cue.visualAlternative}
                                        onCheckedChange={(checked) => handleCueUpdate(cue.id, 'visualAlternative', checked)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
}
