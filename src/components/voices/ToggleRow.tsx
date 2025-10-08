import React from 'react';

export interface ToggleRowProps { label: string; description?: string; value: boolean; onChange: (v:boolean)=> void; }
export const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none group">
    <div className="pt-0.5 space-y-1">
      <p className="text-xs font-medium text-card-foreground leading-tight">{label}</p>
      {description && <p className="text-[10px] text-card-foreground/60 max-w-sm leading-snug">{description}</p>}
    </div>
    <div className="ml-auto pt-0.5">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={()=> onChange(!value)}
        className={`h-5 w-9 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${value ? 'bg-primary' : 'bg-input-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
        <span className="sr-only">Toggle {label}</span>
      </button>
    </div>
  </label>
);

export default ToggleRow;