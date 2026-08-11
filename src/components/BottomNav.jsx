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
  className={`${
    view === 'list'
      ? 'flex'
      : 'hidden'
  } md:flex flex-col w-full md:w-[340px] md:shrink-0`}
  style={{
    background: BG,
    borderRight: '1px solid rgba(255,255,255,0.08)',
  }}
>
  <div className="hidden md:block px-4 pt-4">
    <span
      className="text-[11px] font-bold tracking-[0.18em]"
      style={{
        color: theme.buttonsColor,
        fontFamily: 'Unbounded, sans-serif',
      }}
    >
      ФЕЛЕЙНБР
    </span>
  </div>

  <ListView
    characters={characters}
    buttonsColor={theme.buttonsColor}
    onOpen={(id) => {
      setActiveCharacter(id);
      setView('chat');
    }}
    onProfile={(id) => {
      setActiveCharacter(id);
      setView('profile');
    }}
    onCreate={() => setView('create')}
    onSettings={() => setView('settings')}
  />

  <BottomNav
    buttonsColor={theme.buttonsColor}
    onChats={() => setView('list')}
    onCreate={() => setView('create')}
    onSettings={() => setView('settings')}
  />
</div>
  );
}