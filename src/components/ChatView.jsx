import React, { useRef, useState } from 'react';
import { ArrowLeft, Trash2, Send, Image as ImageIcon, X, Lock, Globe } from 'lucide-react';
import { AvatarIcon } from './AvatarPicker';
import { rgba } from '../utils/colors';
import { api, API_URL } from '../api/client';

const SURFACE = '#1D1E26';
const SURFACE_2 = '#24252E';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

export default function ChatView({
  character, user, buttonsColor, userBubbleColor, characterBubbleColor,
  messages, loading, input, setInput, onSend, onBack, onDelete, scrollRef,
}) {
  const fileInputRef = useRef(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadFile(file);
      setPendingImage(url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleSend() {
    onSend(pendingImage);
    setPendingImage(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full active:opacity-60 md:hidden">
            <ArrowLeft size={20} color={TEXT} />
          </button>
          <div className="relative w-10 h-10 shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: rgba(characterBubbleColor, 0.5), animation: 'aura-pulse 2.8s ease-in-out infinite', filter: 'blur(6px)' }}
            />
            <div className="relative">
              <AvatarIcon avatarType={character.avatarType} avatarValue={character.avatarValue} size={40} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ fontFamily: 'Unbounded, sans-serif', color: TEXT }}>
              {character.name}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>{loading ? 'друкує...' : 'у мережі'}</div>
          </div>
        </div>
        {character.isOwner && (
          <button onClick={onDelete} className="p-2 rounded-full active:opacity-60">
            <Trash2 size={17} color={MUTED} />
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="rounded-3xl border border-white/10 bg-[#1D1E26] p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden">
              <AvatarIcon avatarType={character.avatarType} avatarValue={character.avatarValue} size={56} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="font-semibold text-lg truncate" style={{ fontFamily: 'Unbounded, sans-serif', color: TEXT }}>
                  {character.name}
                </div>
                {character.visibility === 'private' ? (
                  <Lock size={14} color={MUTED} />
                ) : (
                  <Globe size={14} color={MUTED} />
                )}
              </div>
              <div className="text-xs leading-5" style={{ color: MUTED }}>
                {character.description}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <div className="text-center text-xs py-8" style={{ color: MUTED }}>
            Напиши перше повідомлення, щоб почати діалог
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <AvatarIcon avatarType={character.avatarType} avatarValue={character.avatarValue} size={24} />}
            <div
              className="max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden"
              style={
                m.role === 'user'
                  ? { background: userBubbleColor, color: '#0E0E12', borderBottomRightRadius: 6 }
                  : { background: characterBubbleColor, color: '#0E0E12', borderBottomLeftRadius: 6 }
              }
            >
              {m.imageUrl && (
                <img
                  src={m.imageUrl.startsWith('/') ? `${API_URL}${m.imageUrl}` : m.imageUrl}
                  alt=""
                  className="w-full max-h-64 object-cover"
                />
              )}
              {m.content && <div className="px-3.5 py-2.5 whitespace-pre-wrap">{m.content}</div>}
            </div>
            {m.role === 'user' && <AvatarIcon avatarType={user.avatarType} avatarValue={user.avatarValue} size={24} />}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <AvatarIcon avatarType={character.avatarType} avatarValue={character.avatarValue} size={24} />
            <div className="px-4 py-3 rounded-2xl flex gap-1 items-center" style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderBottomLeftRadius: 6 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: MUTED, animation: `aura-pulse 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
        {pendingImage && (
          <div className="px-3 pt-3 flex items-center gap-2">
            <div className="relative">
              <img src={pendingImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}
              >
                <X size={11} color={MUTED} />
              </button>
            </div>
          </div>
        )}
        <div className="px-3 py-3 flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <ImageIcon size={17} color={MUTED} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAttach} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Напиши повідомлення..."
            className="flex-1 px-4 py-3 rounded-full outline-none text-sm"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingImage) || loading}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: buttonsColor }}
          >
            <Send size={17} color="#0E0E12" />
          </button>
        </div>
      </div>
    </div>
  );
}
