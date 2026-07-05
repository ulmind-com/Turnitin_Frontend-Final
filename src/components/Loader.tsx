import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  size?: number;
  label?: string;
  variant?: "brand" | "white";
  className?: string;
}

/**
 * Premium orbiting-dots loader. Two rings of dots orbit around a pulsing core,
 * echoing the "scanning" motion of the app.
 */
export function Loader({ size = 56, label, variant = "brand", className = "" }: Props) {
  const color = variant === "white" ? "#ffffff" : "var(--brand)";
  const accent = variant === "white" ? "rgba(255,255,255,0.6)" : "var(--ai)";

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer orbit */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              className="absolute rounded-full"
              style={{
                width: size * 0.14,
                height: size * 0.14,
                background: color,
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateY(-${size / 2}px) translate(-50%, -50%)`,
                transformOrigin: "0 0",
                opacity: 0.9,
              }}
            />
          ))}
        </motion.div>
        {/* Inner orbit (reverse) */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          style={{ padding: size * 0.18 }}
        >
          {[45, 225].map((deg) => (
            <span
              key={deg}
              className="absolute rounded-full"
              style={{
                width: size * 0.1,
                height: size * 0.1,
                background: accent,
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateY(-${size * 0.32}px) translate(-50%, -50%)`,
                transformOrigin: "0 0",
              }}
            />
          ))}
        </motion.div>
        {/* Core */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: `radial-gradient(circle at 30% 30%, ${color}, ${accent})`,
            top: "50%",
            left: "50%",
            translate: "-50% -50%",
            boxShadow: `0 0 ${size * 0.4}px ${color}`,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      {label && (
        <motion.span
          className="text-sm font-medium"
          style={{ color: variant === "white" ? "#fff" : "var(--muted-foreground)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

/** Full-screen overlay loader for blocking async work (e.g. PDF download). */
export function LoaderOverlay({ label = "Working…" }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="rounded-2xl bg-card border shadow-2xl px-10 py-8">
        <Loader size={72} label={label} />
      </div>
    </motion.div>
  );
}

/** Inline three-dot loader for buttons. */
export function DotLoader({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
