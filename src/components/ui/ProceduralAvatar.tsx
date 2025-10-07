import React from 'react';

interface ProceduralAvatarProps {
  seed: string;
  className?: string;
}

// Procedural avatar (abstract waveform) — deterministic from seed
export const ProceduralAvatar: React.FC<ProceduralAvatarProps> = ({ seed, className }) => {
  const hash = Array.from(seed).reduce((a,c)=> (a*33 + c.charCodeAt(0))>>>0, 5381);
  const bars = Array.from({ length: 12 }, (_,i) => ((hash >> (i*2)) & 0x3F) / 63); // values 0..1
  const hueA = hash % 360;
  const hueB = (hash * 7) % 360;
  const gradA = `hsl(${hueA} 75% 55%)`;
  const gradB = `hsl(${hueB} 65% 45%)`;
  
  return (
    <div 
      className={`relative rounded-2xl p-2 flex items-center justify-center overflow-hidden ring-1 ring-white/10 shadow-inner ${className||''}`}
      style={{ background: `linear-gradient(135deg, ${gradA}, ${gradB})` }}
      aria-label="Procedural voice avatar"
    >
      <svg viewBox="0 0 60 60" className="w-full h-full opacity-90 mix-blend-screen">
        {bars.map((b,i)=> {
          const h = b*46 + 6;
          return <rect key={i} x={4+i*4} y={58-h} width={3} height={h} rx={1.5} fill="white" opacity={0.4 + b*0.5} />;
        })}
        <circle cx={30} cy={30} r={18} stroke="white" strokeWidth={1} opacity={0.18} fill="none" />
        <circle cx={30} cy={30} r={9} stroke="white" strokeWidth={0.8} opacity={0.22} fill="none" />
      </svg>
    </div>
  );
};