'use client';

import { useState, useEffect } from 'react';
import { X, Heart, Clock, Users, Flame, Check, Trash2, Share2, ChefHat, Sparkles, Pencil } from 'lucide-react';
import { Recipe } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
  onEdit: (recipe: Recipe) => void;
}

export default function RecipeDetailModal({
  recipe,
  onClose,
  onDelete,
  onToggleFavorite,
  onEdit,
}: RecipeDetailModalProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(recipe?.servings || 4);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  // Synchroniser le nombre de personnes de base avec la recette sélectionnée
  useEffect(() => {
    if (recipe) {
      setServingsMultiplier(recipe.servings || 4);
      setCheckedIngredients({});
      setCompletedSteps({});
    }
  }, [recipe?.id, recipe?.servings]);

  if (!recipe) return null;

  const baseServings = recipe.servings || 4;
  const ratio = servingsMultiplier / baseServings;

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDelete = async () => {
    if (!confirm('Voulez-vous vraiment supprimer cette recette ?')) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
      if (error) throw error;
      onDelete(recipe.id);
      onClose();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: `Découvre ma recette de ${recipe.title} sur GourmetScan !`,
          url: window.location.href,
        });
      } catch {
        // Ignorer annulation
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-3xl max-h-[94dvh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
        {/* Header Hero Image or Graphic */}
        <div className="relative h-48 sm:h-56 bg-stone-900 shrink-0 overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 text-white p-4 text-center">
              <ChefHat className="w-12 h-12 mb-2 opacity-90 drop-shadow" />
              <span className="text-xs uppercase font-bold tracking-widest opacity-80">
                Recette Gourmande
              </span>
            </div>
          )}

          {/* Boutons actions flottants */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(recipe)}
                title="Modifier la recette"
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleFavorite(recipe.id, !recipe.is_favorite)}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer ${
                  recipe.is_favorite
                    ? 'bg-rose-500 text-white'
                    : 'bg-black/40 text-white hover:bg-black/60'
                }`}
              >
                <Heart className={`w-5 h-5 ${recipe.is_favorite ? 'fill-white' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Recipe Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recipe.tags?.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-stone-900 font-serif leading-tight">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-2 text-stone-600 text-sm leading-relaxed">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Stats & Servings Adjuster */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center gap-4 text-xs font-semibold text-stone-700">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{recipe.prep_time_minutes || 15} min prépa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>{recipe.cook_time_minutes || 0} min cuisson</span>
              </div>
            </div>

            {/* Sélecteur de portions interactif */}
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-stone-200 shadow-xs">
              <button
                onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                className="w-6 h-6 rounded-lg bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="text-xs font-bold text-stone-900 px-1">
                {servingsMultiplier} pers.
              </span>
              <button
                onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                className="w-6 h-6 rounded-lg bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Ingrédients Cliquables */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
              <span>Ingrédients</span>
              <span className="text-[11px] font-normal text-stone-400 lowercase">
                (cliquez pour cocher)
              </span>
            </h3>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = !!checkedIngredients[idx];
                const rawQty = parseFloat(ing.quantity || '0');
                const scaledQty = !isNaN(rawQty) && rawQty > 0
                  ? Math.round(rawQty * ratio * 10) / 10
                  : ing.quantity;

                return (
                  <div
                    key={idx}
                    onClick={() => toggleIngredient(idx)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-stone-50 border-stone-200 opacity-50 line-through'
                        : 'bg-white border-stone-200/90 shadow-2xs hover:border-amber-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 text-sm font-medium text-stone-800">
                      {ing.name}
                    </div>
                    {(scaledQty || ing.unit) && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                        {scaledQty} {ing.unit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Étapes pas-à-pas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
              <span>Préparation pas-à-pas</span>
            </h3>
            <div className="space-y-3">
              {recipe.steps.map((step, idx) => {
                const isDone = !!completedSteps[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isDone
                        ? 'bg-emerald-50/40 border-emerald-200 opacity-60'
                        : 'bg-white border-stone-200/90 shadow-2xs hover:border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </span>
                    <p
                      className={`text-sm leading-relaxed ${
                        isDone ? 'text-stone-500 line-through' : 'text-stone-800'
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transcription brute d'origine si disponible */}
          {recipe.raw_ocr_text && (
            <details className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
              <summary className="font-semibold text-stone-700 cursor-pointer flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Voir le texte brut déchiffré par l&apos;IA</span>
              </summary>
              <p className="mt-2 text-stone-500 whitespace-pre-wrap font-mono text-[11px] bg-white p-2 rounded-xl border border-stone-200">
                {recipe.raw_ocr_text}
              </p>
            </details>
          )}

          {/* Actions du bas : Modifier & Supprimer */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => onEdit(recipe)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>Modifier la recette</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? '...' : 'Supprimer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
