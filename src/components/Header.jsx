import React from 'react';
import { ArrowLeft } from 'lucide-react';

const TEXT = '#ECEAF3';
const BORDER = 'rgba(255,255,255,0.08)';

export default function Header({ title, onBack, right }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full active:opacity-60">
            <ArrowLeft size={20} color={TEXT} />
          </button>
        )}
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Unbounded, sans-serif', color: TEXT }}>
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}
