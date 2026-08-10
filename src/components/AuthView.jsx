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
  const [mode, setMode] = useState('register'); // 'register' | 'login' | 'reset'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('female');
  const [avatarType, setAvatarType] = useState('icon');
  const [avatarValue, setAvatarValue] = useState('sparkles');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Стан для скидання пароля
  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function submit() {
    setError('');
    setMessage('');

    if (mode === 'reset') {
      if (resetStep === 1) {
        if (!email.trim()) {
          setError('Вкажи свій Email');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Помилка надсилання коду');
          setMessage(data.message || 'Якщо email є в системі, код відправлено!');
          setResetStep(2);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      } else {
        if (!resetCode.trim() || newPassword.length < 4) {
          setError('Введи код з пошти та новий пароль (мін. 4 символи)');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), code: resetCode.trim(), newPassword }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Помилка скидання пароля');
          setMessage('Пароль успішно змінено! Тепер можеш увійти.');
          setMode('login');
          setResetStep(1);
          setResetCode('');
          setNewPassword('');
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    if (!username.trim() || password.length < 4) {
      setError("Вкажи ім'я користувача та пароль (мінімум 4 символи)");
      return;
    }

    setLoading(true);
    try {
      const payload =
        mode === 'register'
          ? { username: username.trim(), password, email: email.trim(), gender, avatarType, avatarValue }
          : { username: username.trim(), password }; // При 'login' email не обов'язковий для сервера
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
          {mode === 'register' ? 'Створити акаунт' : mode === 'login' ? 'Вхід' : 'Відновлення'}
        </h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          {mode === 'register'
            ? 'Твої персонажі й діалоги збережуться на цьому акаунті.'
            : mode === 'login'
            ? 'Раді бачити знову.'
            : 'Введи email для скидання пароля.'}
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

        {mode !== 'reset' ? (
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: MUTED }}>Ім'я користувача</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="katya_92"
                className="px-4 py-3 rounded-xl outline-none text-sm"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>

            {/* Поле Email відображається і при реєстрації, і при вході (необов'язкове для входу) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: MUTED }}>
                Email {mode === 'login' ? '(необов\'язково)' : '(для відновлення)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="px-4 py-3 rounded-xl outline-none text-sm"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium" style={{ color: MUTED }}>Пароль</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); setMessage(''); setResetStep(1); }}
                    className="text-xs"
                    style={{ color: accent }}
                  >
                    Забули пароль?
                  </button>
                )}
              </div>
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
        ) : (
          /* Форма відновлення пароля */
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: MUTED }}>Ваш Email</label>
              <input
                type="email"
                value={email}
                disabled={resetStep === 2}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="px-4 py-3 rounded-xl outline-none text-sm disabled:opacity-50"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>

            {resetStep === 2 && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium" style={{ color: MUTED }}>Код відновлення</label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Код із пошти / сервера"
                    className="px-4 py-3 rounded-xl outline-none text-sm"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium" style={{ color: MUTED }}>Новий пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Новий пароль (мін. 4 символи)"
                    className="px-4 py-3 rounded-xl outline-none text-sm"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
                  />
                </div>
              </>
            )}
          </div>
        )}

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
        {message && <p className="text-xs mb-2" style={{ color: '#4E2' }}>{message}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50"
          style={{ background: accent, color: '#0E0E12', fontFamily: 'Unbounded, sans-serif' }}
        >
          {loading
            ? 'Зачекай...'
            : mode === 'register'
            ? 'Створити акаунт'
            : mode === 'login'
            ? 'Увійти'
            : resetStep === 1
            ? 'Отримати код'
            : 'Зберегти новий пароль'}
        </button>

        <button
          onClick={() => {
            if (mode === 'reset') {
              setMode('login');
            } else {
              setMode(mode === 'register' ? 'login' : 'register');
            }
            setError('');
            setMessage('');
          }}
          className="text-xs"
          style={{ color: MUTED }}
        >
          {mode === 'reset'
            ? 'Назад до входу'
            : mode === 'register'
            ? 'Вже є акаунт? Увійти'
            : 'Ще немає акаунту? Зареєструватись'}
        </button>
      </div>

      {pickerOpen && (
        <AvatarPicker selected={avatarValue} onSelect={(v) => { setAvatarValue(v); setAvatarType('icon'); }} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}