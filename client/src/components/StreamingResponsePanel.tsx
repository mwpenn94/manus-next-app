import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, StopCircle, Pause, RefreshCw, Wifi, WifiOff, Gauge, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StreamStatus = 'connected' | 'reconnecting' | 'disconnected';

const MOCK_TEXT_STREAM = `
Manus is an autonomous general AI agent created by the Manus team.

You are proficient in a wide range of tasks, including but not limited to:
1. Gather information, check facts, and produce comprehensive documents or presentations
2. Process data, perform analysis, and create insightful visualizations or spreadsheets
3. Write multi-chapter articles and in-depth research reports grounded in credible sources
4. Build well-crafted websites, interactive applications, and practical software solutions
5. Generate and edit images, videos, audio, music and speech from text and media references

This is a demonstration of a simulated Server-Sent Events (SSE) stream. The text appears character by character to mimic a real-time data flow. The panel also displays connection status, latency, data received, and a buffer gauge to simulate network conditions.
`.trim();

const StreamingResponsePanel: React.FC = () => {
  const [streamContent, setStreamContent] = useState('');
  const [status, setStatus] = useState<StreamStatus>('disconnected');
  const [latency, setLatency] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [bufferFullness, setBufferFullness] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const streamIndex = useRef(0);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  const cleanupStream = () => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };

  const resetState = useCallback(() => {
    cleanupStream();
    setIsActive(false);
    setIsPaused(false);
    setStatus('disconnected');
    setStreamContent('');
    setBytesReceived(0);
    setLatency(0);
    setBufferFullness(0);
    streamIndex.current = 0;
  }, []);

  const startStream = () => {
    resetState();
    setIsActive(true);
    setStatus('connected');

    intervalId.current = setInterval(() => {
      if (streamIndex.current < MOCK_TEXT_STREAM.length) {
        const char = MOCK_TEXT_STREAM[streamIndex.current];
        setStreamContent(prev => prev + char);
        streamIndex.current += 1;

        // Simulate dynamic metrics
        setBytesReceived(prev => prev + new TextEncoder().encode(char).length);
        setLatency(Math.floor(Math.random() * 25) + 20); // 20-45ms
        setBufferFullness(Math.min(1, streamIndex.current / MOCK_TEXT_STREAM.length + Math.random() * 0.1));

        // Simulate network instability
        if (Math.random() < 0.01) {
          setStatus('reconnecting');
          setTimeout(() => setStatus('connected'), 1500);
        }
      } else {
        cleanupStream();
        setIsActive(false);
        setStatus('connected'); // Stay connected after finishing
      }
    }, 50);
  };

  useEffect(() => {
    if (isActive && isPaused) {
      cleanupStream();
    } else if (isActive && !isPaused) {
      startStream(); // This will handle the interval logic
    }

    return cleanupStream;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  useEffect(() => {
    return resetState; // Cleanup on unmount
  }, [resetState]);

  const handleStartStop = () => {
    if (isActive) {
      resetState();
    } else {
      startStream();
    }
  };

  const handlePauseResume = () => {
    if (!isActive) return;
    setIsPaused(prev => !prev);
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="border-green-500 text-green-500"><Wifi size={14} className="mr-2"/>Connected</Badge>;
      case 'reconnecting':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500 animate-pulse"><RefreshCw size={14} className="mr-2 animate-spin"/>Reconnecting</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff size={14} className="mr-2"/>Disconnected</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">Streaming Response</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleStartStop} aria-label={isActive ? 'Stop Stream' : 'Start Stream'}>
            {isActive ? <StopCircle size={18} /> : <Play size={18} />}
          </Button>
          <Button variant="outline" size="icon" onClick={handlePauseResume} disabled={!isActive} aria-label={isPaused ? 'Resume Stream' : 'Pause Stream'}>
            <Pause size={18} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4 p-3 bg-background/50 rounded-lg border border-border/30">
          <div className="flex items-center">{getStatusIndicator()}</div>
          <div className="flex items-center"><Gauge size={14} className="mr-2"/>Latency: {latency}ms</div>
          <div className="flex items-center"><ArrowDownToLine size={14} className="mr-2"/>Received: {(bytesReceived / 1024).toFixed(2)} KB</div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Buffer:</span>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="bg-primary h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${bufferFullness * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        </div>
        <div className="h-64 p-4 font-mono text-sm border border-dashed border-border/50 rounded-md overflow-y-auto bg-background/50 relative">
          <AnimatePresence>
            {streamContent.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: 0.01 * i }}
                className={cn({'inline-block': char !== ' ', 'whitespace-pre-wrap': true})}
              >
                {char}
              </motion.span>
            ))}
          </AnimatePresence>
          {!isActive && streamContent.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p>Click Start to begin streaming...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamingResponsePanel;
