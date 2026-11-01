'use client';

import { useState } from 'react';
import { Tag as TagIcon, Plus, X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestedTags?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Dessert',
  'Plat',
  'Entrée',
  'Apéro',
  'Rapide',
  'Végé',
  'Pâtisserie',
  'Facile',
  'Maison',
  'Fête',
];

export default function TagInput({ tags, onChange, suggestedTags = [] }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Suggestions combinées (par défaut + existantes dans l'app) non encore ajoutées
  const allAvailableSuggestions = Array.from(
    new Set([...suggestedTags, ...DEFAULT_SUGGESTIONS])
  ).filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    onChange([...tags, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5 text-amber-500" />
          <span>Étiquettes / Tags ({tags.length})</span>
        </label>
        <span className="text-[11px] text-stone-400">Ex: Dessert, Rapide, Végé...</span>
      </div>

      {/* Tags actifs sous forme de chips */}
      <div className="flex flex-wrap gap-2 min-h-[36px] p-2 rounded-2xl bg-stone-50 border border-stone-200">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow-xs animate-in fade-in zoom-in-95 duration-150"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(idx)}
              className="p-0.5 hover:bg-black/20 rounded-full transition-colors cursor-pointer"
              title="Supprimer ce tag"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        ))}

        {tags.length === 0 && (
          <span className="text-xs text-stone-400 italic px-2 py-1">
            Aucun tag. Ajoutez-en un ci-dessous ou cliquez sur une suggestion !
          </span>
        )}
      </div>

      {/* Champ d'ajout de tag personnalisé */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">
            #
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nouveau tag personnalisé..."
            className="w-full pl-7 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={() => handleAddTag(inputValue)}
          disabled={!inputValue.trim()}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Suggestions rapides */}
      {allAvailableSuggestions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-stone-500 block">
            Suggestions rapides (cliquez pour ajouter) :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allAvailableSuggestions.slice(0, 8).map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddTag(suggestion)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-stone-200 text-stone-600 text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
              >
                <span>+ #{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
