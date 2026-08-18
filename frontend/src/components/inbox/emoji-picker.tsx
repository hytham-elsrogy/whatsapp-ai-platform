'use client';

import { useEffect, useRef } from 'react';

// A curated, static set rather than an emoji-mart-style dependency — this
// project's established preference is a small script over an extra
// dependency (see backup/*.sh comments in docker-compose.yml) when the
// scope doesn't need full search/skin-tone/locale support.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'وجوه',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '😘', '😋', '😜', '🤔', '😐', '😑', '😶',
      '🙄', '😏', '😣', '😥', '😮', '🤐', '😴', '😪', '😷', '🤒',
      '😢', '😭', '😤', '😠', '😡', '🥳', '😱', '😨', '😰', '🙁',
    ],
  },
  {
    label: 'إيماءات',
    emojis: [
      '👍', '👎', '👏', '🙏', '🤝', '💪', '👌', '✌️', '🤞', '👋',
      '🤙', '👆', '👇', '👈', '👉', '✋', '🖐️', '🤲', '💯', '🔥',
    ],
  },
  {
    label: 'قلوب ورموز',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
      '⭐', '✨', '🎉', '✅', '❌', '⚠️', '❓', '❗', '⏰', '📌',
    ],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="max-h-64 overflow-y-auto">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            <div className="mb-1 text-[10px] text-gray-400">{group.label}</div>
            <div className="grid grid-cols-8 gap-1">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="rounded text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
