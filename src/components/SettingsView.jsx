import React, { useState, useEffect } from 'react';
import { Check, UploadCloud, Download, CheckCircle2 } from 'lucide-react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import Header from './Header';
import AvatarPicker, { AvatarIcon } from './AvatarPicker';
import { api, API_URL } from '../api/client';
import { isValidHex } from '../utils/colors';

const SURFACE = '#1D1E26';
const SURFACE_2 = '#24252E';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

const PRESETS = [
  '#FF5D8F',
  '#6C7BFF',
  '#3DDC97',
  '#FFB84D',
  '#B98CFF',
  '#4FD1FF',
];

function ColorRow({ label, value, onChange }) {
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  return (
    <div>
      <p
        className="text-xs font-medium mb-3"
        style={{ color: MUTED }}
      >
        {label}
      </p>

      <div className="flex flex-wrap gap-2.5 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              onChange(p);
              setHexInput(p);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: p,
              border:
                value === p
                  ? '2px solid white'
                  : '2px solid transparent',
            }}
          >
            {value === p && (
              <Check
                size={14}
                color="#0E0E12"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-lg shrink-0 transition-colors"
          style={{
            background: isValidHex(hexInput)
              ? hexInput
              : SURFACE,
            border: `1px solid ${BORDER}`,
          }}
        />

        <HexColorInput
          value={hexInput}
          onChange={(color) => {
            setHexInput(color);
            if (isValidHex(color)) {
              onChange(color);
            }
          }}
          prefixed
          placeholder="#FF5D8F"
          className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            color: TEXT,
          }}
        />

        <button
          type="button"
          onClick={() =>
            isValidHex(hexInput) &&
            onChange(hexInput)
          }
          disabled={!isValidHex(hexInput)}
          className="px-3 rounded-lg text-sm font-semibold disabled:opacity-40"
          style={{
            background: SURFACE_2,
            color: TEXT,
            border: `1px solid ${BORDER}`,
          }}
        >
          OK
        </button>
      </div>

      <div
        className="rounded-2xl p-2"
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
        }}
      >
        <HexColorPicker
          color={
            isValidHex(hexInput)
              ? hexInput
              : '#ffffff'
          }
          onChange={(color) => {
            setHexInput(color);
            onChange(color);
          }}
        />
      </div>
    </div>
  );
}

export default function SettingsView({
  theme,
  setTheme,
  onBack,
  onLogout,
  user,
  onUpdateUser,
  promptEvent,
  promptInstall,
  isInstalled,
}) {
  const [username, setUsername] = useState(
    user?.username || ''
  );
  const [emailInput, setEmailInput] = useState(
    user?.email || ''
  );
  const [gender, setGender] = useState(
    user?.gender || 'other'
  );
  const [avatarType, setAvatarType] = useState(
    user?.avatarType || 'icon'
  );
  const [avatarValue, setAvatarValue] = useState(
    user?.avatarValue || 'sparkles'
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingProfile, setSavingProfile] =
    useState(false);
  const [profileError, setProfileError] =
    useState(null);
  const [uploading, setUploading] =
    useState(false);

  const [savingEmail, setSavingEmail] =
    useState(false);
  const [emailStatus, setEmailStatus] =
    useState(null);

  useEffect(() => {
    if (user) {
      if (user.username)
        setUsername(user.username);

      if (user.email !== undefined)
        setEmailInput(user.email || '');

      if (user.gender)
        setGender(user.gender);

      if (user.avatarType)
        setAvatarType(user.avatarType);

      if (user.avatarValue)
        setAvatarValue(user.avatarValue);
    }
  }, [user]);

  async function handleProfileUpload(file) {
    setUploading(true);
    setProfileError(null);

    try {
      const { url } =
        await api.uploadFile(file);

      setAvatarType('photo');
      setAvatarValue(url);
    } catch (err) {
      console.error(err);
      setProfileError(
        err.message ||
          'Помилка завантаження фото'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleProfileSave() {
    if (!username.trim()) {
      setProfileError(
        'Потрібно ім’я користувача'
      );
      return;
    }

    setSavingProfile(true);
    setProfileError(null);

    try {
      const { user: updated } =
        await api.updateUserProfile({
          username: username.trim(),
          gender,
          avatarType,
          avatarValue,
          email:
            emailInput.trim() || undefined,
        });

      onUpdateUser?.(updated);
      setProfileError('Профіль оновлено');
    } catch (err) {
      console.error(err);
      setProfileError(
        err.message ||
          'Помилка оновлення профілю'
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdateEmail() {
    if (!emailInput.trim()) {
      setEmailStatus('Вкажіть пошту');
      return;
    }

    setSavingEmail(true);
    setEmailStatus(null);

    try {
      const { user: updated } =
        await api.updateUserProfile({
          username,
          gender,
          avatarType,
          avatarValue,
          email: emailInput.trim(),
        });

      onUpdateUser?.(updated);
      setEmailStatus(
        'Email успішно збережено!'
      );
    } catch (err) {
      setEmailStatus(
        err.message ||
          'Не вдалося зберегти Email'
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleInstall() {
    if (!promptInstall) return;

    try {
      await promptInstall();
    } catch (err) {
      console.error(
        'Install prompt error:',
        err
      );
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Налаштування"
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-7">

        {/* Блок профілю */}
        <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4 flex flex-col gap-4">
          <div
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: MUTED }}
          >
            Мій профіль
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[#14151B] flex items-center justify-center shrink-0">
              {avatarType === 'photo' ? (
                <img
                  src={
                    avatarValue?.startsWith(
                      'http'
                    )
                      ? avatarValue
                      : `${API_URL}${avatarValue}`
                  }
                  onError={(e) => {
                    e.target.src =
                      '/default-avatar.png';
                  }}
                  alt="Avatar"
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                <AvatarIcon
                  avatarType={avatarType}
                  avatarValue={avatarValue}
                  size={80}
                />
              )}
            </div>

            <div className="flex-1 grid gap-3">
              <div>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: MUTED }}
                >
                  Ім’я
                </p>

                <input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-2xl outline-none text-sm"
                  style={{
                    background: '#14151B',
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
                  }}
                />
              </div>

              <div>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: MUTED }}
                >
                  Стать
                </p>

                <div className="flex gap-2">
                  {[
                    'female',
                    'male',
                    'other',
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setGender(option)
                      }
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors"
                      style={{
                        background:
                          gender === option
                            ? '#FF5D8F'
                            : '#24252E',
                        color:
                          gender === option
                            ? '#0E0E12'
                            : TEXT,
                      }}
                    >
                      {option === 'female'
                        ? 'Жіноча'
                        : option === 'male'
                        ? 'Чоловіча'
                        : 'Інша'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() =>
                setPickerOpen(true)
              }
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity active:opacity-80"
              style={{
                background: '#24252E',
                color: TEXT,
              }}
            >
              Обрати іконку
            </button>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(
                    'settings-avatar-upload'
                  )
                  ?.click()
              }
              disabled={uploading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity active:opacity-80 disabled:opacity-50"
              style={{
                background: '#24252E',
                color: TEXT,
              }}
            >
              <UploadCloud
                size={16}
                className="inline-block mr-2"
              />

              {uploading
                ? 'Завантаження...'
                : 'Завантажити фото'}
            </button>

            <input
              id="settings-avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file =
                  e.target.files?.[0];

                if (file) {
                  handleProfileUpload(file);
                }

                e.target.value = '';
              }}
            />
          </div>

          {pickerOpen && (
            <AvatarPicker
              selected={
                avatarType === 'icon'
                  ? avatarValue
                  : null
              }
              onSelect={(value) => {
                setAvatarType('icon');
                setAvatarValue(value);
              }}
              onUploadPhoto={(file) =>
                handleProfileUpload(file)
              }
              onClose={() =>
                setPickerOpen(false)
              }
            />
          )}

          {profileError && (
            <div
              className="text-sm font-medium"
              style={{
                color:
                  profileError ===
                  'Профіль оновлено'
                    ? '#8AE586'
                    : '#FF6B6B',
              }}
            >
              {profileError}
            </div>
          )}

          <button
            type="button"
            onClick={handleProfileSave}
            disabled={savingProfile}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity active:opacity-90 disabled:opacity-50"
            style={{
              background: '#FF5D8F',
              color: '#0E0E12',
            }}
          >
            {savingProfile
              ? 'Зберігаю...'
              : 'Зберегти профіль'}
          </button>
        </div>

        {/* Email */}
        <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4 flex flex-col gap-3">
          <div
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: MUTED }}
          >
            Прив’язати / Змінити Email
          </div>

          <p
            className="text-xs"
            style={{ color: MUTED }}
          >
            Email потрібен для швидкого
            відновлення доступу, якщо
            забудеться пароль.
          </p>

          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) =>
                setEmailInput(e.target.value)
              }
              placeholder="example@gmail.com"
              className="flex-1 px-4 py-3 rounded-2xl outline-none text-sm"
              style={{
                background: '#14151B',
                border: `1px solid ${BORDER}`,
                color: TEXT,
              }}
            />

            <button
              type="button"
              onClick={handleUpdateEmail}
              disabled={savingEmail}
              className="px-5 py-3 rounded-2xl font-semibold text-sm disabled:opacity-50 shrink-0 transition-opacity"
              style={{
                background: '#FF5D8F',
                color: '#0E0E12',
              }}
            >
              {savingEmail ? '...' : 'Зберегти'}
            </button>
          </div>

          {emailStatus && (
            <p
              className="text-xs font-medium"
              style={{
                color:
                  emailStatus.includes(
                    'успішно'
                  )
                    ? '#8AE586'
                    : '#FF6B6B',
              }}
            >
              {emailStatus}
            </p>
          )}
        </div>

        {/* Встановлення застосунку */}
        <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4 flex flex-col gap-4">
          <div
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: MUTED }}
          >
            Застосунок
          </div>

          <div>
            <div
              className="text-base font-semibold mb-1"
              style={{ color: TEXT }}
            >
              Фелейнбр на твоєму пристрої
            </div>

            <p
              className="text-xs leading-relaxed"
              style={{ color: MUTED }}
            >
              Встанови Фелейнбр на телефон,
              планшет або комп’ютер, щоб
              відкривати його як окремий
              застосунок.
            </p>
          </div>

          {isInstalled ? (
            <div
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{
                background: '#24252E',
                color: '#8AE586',
                border: `1px solid ${BORDER}`,
              }}
            >
              <CheckCircle2 size={17} />
              Фелейнбр уже встановлено
            </div>
          ) : promptEvent ? (
            <button
              type="button"
              onClick={handleInstall}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity active:opacity-80"
              style={{
                background: '#FF5D8F',
                color: '#0E0E12',
              }}
            >
              <Download size={17} />
              Встановити Фелейнбр
            </button>
          ) : (
            <div
              className="rounded-2xl p-3 text-xs leading-relaxed"
              style={{
                background: '#14151B',
                border: `1px solid ${BORDER}`,
                color: MUTED,
              }}
            >
              Якщо браузер не показує
              автоматичне встановлення,
              відкрий меню браузера та
              обери{' '}
              <span style={{ color: TEXT }}>
                «Встановити застосунок»
              </span>{' '}
              або{' '}
              <span style={{ color: TEXT }}>
                «Додати на головний екран»
              </span>.
            </div>
          )}
        </div>

        {/* Кольори */}
        <ColorRow
          label="Колір кнопок"
          value={theme.buttonsColor}
          onChange={(c) =>
            setTheme((t) => ({
              ...t,
              buttonsColor: c,
            }))
          }
        />

        <ColorRow
          label="Колір твоїх повідомлень"
          value={theme.userBubbleColor}
          onChange={(c) =>
            setTheme((t) => ({
              ...t,
              userBubbleColor: c,
            }))
          }
        />

        <ColorRow
          label="Колір повідомлень персонажа"
          value={theme.characterBubbleColor}
          onChange={(c) =>
            setTheme((t) => ({
              ...t,
              characterBubbleColor: c,
            }))
          }
        />

        {/* Попередній перегляд */}
        <div>
          <p
            className="text-xs font-medium mb-3"
            style={{ color: MUTED }}
          >
            Попередній перегляд
          </p>

          <div
            className="flex flex-col gap-2 p-3 rounded-2xl"
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div className="flex justify-start">
              <div
                className="px-3.5 py-2 rounded-2xl text-sm"
                style={{
                  background:
                    theme.characterBubbleColor,
                  color: '#0E0E12',
                  borderBottomLeftRadius: 6,
                }}
              >
                Привіт! Як справи?
              </div>
            </div>

            <div className="flex justify-end">
              <div
                className="px-3.5 py-2 rounded-2xl text-sm"
                style={{
                  background:
                    theme.userBubbleColor,
                  color: '#0E0E12',
                  borderBottomRightRadius: 6,
                }}
              >
                Все чудово, дякую!
              </div>
            </div>

            <button
              type="button"
              className="self-start px-4 py-2 rounded-full text-xs font-semibold mt-1"
              style={{
                background:
                  theme.buttonsColor,
                color: '#0E0E12',
              }}
            >
              Приклад кнопки
            </button>
          </div>
        </div>

        {/* Вихід */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3 rounded-xl text-sm font-semibold mt-2 active:opacity-80 transition-opacity"
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              color: '#FF6B6B',
            }}
          >
            Вийти з акаунту
          </button>
        )}
      </div>
    </div>
  );
}