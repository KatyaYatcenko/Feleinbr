import React from 'react';
import { ArrowLeft, MessageCircle, Lock, Globe } from 'lucide-react';
import Header from './Header';
import { AvatarIcon } from './AvatarPicker';

const SURFACE = '#1D1E26';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

export default function ProfileView({ character, onBack, onChat }) {
  return (
    <div className="flex flex-col h-full">
      <Header title="Профіль персонажа" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden">
            <AvatarIcon avatarType={character.avatarType} avatarValue={character.avatarValue} size={80} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold truncate" style={{ color: TEXT, fontFamily: 'Unbounded, sans-serif' }}>
              {character.name}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
              {character.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
              <span>{character.visibility === 'private' ? 'Приватний' : 'Публічний'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4">
          <div className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: MUTED }}>
            Опис персонажа
          </div>
          <div className="text-sm leading-6" style={{ color: TEXT }}>
            {character.description}
          </div>
        </div>

        <button
          onClick={onChat}
          className="w-full py-3.5 rounded-xl font-semibold text-sm"
          style={{ background: '#FF5D8F', color: '#0E0E12', fontFamily: 'Unbounded, sans-serif' }}
        >
          <span className="inline-flex items-center gap-2">
            <MessageCircle size={16} /> Перейти в чат
          </span>
        </button>
      </div>
    </div>
  );
}
