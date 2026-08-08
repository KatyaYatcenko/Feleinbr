import React from 'react';
import {
  Cat, Dog, Bird, Fish, Ghost, Rabbit, Turtle, Bug,
  Flame, Moon, Sun, Star, Cloud, Sparkles, Crown, Flower2, X,
} from 'lucide-react';
import { API_URL } from '../api/client';
import { AVATAR_GALLERY } from '../data/avatars';

const ICONS = { Cat, Dog, Bird, Fish, Ghost, Rabbit, Turtle, Bug, Flame, Moon, Sun, Star, Cloud, Sparkles, Crown, Flower2 };

// avatarType: 'icon' (avatarValue = id з галереї) або 'photo' (avatarValue = URL завантаженого фото)
export function AvatarIcon({ avatarType = 'icon', avatarValue = 'sparkles', avatarId, size = 40 }) {
  const value = avatarValue || avatarId; // avatarId лишено для сумісності зі старими викликами

  if (avatarType === 'photo' && value) {
    return (
      <img
        src={value && value.startsWith('/') ? `${API_URL}${value}` : value}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  const avatar = AVATAR_GALLERY.find((a) => a.id === value) || AVATAR_GALLERY[0];
  const Icon = ICONS[avatar.icon];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: avatar.color }}
    >
      <Icon size={size * 0.55} color="#0E0E12" strokeWidth={2.2} />
    </div>
  );
}

export default function AvatarPicker({ selected, onSelect, onUploadPhoto, onClose }) {
  const fileInputRef = React.useRef(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: '#1D1E26', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm" style={{ fontFamily: 'Unbounded, sans-serif', color: '#ECEAF3' }}>
            Обери аватарку
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full active:opacity-60">
            <X size={18} color="#8B8996" />
          </button>
        </div>

        {onUploadPhoto && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mb-4 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: '#24252E', color: '#ECEAF3', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Завантажити своє фото
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadPhoto(file);
                e.target.value = '';
              }}
            />
          </>
        )}

        <div className="grid grid-cols-4 gap-3 pb-2">
          {AVATAR_GALLERY.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onSelect(a.id);
                onClose();
              }}
              className="flex items-center justify-center p-2 rounded-2xl active:scale-90 transition-transform"
              style={{
                background: selected === a.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: selected === a.id ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              }}
            >
              <AvatarIcon avatarId={a.id} size={44} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
