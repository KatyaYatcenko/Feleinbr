import React, { useState } from 'react';
import { Lock, Globe } from 'lucide-react';
import Header from './Header';
import AvatarPicker, { AvatarIcon } from './AvatarPicker';
import { api } from '../api/client';

const SURFACE = '#1D1E26';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

export default function CreateView({ buttonsColor, onBack, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarType, setAvatarType] = useState('icon');
  const [avatarValue, setAvatarValue] = useState('cat');
  const [visibility, setVisibility] = useState('private');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUploadPhoto(file) {
    setUploading(true);
    setError('');
    try {
      const { url } = await api.uploadFile(file);
      setAvatarType('photo');
      setAvatarValue(url);
      setPickerOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Новий персонаж" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => setPickerOpen(true)} className="active:scale-95 transition-transform">
            <AvatarIcon avatarType={avatarType} avatarValue={avatarValue} size={64} />
          </button>
          <button onClick={() => setPickerOpen(true)} className="text-xs" style={{ color: buttonsColor }}>
            {uploading ? 'Завантаження...' : 'Обрати аватарку'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: MUTED }}>Ім'я персонажа</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наприклад, Ліна"
            className="px-4 py-3 rounded-xl outline-none text-sm"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: MUTED }}>Опис характеру</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Яка вона, про що любить говорити, який в неї гумор і манера спілкування..."
            rows={6}
            className="px-4 py-3 rounded-xl outline-none text-sm resize-none"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <p className="text-xs" style={{ color: MUTED }}>
            Персонаж спілкуватиметься живою мовою, без описів дій у зірочках — як у звичайному чаті.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: MUTED }}>Доступ</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setVisibility('private')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
              style={{
                background: visibility === 'private' ? 'rgba(255,255,255,0.06)' : SURFACE,
                border: visibility === 'private' ? `1px solid ${buttonsColor}` : `1px solid ${BORDER}`,
              }}
            >
              <Lock size={16} color={visibility === 'private' ? buttonsColor : MUTED} />
              <span className="text-xs font-medium" style={{ color: TEXT }}>Приватний</span>
              <span className="text-[10px] px-2 text-center" style={{ color: MUTED }}>Бачиш лише ти</span>
            </button>
            <button
              onClick={() => setVisibility('public')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
              style={{
                background: visibility === 'public' ? 'rgba(255,255,255,0.06)' : SURFACE,
                border: visibility === 'public' ? `1px solid ${buttonsColor}` : `1px solid ${BORDER}`,
              }}
            >
              <Globe size={16} color={visibility === 'public' ? buttonsColor : MUTED} />
              <span className="text-xs font-medium" style={{ color: TEXT }}>Публічний</span>
              <span className="text-[10px] px-2 text-center" style={{ color: MUTED }}>Бачать усі користувачі</span>
            </button>
          </div>
        </div>

        {error && <p className="text-xs" style={{ color: '#FF6B6B' }}>{error}</p>}
      </div>
      <div className="px-4 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={() =>
            name.trim() && description.trim() &&
            onCreate({ name: name.trim(), description: description.trim(), avatarType, avatarValue, visibility })
          }
          disabled={!name.trim() || !description.trim()}
          className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40"
          style={{ background: buttonsColor, color: '#0E0E12', fontFamily: 'Unbounded, sans-serif' }}
        >
          Створити персонажа
        </button>
      </div>

      {pickerOpen && (
        <AvatarPicker
          selected={avatarType === 'icon' ? avatarValue : null}
          onSelect={(v) => { setAvatarType('icon'); setAvatarValue(v); setPickerOpen(false); }}
          onUploadPhoto={handleUploadPhoto}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
