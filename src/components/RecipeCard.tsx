'use client';

import { Recipe } from '@/types/database';
import { Clock, Flame, Users, Heart, PenTool, BookOpen } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent, id: string, isFav: boolean) => void;
}

export default function RecipeCard({ recipe, onClick, onToggleFavorite }: RecipeCardProps) {
  const isHandwritten = recipe.source_type === 'scan_handwritten';

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-3xl p-3.5 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99]"
    >
      <div>
        {/* Image ou Dégradé */}
        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-stone-100 mb-3">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-amber-500/10 via-orange-500/10 to-amber-100 flex items-center justify-center text-amber-700/60 font-serif text-2xl font-bold">
              {recipe.title.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Badge type de source */}
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-stone-700 flex items-center gap-1 shadow-2xs">
            {isHandwritten ? (
              <>
                <PenTool className="w-3 h-3 text-amber-600" />
                <span>Manuscrit</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3 h-3 text-orange-600" />
                <span>Livre</span>
              </>
            )}
          </div>

          {/* Bouton favori */}
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, recipe.id, !recipe.is_favorite)}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-400 hover:text-rose-500 shadow-2xs transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                recipe.is_favorite ? 'text-rose-500 fill-rose-500 scale-110' : ''
              }`}
            />
          </button>
        </div>

        {/* Titre */}
        <h3 className="font-bold text-base text-stone-900 font-serif leading-snug line-clamp-1 group-hover:text-amber-800 transition-colors">
          {recipe.title}
        </h3>

        {/* Ingrédients aperçu */}
        <p className="mt-1 text-xs text-stone-500 line-clamp-1">
          {recipe.ingredients.map((ing) => ing.name).join(', ') || 'Aucun ingrédient spécifié'}
        </p>
      </div>

      {/* Meta tags (Temps, portions) */}
      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] font-semibold text-stone-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            {recipe.servings || 4}
          </span>
        </div>
        <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform">
          Voir →
        </span>
      </div>
    </div>
  );
}
