import React, { useState, useRef, useEffect, useCallback } from 'react';
import AuthView from './components/AuthView';
import ListView from './components/ListView';
import CreateView from './components/CreateView';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import { api, getToken, setToken } from './api/client';
import { useInstallPrompt } from './useInstallPrompt';

const BG = '#14151B';
const TEXT = '#ECEAF3';
const THEME_KEY = 'feleinbr_theme';

const DEFAULT_THEME = {
  buttonsColor: '#FF5D8F',
  userBubbleColor: '#FF5D8F',
  characterBubbleColor: '#24252E',
};

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_KEY));
    return saved ? { ...DEFAULT_THEME, ...saved } : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('list');
  const [characters, setCharacters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const ACTIVE_CHARACTER_KEY = 'feleinbr_active_character';
  const [theme, setThemeState] = useState(loadTheme);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const activeChar = characters.find((c) => c.id === activeId);
  const { promptEvent, promptInstall } = useInstallPrompt();

  function setTheme(updater) {
    setThemeState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(THEME_KEY, JSON.stringify(next));
      return next;
    });
  }

  const loadCharacters = useCallback(async () => {
    const { characters } = await api.getCharacters();
    setCharacters(characters);
  }, []);

  // Перевірка токена при завантаженні застосунку
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setUser(user);
        } catch {
          setToken(null);
        }
      }
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (user) loadCharacters().catch(console.error);
  }, [user, loadCharacters]);

  useEffect(() => {
    if (!user || characters.length === 0) return;
    const savedId = Number(localStorage.getItem(ACTIVE_CHARACTER_KEY));
    const existing = characters.find((c) => c.id === savedId);
    if (existing) {
      setActiveId(savedId);
      return;
    }
    if (characters.length > 0 && activeId === null) {
      setActiveId(characters[0].id);
    }
  }, [user, characters]);

  useEffect(() => {
    if (!activeChar) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    api.getMessages(activeChar.id).then(({ messages }) => {
      if (!cancelled) setMessages(messages);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [activeChar?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  function setActiveCharacter(id) {
    setActiveId(id);
    if (id == null) {
      localStorage.removeItem(ACTIVE_CHARACTER_KEY);
    } else {
      localStorage.setItem(ACTIVE_CHARACTER_KEY, id);
    }
  }

  async function handleCreateCharacter(payload) {
    const { character } = await api.createCharacter(payload);
    setCharacters((prev) => [character, ...prev]);
    setActiveCharacter(character.id);
    setView('chat');
  }

  async function deleteCharacter(id) {
    await api.deleteCharacter(id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveCharacter(null);
      setView('list');
    }
  }

  async function handleSend(imageUrl) {
    if ((!input.trim() && !imageUrl) || !activeChar || loading) return;
    const content = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content, imageUrl }]);
    setInput('');
    setLoading(true);
    try {
      const { reply } = await api.sendMessage(activeChar.id, { content, imageUrl });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Помилка: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setCharacters([]);
    setActiveCharacter(null);
    setView('list');
  }

  if (!authChecked) return null;

  if (!user) {
    return (
      <div className="w-full h-screen flex justify-center overflow-hidden" style={{ background: BG }}>
        <div
          className="w-full h-full md:h-[92vh] md:my-[4vh] md:max-w-[420px] md:rounded-3xl overflow-hidden flex flex-col"
          style={{ color: TEXT, fontFamily: 'Inter, sans-serif', background: BG, border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <AuthView accent={DEFAULT_THEME.buttonsColor} onAuthed={setUser} />
        </div>
      </div>
    );
  }

  const rightPaneHasContent = view === 'create' || view === 'settings' || (view === 'chat' && activeChar);

  return (
    <div className="w-full h-screen flex justify-center overflow-hidden" style={{ background: BG }}>
      <div
        className="w-full h-full md:h-[92vh] md:my-[4vh] md:max-w-[1000px] md:rounded-3xl overflow-hidden flex"
        style={{ color: TEXT, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className={`${view === 'list' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[340px] md:shrink-0`}
          style={{ background: BG, borderRight: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="hidden md:block px-4 pt-4">
            <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color: theme.buttonsColor, fontFamily: 'Unbounded, sans-serif' }}>
              ФЕЛЕЙНБР
            </span>
          </div>
          <ListView
            characters={characters}
            buttonsColor={theme.buttonsColor}
            onOpen={(id) => { setActiveCharacter(id); setView('chat'); }}
            onCreate={() => setView('create')}
            onSettings={() => setView('settings')}
          />
        </div>

        <div className={`${view === 'list' ? 'hidden md:flex' : 'flex'} flex-col flex-1`} style={{ background: BG }}>
          {promptEvent && view !== 'create' && view !== 'settings' && (
            <div className="px-4 py-3 bg-[#191A22] border-b border-white/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: TEXT, fontFamily: 'Unbounded, sans-serif' }}>
                  Встановити Фелейнбр
                </div>
                <div className="text-xs" style={{ color: '#8B8996' }}>
                  Додай цей веб-додаток на домашній екран.
                </div>
              </div>
              <button
                onClick={() => promptInstall()}
                className="px-4 py-2 rounded-xl font-semibold"
                style={{ background: theme.buttonsColor, color: '#0E0E12' }}
              >
                Встановити
              </button>
            </div>
          )}

          {view === 'create' && (
            <CreateView buttonsColor={theme.buttonsColor} onBack={() => setView('list')} onCreate={handleCreateCharacter} />
          )}

          {view === 'chat' && activeChar && (
            <ChatView
              character={activeChar}
              user={user}
              buttonsColor={theme.buttonsColor}
              userBubbleColor={theme.userBubbleColor}
              characterBubbleColor={theme.characterBubbleColor}
              messages={messages}
              loading={loading}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              onBack={() => setView('list')}
              onDelete={() => deleteCharacter(activeChar.id)}
              scrollRef={scrollRef}
            />
          )}

          {view === 'settings' && (
            <SettingsView theme={theme} setTheme={setTheme} onBack={() => setView('list')} onLogout={handleLogout} />
          )}

          {!rightPaneHasContent && (
            <div className="hidden md:flex flex-col items-center justify-center h-full gap-2" style={{ color: '#8B8996' }}>
              <span className="text-sm">Обери персонажа зі списку зліва</span>
              <span className="text-xs">або створи нового</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
