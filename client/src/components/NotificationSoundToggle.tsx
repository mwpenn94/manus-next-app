
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationSoundToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  volume?: number;
}

/**
 * A React component that provides optional audio feedback settings.
 */
const NotificationSoundToggle: React.FC<NotificationSoundToggleProps> = ({ enabled, onToggle, volume = 0.5 }) => {
  const [currentVolume, setCurrentVolume] = useState(volume);

  const playTestSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + 0.01);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
  };

  return (
    <div className="flex items-center space-x-4 bg-card p-2 rounded-lg border border-border">
      <button
        onClick={() => onToggle(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          enabled ? "bg-primary" : "bg-input"
        )}
      >
        <span className="sr-only">Use setting</span>
        <motion.span
          aria-hidden="true"
          layout
          transition={{ type: "spring", stiffness: 700, damping: 30 }}
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center space-x-2 overflow-hidden"
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentVolume}
              onChange={(e) => setCurrentVolume(parseFloat(e.target.value))}
              className="w-24 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <button
              onClick={playTestSound}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Test
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {enabled ? <Bell className="h-5 w-5 text-foreground" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
};

export default NotificationSoundToggle;
