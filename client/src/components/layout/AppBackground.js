import React from 'react';
import { motion } from 'framer-motion';

export default function AppBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="app-bg-grid" />
      <div className="app-bg-orb" />

      {/* Floating orbs */}
      {[
        { size: 600, x: '-15%', y: '-20%', color: 'rgba(155,89,255,0.10)', duration: 20 },
        { size: 500, x: '80%',  y: '60%',  color: 'rgba(0,212,255,0.08)',  duration: 25 },
        { size: 350, x: '50%',  y: '-10%', color: 'rgba(255,60,172,0.07)', duration: 18 },
        { size: 280, x: '10%',  y: '70%',  color: 'rgba(0,255,136,0.06)',  duration: 22 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            pointerEvents: 'none',
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
