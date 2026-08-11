import React from 'react';
import { MessageCircle, Plus, Settings } from 'lucide-react';

const BORDER = 'rgba(255,255,255,0.08)';
const MUTED = '#8B8996';

export default function BottomNav({
  buttonsColor,
  onChats,
  onCreate,
  onSettings,
}) {
  return (
    <div
      className="md:hidden shrink-0 h-16 flex items-center justify-around relative"
      style={{
        background: '#14151B',
        borderTop: `1px solid ${BORDER}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(4rem + env(safe-area-inset-bottom))',
      }}
    >
      <button
        onClick={onChats}
        className="flex flex-col items-center justify-center gap-1 w-20 h-full"
      >
        <MessageCircle size={20} color={buttonsColor} />
        <span className="text-[10px]" style={{ color: MUTED }}>
          Чати
        </span>
      </button>

      <button
        onClick={onCreate}
        className="w-12 h-12 rounded-full flex items-center justify-center -mt-5"
        style={{ background: buttonsColor }}
      >
        <Plus size={25} color="#0E0E12" />
      </button>

      <button
        onClick={onSettings}
        className="flex flex-col items-center justify-center gap-1 w-20 h-full"
      >
        <Settings size={20} color={MUTED} />
        <span className="text-[10px]" style={{ color: MUTED }}>
          Налаштування
        </span>
      </button>
    </div>
  );
}