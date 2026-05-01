import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Moon, Sun, ChevronsLeftRight, Keyboard, X, ArrowUp, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock shadcn/ui components that are not part of the original request but needed for the final component
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>{children}</div>;
const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("p-6 pt-0", className)}>{children}</div>;
const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;

type KeyLayout = string[][];

const keyLayouts: { [key: string]: KeyLayout } = {
  full: [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ],
  compact: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ],
};

const getKeyClass = (key: string, size: 'sm' | 'md' | 'lg') => {
  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg',
  };

  const baseClass = `font-semibold transition-all duration-100 flex-grow`;
  const specialKeyClasses = 'px-2 flex-grow-[1.5]';

  if (key.length > 1) {
    if (key === 'space') return cn(baseClass, sizeClasses[size], 'flex-grow-[4]');
    if (key === 'backspace' || key === 'enter') return cn(baseClass, sizeClasses[size], 'flex-grow-[2]');
    return cn(baseClass, sizeClasses[size], specialKeyClasses);
  }
  return cn(baseClass, sizeClasses[size]);
};

const VirtualKeyboard = () => {
  const [input, setInput] = useState("");
  const [isShifted, setShifted] = useState(false);
  const [isCapsLock, setCapsLock] = useState(false);
  const [isSpecialChars, setSpecialChars] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [keySize, setKeySize] = useState<'sm' | 'md' | 'lg'>('md');
  const [layout, setLayout] = useState<'full' | 'compact'>('full');

  const audioContext = useMemo(() => {
    try {
      return new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }, []);

  const playSound = useCallback(() => {
    if (!soundEnabled || !audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(isShifted ? 220 : 180, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.05);
  }, [soundEnabled, audioContext, isShifted]);

  const handleKeyPress = useCallback((key: string) => {
    playSound();
    if (key === 'space') {
      setInput(prev => prev + ' ');
    } else if (key === 'backspace') {
      setInput(prev => prev.slice(0, -1));
    } else if (key === 'enter') {
      setInput(prev => prev + '\n');
    } else if (key === 'shift') {
      setShifted(prev => !prev);
      if (isCapsLock) setCapsLock(false);
    } else if (key === 'caps') {
      setCapsLock(prev => !prev);
      setShifted(false);
    } else if (key === 'symbols') {
      setSpecialChars(prev => !prev);
    } else {
      const char = isShifted || isCapsLock ? key.toUpperCase() : key.toLowerCase();
      setInput(prev => prev + char);
      if (isShifted) {
        setShifted(false);
      }
    }
  }, [isShifted, isCapsLock, playSound]);

  const currentLayout = useMemo(() => {
    const baseLayout = keyLayouts[layout];
    if (isSpecialChars) {
      return [
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
        ['-', '_', '=', '+', '[', ']', '{', '}', '|', '\\'],
        [';', ':', '"', "'", ',', '<', '.', '>', '/', '?'],
      ];
    }
    return baseLayout;
  }, [layout, isSpecialChars]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const renderKey = (key: string) => {
    const isSpecial = key.length > 1;
    let display: React.ReactNode = key;
    if (isSpecial) {
      if (key === 'shift') display = <ArrowUp className="h-5 w-5" />;
      else if (key === 'backspace') display = <ChevronsLeftRight className="h-5 w-5" />;
      else if (key === 'caps') display = <span className={cn('text-xs', { 'text-primary': isCapsLock })}>CAPS</span>;
      else if (key === 'enter') display = <CornerDownLeft className="h-5 w-5" />;
      else if (key === 'space') display = 'Space';
      else if (key === 'symbols') display = '#+=';
    }

    return (
      <motion.div
        key={key}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={getKeyClass(key, keySize)}
      >
        <Button
          onClick={() => handleKeyPress(key)}
          className={cn(
            'w-full h-full',
            { 'bg-primary/20 text-primary': (isShifted && key === 'shift') || (isCapsLock && key === 'caps') },
            { 'bg-secondary': isSpecialChars && key === 'symbols' }
          )}
          variant="outline"
          aria-label={`Key ${key}`}
        >
          {display}
        </Button>
      </motion.div>
    );
  };

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', theme)}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Keyboard className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Virtual Keyboard</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setSoundEnabled(p => !p)} variant="ghost" size="icon" aria-label="Toggle sound">
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} variant="ghost" size="icon" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        <div className="w-full min-h-[6rem] bg-background rounded-md mt-2 p-3 text-foreground text-lg font-mono break-words whitespace-pre-wrap">
          {input || <span className="text-muted-foreground">Typed text will appear here...</span>}
          <span className="animate-pulse">|</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end space-x-2 mb-4">
          <Select value={keySize} onValueChange={(v: 'sm' | 'md' | 'lg') => setKeySize(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Key Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
          <Select value={layout} onValueChange={(v: 'full' | 'compact') => setLayout(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {currentLayout.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center space-x-2">
                {row.map(renderKey)}
              </div>
            ))}
          </AnimatePresence>
          <div className="flex justify-center space-x-2">
            {renderKey('shift')} 
            {renderKey('symbols')}
            {renderKey('space')}
            {renderKey('backspace')}
            {renderKey('enter')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VirtualKeyboard;
