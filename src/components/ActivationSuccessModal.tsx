import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';

interface ActivationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: () => void;
}

export default function ActivationSuccessModal({
  isOpen,
  onClose,
  onStartChat,
}: ActivationSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Play soft success sound
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const now = ctx.currentTime;

          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(523.25, now);
          gain1.gain.setValueAtTime(0.08, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.4);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(783.99, now + 0.1);
          gain2.gain.setValueAtTime(0.08, now + 0.1);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.1);
          osc2.stop(now + 0.6);
        }
      } catch (e) {
        // ignore audio errors
      }

      // Small success vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([50, 30, 50]);
        } catch (e) {}
      }

      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onStartChat();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onStartChat]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#121216]/95 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] backdrop-blur-2xl text-center flex flex-col items-center gap-4 relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Ambient glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing check icon in glass circle */}
            <div className="relative my-1 shrink-0">
              <div className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/15 border border-emerald-400/40 backdrop-blur-xl flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <Check size={36} className="text-emerald-400 stroke-[2.5]" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white tracking-wide flex items-center justify-center gap-2 shrink-0">
              🎉 AI Brain Activated
            </h2>

            {/* Message Body */}
            <div className="flex flex-col items-center gap-3 text-sm w-full">
              <p className="font-semibold text-emerald-300 text-base">
                Hello! Main ab poori tarah activate ho chuki hoon. 😊
              </p>
              
              <p className="text-neutral-300 leading-relaxed text-xs sm:text-sm">
                Aapki Gemini API Key safaltapoorvak verify ho gayi hai aur meri AI Brain ab taiyar hai.
              </p>

              <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 text-left flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                  Ab aap mujhse:
                </p>
                <ul className="flex flex-col gap-1.5 text-xs sm:text-sm font-medium text-neutral-200">
                  <li className="flex items-center gap-2">
                    <span>✨</span> Smart Chat kar sakte hain
                  </li>
                  <li className="flex items-center gap-2">
                    <span>🎙️</span> Voice me baat kar sakte hain
                  </li>
                  <li className="flex items-center gap-2">
                    <span>🧠</span> Intelligent AI Responses le sakte hain
                  </li>
                  <li className="flex items-center gap-2">
                    <span>💾</span> Memory features ka istemal kar sakte hain
                  </li>
                  <li className="flex items-center gap-2">
                    <span>⚡</span> Fast Streaming Responses pa sakte hain
                  </li>
                  <li className="flex items-center gap-2 text-emerald-300">
                    <span>🚀</span> Aur mere saare Premium AI Features ka anand le sakte hain.
                  </li>
                </ul>
              </div>

              <div className="text-xs sm:text-sm text-neutral-300 font-medium space-y-0.5 pt-1">
                <p>Main aapki madad ke liye poori tarah taiyar hoon.</p>
                <p className="text-purple-300 font-semibold">Chaliye shuru karte hain! 💜</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full mt-1 shrink-0">
              <button
                type="button"
                onClick={onStartChat}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-white font-semibold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✨ Let's Chat</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-neutral-300 hover:text-white font-semibold text-sm border border-white/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

