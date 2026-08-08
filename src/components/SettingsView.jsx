import React, { useState } from 'react';
import { Check } from 'lucide-react';
import Header from './Header';
import { isValidHex } from '../utils/colors';

const SURFACE = '#1D1E26';
const SURFACE_2 = '#24252E';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

const PRESETS = ['#FF5D8F', '#6C7BFF', '#3DDC97', '#FFB84D', '#B98CFF', '#4FD1FF'];

function ColorRow({ label, value, onChange }) {
  const [hexInput, setHexInput] = useState(value);

  return (
    <div>
      <p className="text-xs font-medium mb-3" style={{ color: MUTED }}>{label}</p>
      <div className="flex flex-wrap gap-2.5 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => { onChange(p); setHexInput(p); }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: p, border: value === p ? '2px solid white' : '2px solid transparent' }}
          >
            {value === p && <Check size={14} color="#0E0E12" />}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="w-9 h-9 rounded-lg shrink-0" style={{ background: isValidHex(hexInput) ? hexInput : SURFACE, border: `1px solid ${BORDER}` }} />
        <input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          placeholder="#FF5D8F"
          className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
        />
        <button
          onClick={() => isValidHex(hexInput) && onChange(hexInput)}
          disabled={!isValidHex(hexInput)}
          className="px-3 rounded-lg text-sm font-semibold disabled:opacity-40"
          style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function SettingsView({ theme, setTheme, onBack, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <Header title="Оформлення" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-7">
        <ColorRow
          label="Колір кнопок"
          value={theme.buttonsColor}
          onChange={(c) => setTheme((t) => ({ ...t, buttonsColor: c }))}
        />
        <ColorRow
          label="Колір твоїх повідомлень"
          value={theme.userBubbleColor}
          onChange={(c) => setTheme((t) => ({ ...t, userBubbleColor: c }))}
        />
        <ColorRow
          label="Колір повідомлень персонажа"
          value={theme.characterBubbleColor}
          onChange={(c) => setTheme((t) => ({ ...t, characterBubbleColor: c }))}
        />

        <div>
          <p className="text-xs font-medium mb-3" style={{ color: MUTED }}>Попередній перегляд</p>
          <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl text-sm" style={{ background: theme.characterBubbleColor, color: '#0E0E12', borderBottomLeftRadius: 6 }}>
                Привіт! Як справи?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="px-3.5 py-2 rounded-2xl text-sm" style={{ background: theme.userBubbleColor, color: '#0E0E12', borderBottomRightRadius: 6 }}>
                Все чудово, дякую!
              </div>
            </div>
            <button className="self-start px-4 py-2 rounded-full text-xs font-semibold mt-1" style={{ background: theme.buttonsColor, color: '#0E0E12' }}>
              Приклад кнопки
            </button>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-3 rounded-xl text-sm font-semibold mt-2"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: '#FF6B6B' }}
          >
            Вийти з акаунту
          </button>
        )}
      </div>
    </div>
  );
}
