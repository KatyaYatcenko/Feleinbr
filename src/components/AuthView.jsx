import React, { useState } from 'react';
import AvatarPicker, { AvatarIcon } from './AvatarPicker';
import { api, setToken } from '../api/client';

const SURFACE = '#1D1E26';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

const GENDERS = [
  { id: 'female', label: 'Жіноча' },
  { id: 'male', label: 'Чоловіча' },
  { id: 'other', label: 'Інша / не вказувати' },
];

export default function AuthView({ accent, onAuthed }) {
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('female');
  const [avatarType, setAvatarType] = useState('icon');
  const [avatarValue, setAvatarValue] = useState('sparkles');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!username.trim() || password.length < 4) {
      setError("Вкажи ім'я користувача та пароль (мінімум 4 символи)");
      return;
    }
    setLoading(true);
    try {
      const payload =
        mode === 'register'
          ? { username: username.trim(), password, gender, avatarType, avatarValue }
          : { username: username.trim(), password };
      const data = await api[mode](payload);
      setToken(data.token);
      onAuthed(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full px-5 py-8 justify-between overflow-y-auto">
      <div>
        <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'Unbounded, sans-serif', color: TEXT }}>
          {mode === 'register' ? 'Створити акаунт' : 'Вхід'}
        </h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          {mode === 'register'
            ? 'Твої персонажі й діалоги збережуться на цьому акаунті.'
            : 'Раді бачити знову.'}
        </p>

        {mode === 'register' && (
          <div className="flex flex-col items-center mb-6">
            <button onClick={() => setPickerOpen(true)} className="active:scale-95 transition-transform">
              <AvatarIcon avatarType={avatarType} avatarValue={avatarValue} size={72} />
            </button>
            <button onClick={() => setPickerOpen(true)} className="text-xs mt-2" style={{ color: accent }}>
              Обрати аватарку
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: MUTED }}>Ім'я користувача</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mariia_92"
              className="px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: MUTED }}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Мінімум 4 символи"
              className="px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
        </div>

        {mode === 'register' && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-xs font-medium" style={{ color: MUTED }}>Стать</label>
            <div className="flex flex-col gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left"
                  style={{
                    background: gender === g.id ? 'rgba(255,255,255,0.06)' : SURFACE,
                    border: gender === g.id ? `1px solid ${accent}` : `1px solid ${BORDER}`,
                    color: TEXT,
                  }}
                >
                  {g.label}
                  {gender === g.id && <span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs mb-2" style={{ color: '#FF6B6B' }}>{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50"
          style={{ background: accent, color: '#0E0E12', fontFamily: 'Unbounded, sans-serif' }}
        >
          {loading ? 'Зачекай...' : mode === 'register' ? 'Створити акаунт' : 'Увійти'}
        </button>
        <button
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
          className="text-xs"
          style={{ color: MUTED }}
        >
          {mode === 'register' ? 'Вже є акаунт? Увійти' : 'Ще немає акаунту? Зареєструватись'}
        </button>
      </div>

      {pickerOpen && (
        <AvatarPicker selected={avatarValue} onSelect={(v) => { setAvatarValue(v); setAvatarType('icon'); }} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
