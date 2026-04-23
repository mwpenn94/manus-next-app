/**
 * VoiceMode — §L.35 Conversational Voice Interface
 *
 * Full-screen voice mode overlay with:
 * - Animated orb visualization (idle/listening/thinking/speaking states)
 * - Real-time transcript display
 * - Agent response text
 * - Latency metrics
 * - Barge-in button
 * - Voice/persona config
 * - Graceful degradation messaging
 */
import { useState, useCallback } from "react";
import { useVoiceSession, type VoiceConfig, type VoiceState } from "@/hooks/useVoiceSession";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings2,
  X,
  Volume2,
  VolumeX,
  Zap,
  AlertCircle,
} from "lucide-react";

interface VoiceModeProps {
  taskId?: string;
  userId?: number;
  onClose: () => void;
  onAgentMessage?: (text: string) => void;
  className?: string;
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Ready",
  connecting: "Connecting...",
  listening: "Listening...",
  processing_stt: "Processing speech...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  interrupted: "Interrupted",
  error: "Error",
  mic_denied: "Microphone access denied",
};

const STATE_COLORS: Record<VoiceState, string> = {
  idle: "text-muted-foreground",
  connecting: "text-yellow-400",
  listening: "text-green-400",
  processing_stt: "text-blue-400",
  thinking: "text-purple-400",
  speaking: "text-primary",
  interrupted: "text-orange-400",
  error: "text-destructive",
  mic_denied: "text-destructive",
};

export default function VoiceMode({
  taskId,
  userId,
  onClose,
  onAgentMessage,
  className,
}: VoiceModeProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<VoiceConfig>({
    voice: "en-US-AriaNeural",
    persona: "default",
    language: "en",
  });

  const voice = useVoiceSession({
    taskId,
    userId,
    onAgentText: (text, done) => {
      if (done && onAgentMessage) {
        onAgentMessage(text);
      }
    },
  });

  const handleStart = useCallback(async () => {
    await voice.start(config);
  }, [voice, config]);

  const handleStop = useCallback(() => {
    voice.stop();
  }, [voice]);

  const handleInterrupt = useCallback(() => {
    voice.interrupt();
  }, [voice]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-label="Voice mode"
        aria-modal="true"
        className={cn(
          "fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center",
          className
        )}
      >
        {/* Close button */}
        <button
          onClick={() => {
            voice.stop();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Close voice mode"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Config button */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Voice settings"
        >
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Animated Orb */}
        <div className="relative mb-8">
          <motion.div
            className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center",
              "transition-colors duration-300",
              voice.state === "listening" && "bg-green-500/20",
              voice.state === "thinking" && "bg-purple-500/20",
              voice.state === "speaking" && "bg-primary/20",
              voice.state === "processing_stt" && "bg-blue-500/20",
              (voice.state === "idle" || voice.state === "connecting") && "bg-muted/30",
              (voice.state === "error" || voice.state === "mic_denied") && "bg-destructive/20"
            )}
            animate={{
              scale:
                voice.state === "listening"
                  ? [1, 1.05, 1]
                  : voice.state === "speaking"
                  ? [1, 1.1, 1]
                  : voice.state === "thinking"
                  ? [1, 1.02, 1]
                  : 1,
            }}
            transition={{
              duration: voice.state === "speaking" ? 0.8 : 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Inner orb */}
            <motion.div
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                voice.state === "listening" && "bg-green-500/30",
                voice.state === "thinking" && "bg-purple-500/30",
                voice.state === "speaking" && "bg-primary/30",
                voice.state === "processing_stt" && "bg-blue-500/30",
                (voice.state === "idle" || voice.state === "connecting") && "bg-muted/40",
                (voice.state === "error" || voice.state === "mic_denied") && "bg-destructive/30"
              )}
            >
              {voice.state === "error" || voice.state === "mic_denied" ? (
                <AlertCircle className="w-8 h-8 text-destructive" />
              ) : voice.state === "speaking" ? (
                <Volume2 className="w-8 h-8 text-primary" />
              ) : voice.state === "listening" ? (
                <Mic className="w-8 h-8 text-green-400" />
              ) : voice.state === "thinking" || voice.state === "processing_stt" ? (
                <Zap className="w-8 h-8 text-purple-400" />
              ) : (
                <MicOff className="w-8 h-8 text-muted-foreground" />
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* State label */}
        <p className={cn("text-sm font-medium mb-4", STATE_COLORS[voice.state])}>
          {STATE_LABELS[voice.state]}
        </p>

        {/* Transcript */}
        {voice.transcript && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md text-center mb-2 px-4"
          >
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{voice.transcript}&rdquo;
            </p>
          </motion.div>
        )}

        {/* Agent response */}
        {voice.agentText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg text-center mb-6 px-4"
          >
            <p className="text-sm text-foreground leading-relaxed">{voice.agentText}</p>
          </motion.div>
        )}

        {/* Error message */}
        {voice.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md text-center mb-6 px-4"
          >
            <p className="text-sm text-destructive">{voice.error}</p>
          </motion.div>
        )}

        {/* Latency metrics */}
        {voice.latency && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
            <span>STT: {voice.latency.sttMs}ms</span>
            <span>LLM: {voice.latency.llmMs}ms</span>
            <span>TTS: {voice.latency.ttsMs}ms</span>
            <span className="font-medium text-foreground">Total: {voice.latency.totalMs}ms</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!voice.isActive ? (
            <button
              onClick={handleStart}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-lg shadow-green-500/20"
              aria-label="Start voice session"
            >
              <Phone className="w-6 h-6" />
            </button>
          ) : (
            <>
              {/* Interrupt button (visible when agent is speaking or thinking) */}
              {(voice.state === "speaking" || voice.state === "thinking") && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleInterrupt}
                  className="w-12 h-12 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 flex items-center justify-center transition-colors"
                  aria-label="Interrupt agent"
                >
                  <VolumeX className="w-5 h-5" />
                </motion.button>
              )}

              {/* End call button */}
              <button
                onClick={handleStop}
                className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center transition-colors shadow-lg shadow-destructive/20"
                aria-label="End voice session"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute left-4 top-16 w-64 bg-card border border-border rounded-xl p-4 shadow-xl"
            >
              <h3 className="text-sm font-medium mb-3">Voice Settings</h3>

              <label className="block text-xs text-muted-foreground mb-1">Voice</label>
              <select
                value={config.voice}
                onChange={(e) => {
                  const newConfig = { ...config, voice: e.target.value };
                  setConfig(newConfig);
                  voice.updateConfig(newConfig);
                }}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm mb-3"
              >
                <option value="en-US-AriaNeural">Aria (Female)</option>
                <option value="en-US-AvaNeural">Ava (Female)</option>
                <option value="en-US-EmmaNeural">Emma (Female)</option>
                <option value="en-US-JennyNeural">Jenny (Female)</option>
                <option value="en-US-AndrewNeural">Andrew (Male)</option>
                <option value="en-US-BrianNeural">Brian (Male)</option>
                <option value="en-US-GuyNeural">Guy (Male)</option>
                <option value="en-US-RogerNeural">Roger (Male)</option>
                <option value="en-GB-SoniaNeural">Sonia UK (Female)</option>
                <option value="en-GB-RyanNeural">Ryan UK (Male)</option>
              </select>

              <label className="block text-xs text-muted-foreground mb-1">Persona</label>
              <select
                value={config.persona}
                onChange={(e) => {
                  const newConfig = { ...config, persona: e.target.value };
                  setConfig(newConfig);
                  voice.updateConfig(newConfig);
                }}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm mb-3"
              >
                <option value="default">Default</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="accessibility">Accessibility</option>
              </select>

              <label className="block text-xs text-muted-foreground mb-1">Language</label>
              <select
                value={config.language}
                onChange={(e) => {
                  const newConfig = { ...config, language: e.target.value };
                  setConfig(newConfig);
                  voice.updateConfig(newConfig);
                }}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ar">Arabic</option>
              </select>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
