import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, Mic, Settings, Wind, TestTube, ChevronDown, Check, Waves, Bot, BrainCircuit, Ear } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from "@/components/ui/input";
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const voices = [
  { group: 'English (US)', gender: 'Female', name: 'Jenny', id: 'en-US-JennyNeural' },
  { group: 'English (US)', gender: 'Male', name: 'Guy', id: 'en-US-GuyNeural' },
  { group: 'English (UK)', gender: 'Female', name: 'Libby', id: 'en-GB-LibbyNeural' },
  { group: 'English (UK)', gender: 'Male', name: 'Ryan', id: 'en-GB-RyanNeural' },
  { group: 'English (AU)', gender: 'Female', name: 'Natasha', id: 'en-AU-NatashaNeural' },
  { group: 'English (AU)', gender: 'Male', name: 'William', id: 'en-AU-WilliamNeural' },
  { group: 'English (CA)', gender: 'Female', name: 'Clara', id: 'en-CA-ClaraNeural' },
  { group: 'English (IN)', gender: 'Male', name: 'Prabhat', id: 'en-IN-PrabhatNeural' },
  { group: 'German', gender: 'Female', name: 'Katja', id: 'de-DE-KatjaNeural' },
  { group: 'Spanish (MX)', gender: 'Male', name: 'Jorge', id: 'es-MX-JorgeNeural' },
  { group: 'French', gender: 'Female', name: 'Denise', id: 'fr-FR-DeniseNeural' },
  { group: 'Japanese', gender: 'Female', name: 'Nanami', id: 'ja-JP-NanamiNeural' },
];

const audioDevices = [
    { id: 'default', name: 'Default - MacBook Pro Microphone' },
    { id: 'device-1', name: 'AirPods Pro' },
    { id: 'device-2', name: 'External USB Mic' },
];

const StatusIndicator = ({ status, onClick }: { status: string, onClick: () => void }) => {
  const statusConfig = {
    idle: { icon: <Mic className="w-5 h-5" />, label: 'Click to Activate', color: 'oklch(60% 0.1 250)' },
    listening: { icon: <Waves className="w-5 h-5" />, label: 'Listening...', color: 'oklch(65% 0.15 150)' },
    processing: { icon: <BrainCircuit className="w-5 h-5" />, label: 'Processing...', color: 'oklch(70% 0.2 50)' },
    speaking: { icon: <Bot className="w-5 h-5" />, label: 'Speaking...', color: 'oklch(65% 0.2 280)' },
  };

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;

  return (
    <div 
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 transition-colors",
        status === 'idle' && "cursor-pointer hover:bg-muted/70"
      )}
      onClick={onClick}
    >
        <div className="relative flex items-center justify-center w-16 h-16">
            <AnimatePresence mode="wait">
                <motion.div
                    key={status}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.3, ease: 'backInOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    {status === 'listening' && (
                        <motion.div
                            className="absolute w-full h-full rounded-full"
                            style={{ background: currentStatus.color }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}
                    {status === 'processing' && (
                        <motion.div
                            className="absolute w-full h-full rounded-full border-2 border-dashed"
                            style={{ borderColor: currentStatus.color }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                    )}
                    {status === 'speaking' && (
                        <>
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-full h-full rounded-full border"
                                    style={{ borderColor: currentStatus.color }}
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
                                />
                            ))}
                        </>
                    )}
                    <div className="relative z-10 p-3 rounded-full bg-background shadow-md" style={{ color: currentStatus.color }}>
                        {currentStatus.icon}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
        <p className="text-sm font-medium" style={{ color: currentStatus.color }}>{currentStatus.label}</p>
    </div>
  );
};

export default function HandsFreeAudioControls() {
  const [selectedVoice, setSelectedVoice] = useState(voices[0].id);
  const [speechRate, setSpeechRate] = useState([1]);
  const [pitch, setPitch] = useState([1]);
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('idle');

  const [audibleCues, setAudibleCues] = useState({
    listeningStart: true,
    processingStart: false,
    responseReady: true,
    error: true,
  });
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [wakeWord, setWakeWord] = useState('Hey Sovereign');
  const [isNoiseCancellation, setIsNoiseCancellation] = useState(true);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(audioDevices[0].id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleStatusClick = useCallback(() => {
    if (status !== 'idle') return;

    setStatus('listening');
    setTimeout(() => {
      setStatus('processing');
      setTimeout(() => {
        setStatus('speaking');
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      }, 2000);
    }, 2500);
  }, [status]);

  const handleTestVoice = useCallback(() => {
    if (status !== 'idle') return;
    console.log('Testing voice:', { selectedVoice, speechRate: speechRate[0], pitch: pitch[0], volume: isMuted ? 0 : volume[0] });
    setStatus('speaking');
    setTimeout(() => setStatus('idle'), 2500);
  }, [selectedVoice, speechRate, pitch, volume, isMuted, status]);

  const currentVoice = useMemo(() => voices.find(v => v.id === selectedVoice), [selectedVoice]);
  const currentDevice = useMemo(() => audioDevices.find(d => d.id === selectedAudioDevice), [selectedAudioDevice]);

  const groupedVoices = useMemo(() => {
    return voices.reduce<Record<string, typeof voices>>((acc, voice) => {
      const group = `${voice.group} - ${voice.gender}`;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(voice);
      return acc;
    }, {});
  }, []);

  return (
    <TooltipProvider>
      <Card className="w-full max-w-md mx-auto bg-background/80 backdrop-blur-sm border-border/50 shadow-lg oklch(98% 0.02 240 / 80%)">
        <CardHeader className="p-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Mic className="w-5 h-5 text-primary" />
            Hands-Free Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4">
            
            <StatusIndicator status={status} onClick={handleStatusClick} />

            <Separator className="my-2" />

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Voice</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span>{currentVoice?.name} <span className="text-muted-foreground text-xs">({currentVoice?.group})</span></span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                  {Object.entries(groupedVoices).map(([group, voicesInGroup]) => (
                    <DropdownMenuGroup key={group}>
                      <DropdownMenuLabel>{group}</DropdownMenuLabel>
                      {voicesInGroup.map(voice => (
                        <DropdownMenuItem key={voice.id} onSelect={() => setSelectedVoice(voice.id)}>
                          <Check className={cn("w-4 h-4 mr-2", selectedVoice === voice.id ? "opacity-100" : "opacity-0")} />
                          {voice.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <label htmlFor="rate-slider" className="text-sm font-medium text-muted-foreground">Rate: {speechRate[0].toFixed(1)}x</label>
                <Slider id="rate-slider" min={0.5} max={2} step={0.1} value={speechRate} onValueChange={setSpeechRate} />
              </div>

              <div className="space-y-2">
                <label htmlFor="pitch-slider" className="text-sm font-medium text-muted-foreground">Pitch: {pitch[0].toFixed(1)}</label>
                <Slider id="pitch-slider" min={0.5} max={1.5} step={0.1} value={pitch} onValueChange={setPitch} />
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Volume</label>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                                {isMuted || volume[0] === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
                    </Tooltip>
                    <Slider min={0} max={100} step={1} value={isMuted ? [0] : volume} onValueChange={v => { setIsMuted(false); setVolume(v); }} />
                </div>
            </div>

            <Separator className="my-2" />

            <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent text-left">
                  <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Advanced Settings
                  </h3>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isSettingsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4 animate-in slide-in-from-top-2">
                <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <Ear className="w-4 h-4 text-muted-foreground" /> Audible Cues
                    </label>
                    <div className="pl-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <label htmlFor="cue-listen">Listening</label>
                            <Switch id="cue-listen" checked={audibleCues.listeningStart} onCheckedChange={(c) => setAudibleCues(p => ({...p, listeningStart: c}))} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="cue-ready">Ready</label>
                            <Switch id="cue-ready" checked={audibleCues.responseReady} onCheckedChange={(c) => setAudibleCues(p => ({...p, responseReady: c}))} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="cue-proc">Processing</label>
                            <Switch id="cue-proc" checked={audibleCues.processingStart} onCheckedChange={(c) => setAudibleCues(p => ({...p, processingStart: c}))} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="cue-error">Error</label>
                            <Switch id="cue-error" checked={audibleCues.error} onCheckedChange={(c) => setAudibleCues(p => ({...p, error: c}))} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="auto-play" className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Bot className="w-4 h-4 text-muted-foreground" /> Auto-play Response
                  </label>
                  <Switch id="auto-play" checked={isAutoPlay} onCheckedChange={setIsAutoPlay} />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="noise-cancellation" className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Wind className="w-4 h-4 text-muted-foreground" /> Noise Cancellation
                  </label>
                  <Switch id="noise-cancellation" checked={isNoiseCancellation} onCheckedChange={setIsNoiseCancellation} />
                </div>

                <div className="space-y-2">
                    <label htmlFor="wake-word" className="text-sm font-medium text-muted-foreground">Wake Word</label>
                    <Input id="wake-word" value={wakeWord} onChange={(e) => setWakeWord(e.target.value)} />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Input Device</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal text-left">
                        <span className="truncate">{currentDevice?.name}</span>
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                      {audioDevices.map(device => (
                        <DropdownMenuItem key={device.id} onSelect={() => setSelectedAudioDevice(device.id)}>
                          <Check className={cn("w-4 h-4 mr-2", selectedAudioDevice === device.id ? "opacity-100" : "opacity-0")} />
                          {device.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-2" />

            <Button onClick={handleTestVoice} disabled={status !== 'idle'} className="w-full bg-primary/90 hover:bg-primary text-primary-foreground">
              <TestTube className="w-4 h-4 mr-2" />
              Test Voice
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}