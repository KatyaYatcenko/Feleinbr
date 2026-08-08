// Галерея аватарок. Кожна — це іконка + фірмовий колір фону.
// Легко розширити: додай новий об'єкт сюди і імпортуй іконку зверху у AvatarPicker.jsx
export const AVATAR_GALLERY = [
  { id: 'cat', icon: 'Cat', color: '#FF5D8F' },
  { id: 'dog', icon: 'Dog', color: '#6C7BFF' },
  { id: 'bird', icon: 'Bird', color: '#3DDC97' },
  { id: 'fish', icon: 'Fish', color: '#4FD1FF' },
  { id: 'ghost', icon: 'Ghost', color: '#B98CFF' },
  { id: 'rabbit', icon: 'Rabbit', color: '#FFB84D' },
  { id: 'turtle', icon: 'Turtle', color: '#3DDC97' },
  { id: 'bug', icon: 'Bug', color: '#FF8A65' },
  { id: 'flame', icon: 'Flame', color: '#FF6B4A' },
  { id: 'moon', icon: 'Moon', color: '#8B8CFF' },
  { id: 'sun', icon: 'Sun', color: '#FFC24D' },
  { id: 'star', icon: 'Star', color: '#FFD166' },
  { id: 'cloud', icon: 'Cloud', color: '#7FB8FF' },
  { id: 'sparkles', icon: 'Sparkles', color: '#E98CFF' },
  { id: 'crown', icon: 'Crown', color: '#FFD166' },
  { id: 'flower', icon: 'Flower2', color: '#FF8FB1' },
];

export function getAvatarById(id) {
  return AVATAR_GALLERY.find((a) => a.id === id) || AVATAR_GALLERY[0];
}
