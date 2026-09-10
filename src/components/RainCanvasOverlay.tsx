import React, { useEffect, useRef } from 'react';

export type RainIntensity = 'off' | 'light' | 'heavy' | 'storm';

interface RainCanvasOverlayProps {
  intensity: RainIntensity;
  theme?: 'light' | 'dark';
}

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
  width: number;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const RainCanvasOverlay: React.FC<RainCanvasOverlayProps> = ({ intensity, theme = 'dark' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (intensity === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Configuration based on intensity
    const dropCount = intensity === 'light' ? 80 : intensity === 'heavy' ? 220 : 340;
    const baseSpeed = intensity === 'light' ? 12 : intensity === 'heavy' ? 22 : 28;
    const windAngle = 0.22; // slight diagonal tilt

    const drops: Drop[] = [];
    const splashes: Splash[] = [];

    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * (width + 200) - 100,
        y: Math.random() * height,
        len: 12 + Math.random() * (intensity === 'light' ? 14 : 26),
        speed: baseSpeed + Math.random() * 8,
        alpha: 0.25 + Math.random() * (intensity === 'light' ? 0.35 : 0.55),
        width: intensity === 'light' ? 1.0 : 1.6
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Rain color based on theme
      const rainRgb = theme === 'light' ? '14, 116, 144' : '186, 230, 253';

      // Draw and update drops
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * windAngle, d.y + d.len);
        ctx.strokeStyle = `rgba(${rainRgb}, ${d.alpha})`;
        ctx.lineWidth = d.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        d.x += d.speed * windAngle;
        d.y += d.speed;

        // Splash at ground / boundary
        if (d.y > height) {
          if (Math.random() < 0.35 && splashes.length < 40) {
            splashes.push({
              x: d.x,
              y: height - 4 - Math.random() * 20,
              radius: 1,
              maxRadius: 4 + Math.random() * 6,
              alpha: 0.5
            });
          }
          d.y = -20;
          d.x = Math.random() * (width + 200) - 100;
        }
      }

      // Draw ripples / splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.radius * 1.6, s.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rainRgb}, ${s.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        s.radius += 0.45;
        s.alpha -= 0.035;

        if (s.alpha <= 0 || s.radius >= s.maxRadius) {
          splashes.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity, theme]);

  if (intensity === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ mixBlendMode: theme === 'light' ? 'multiply' : 'screen' }}
    />
  );
};
