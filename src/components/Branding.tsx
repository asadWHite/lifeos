"use client";

import { motion } from "framer-motion";

export function Logo({ size = 100, className = "" }: { size?: number; className?: string }) {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Metallic Disc */}
      <motion.div 
        className="absolute inset-0 rounded-full shadow-2xl"
        style={{
          background: "conic-gradient(from 180deg at 50% 50%, #2B3153 0deg, #86939B 90deg, #EFEFEF 180deg, #505870 270deg, #2B3153 360deg)",
          border: "2px solid rgba(255,255,255,0.1)"
        }}
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Central Mark */}
      <div className="relative z-10 font-bold text-white tracking-tighter" style={{ fontSize: size * 0.35 }}>
        L<span className="text-brand-silver">OS</span>
      </div>

      {/* Gloss effect */}
      <div 
        className="absolute inset-2 rounded-full opacity-30 bg-gradient-to-tr from-transparent via-white to-transparent pointer-events-none"
      />
    </div>
  );
}

export function Intro() {
  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-dark"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 2.5, duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={() => {
        // Triggered after fade out
      }}
      style={{ pointerEvents: "none" }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <Logo size={140} />
      </motion.div>
      
      <motion.div 
        className="mt-8 overflow-hidden"
        initial={{ width: 0 }}
        animate={{ width: "auto" }}
        transition={{ delay: 0.5, duration: 1.5 }}
      >
        <h1 className="text-2xl font-semibold text-brand-light tracking-[0.4em] uppercase whitespace-nowrap px-4">
          LifeOS
        </h1>
      </motion.div>

      {/* Subtle sweep */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}
