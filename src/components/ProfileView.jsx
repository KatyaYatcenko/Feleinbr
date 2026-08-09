import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Lock, Globe, Pencil, UploadCloud } from 'lucide-react';
import Header from './Header';
import AvatarPicker, { AvatarIcon } from './AvatarPicker';
import { api, API_URL } from '../api/client';

const SURFACE = '#1D1E26';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

export default function ProfileView({ character, onBack, onChat, onSave }) {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  const [visibility, setVisibility] = useState(character.visibility);
  const [avatarType, setAvatarType] = useState(character.avatarType);
  const [avatarValue, setAvatarValue] = useState(character.avatarValue);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isOwner = character.isOwner;
  const canEdit = isOwner;

  async function handleUpload(file) {
    setUploading(true);
    setError(null);
    try {
      const { url } = await api.uploadFile(file);
      setAvatarType('photo');
      setAvatarValue(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Помилка завантаження');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const { character: updated } = await api.updateCharacter(character.id, {
        name: name.trim(),
        description: description.trim(),
        avatarType,
        avatarValue,
        visibility,
      });
      onSave(updated);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Профіль персонажа" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden">
              {avatarType === 'photo' ? (
                <img
                  src={avatarValue?.startsWith('http') ? avatarValue : `${API_URL}${avatarValue}`}
                  onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  alt="Avatar"
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                <AvatarIcon avatarType={avatarType} avatarValue={avatarValue} size={80} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold truncate" style={{ color: TEXT, fontFamily: 'Unbounded, sans-serif' }}>
                {character.name}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                {visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                <span>{visibility === 'private' ? 'Приватний' : 'Публічний'}</span>
              </div>
            </div>
          </div>

          {!canEdit && (
            <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4">
              <div className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: MUTED }}>
                Опис персонажа
              </div>
              <div className="text-sm leading-6" style={{ color: TEXT }}>
                {description}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4 flex flex-col gap-4">
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#24252E', color: TEXT }}
              >
                <Pencil size={16} /> Обрати іконку
              </button>
              <button
                onClick={() => document.getElementById('profile-avatar-upload')?.click()}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#24252E', color: TEXT }}
                disabled={uploading}
              >
                <UploadCloud size={16} /> {uploading ? 'Завантаження...' : 'Завантажити фото'}
              </button>
              <input
                id="profile-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />

              <div className="grid gap-3">
                <label className="text-xs font-medium" style={{ color: MUTED }}>Ім’я персонажа</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl outline-none text-sm"
                  style={{ background: '#14151B', border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div className="grid gap-3">
                <label className="text-xs font-medium" style={{ color: MUTED }}>Опис персонажа</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl outline-none text-sm resize-none"
                  style={{ background: '#14151B', border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium" style={{ color: MUTED }}>Видимість</label>
                <div className="flex gap-2">
                  {['private', 'public'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setVisibility(option)}
                      className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                      style={{
                        background: visibility === option ? '#FF5D8F' : '#24252E',
                        color: visibility === option ? '#0E0E12' : TEXT,
                      }}
                    >
                      {option === 'private' ? 'Приватний' : 'Публічний'}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm" style={{ color: '#FF6B6B' }}>{error}</div>}
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-col md:flex-row">
          <button
            onClick={handleSave}
            disabled={!canEdit || saving}
            className="w-full py-3.5 rounded-xl font-semibold text-sm"
            style={{ background: canEdit ? '#FF5D8F' : '#24252E', color: '#0E0E12' }}
          >
            {saving ? 'Зберігаю...' : 'Зберегти зміни'}
          </button>
          <button
            onClick={onChat}
            className="w-full py-3.5 rounded-xl font-semibold text-sm"
            style={{ background: '#3B3D4F', color: TEXT }}
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle size={16} /> Перейти в чат
            </span>
          </button>
        </div>
      </div>

      {pickerOpen && (
        <AvatarPicker
          selected={avatarType === 'icon' ? avatarValue : null}
          onSelect={(value) => {
            setAvatarType('icon');
            setAvatarValue(value);
          }}
          onUploadPhoto={(file) => handleUpload(file)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
