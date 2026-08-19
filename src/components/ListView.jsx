import React from 'react';
import { Plus, Settings, MessageCircle, Lock, Globe } from 'lucide-react';
import Header from './Header';
import { AvatarIcon } from './AvatarPicker';
import { rgba } from '../utils/colors';

const SURFACE = '#1D1E26';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ECEAF3';
const MUTED = '#8B8996';

export default function ListView({
  characters,
  buttonsColor,
  onOpen,
  onProfile,
  onCreate,
  onSettings,
}) {
  return (
   <div className="flex flex-col flex-1 min-h-0 relative">
      <Header
        title="Мої персонажі"
        right={
          <button
            onClick={onSettings}
            className="hidden md:flex p-2 rounded-full active:opacity-60"
            style={{ background: SURFACE }}
          >
            <Settings size={18} color={MUTED} />
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-24">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: rgba(buttonsColor, 0.14),
              }}
            >
              <MessageCircle
                size={26}
                color={buttonsColor}
              />
            </div>

            <p
              className="font-semibold"
              style={{
                fontFamily: 'Unbounded, sans-serif',
                color: TEXT,
              }}
            >
              Ще немає жодного персонажа
            </p>

            <p
              className="text-sm"
              style={{ color: MUTED }}
            >
              Створи першого — це займе хвилину.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {characters.map((c) => (
              <div
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="flex items-center gap-3 p-3 rounded-2xl text-left active:opacity-80 cursor-pointer"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <AvatarIcon
                  avatarType={c.avatarType}
                  avatarValue={c.avatarValue}
                  size={44}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onProfile(c.id);
                      }}
                      className="font-semibold text-sm truncate text-left"
                      style={{
                        fontFamily: 'Unbounded, sans-serif',
                        color: TEXT,
                      }}
                    >
                      {c.name}
                    </button>

                    {c.visibility === 'private' ? (
                      <Lock
                        size={11}
                        color={MUTED}
                      />
                    ) : (
                      <Globe
                        size={11}
                        color={MUTED}
                      />
                    )}
                  </div>

                  <div
                    className="text-xs truncate"
                    style={{ color: MUTED }}
                  >
                    {c.lastMessage || ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Кнопка створення — тільки desktop */}
      <button
        onClick={onCreate}
        className="hidden md:flex absolute bottom-6 right-5 w-14 h-14 rounded-full items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ background: buttonsColor }}
      >
        <Plus
          size={26}
          color="#0E0E12"
          strokeWidth={2.5}
        />
      </button>
    </div>
  );
}