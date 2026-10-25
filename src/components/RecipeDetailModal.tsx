'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Clock,
  Flame,
  Check,
  Trash2,
  Share2,
  ChefHat,
  Sparkles,
  Pencil,
  Camera,
  Image as ImageIcon,
  Loader2,
  Layers,
} from 'lucide-react';
import { Recipe } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/imageCompression';
import confetti from 'canvas-confetti';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
  onEdit: (recipe: Recipe) => void;
  onUpdateRecipe?: (updated: Recipe) => void;
}

export default function RecipeDetailModal({
  recipe,
  onClose,
  onDelete,
  onToggleFavorite,
  onEdit,
  onUpdateRecipe,
}: RecipeDetailModalProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(recipe?.servings || 4);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingDishPhoto, setIsUploadingDishPhoto] = useState(false);
  const [activeHeroPhoto, setActiveHeroPhoto] = useState<string | null>(null);

  const addDishPhotoInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Synchroniser le nombre de personnes de base et la photo active
  useEffect(() => {
    if (recipe) {
      setServingsMultiplier(recipe.servings || 4);
      setCheckedIngredients({});
      setCompletedSteps({});
      // Photo par défaut : premier plat cuisiné si présent, sinon le scan
      const firstDish = recipe.dish_photos && recipe.dish_photos.length > 0 ? recipe.dish_photos[0] : null;
      setActiveHeroPhoto(firstDish || recipe.image_url || null);
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

  // Ajout d'une photo du plat fini
  const handleAddDishPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDishPhoto(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Utilisateur non connecté.');

      // 1. Compression
      let compressedFile = file;
      try {
        compressedFile = await compressImage(file);
      } catch {
        // conserver original
      }

      // 2. Upload dans Supabase Storage
      const fileExt = 'jpg';
      const fileName = `${user.id}/${recipe.id}_dish_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(fileName, compressedFile, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError || !uploadData) {
        throw new Error(uploadError?.message || "Échec de l'upload.");
      }

      const { data: publicUrlData } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(fileName);

      const newPhotoUrl = publicUrlData.publicUrl;
      const updatedPhotos = [...(recipe.dish_photos || []), newPhotoUrl];

      // 3. Mise à jour de la table
      const { data: updatedRecipe, error: updateError } = await supabase
        .from('recipes')
        .update({
          dish_photos: updatedPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id)
        .select()
        .single();

      if (updateError) {
        if (updateError.message.includes('column')) {
          alert(
            "Note : La colonne 'dish_photos' n'a pas encore été créée dans votre SQL Supabase. Veuillez exécuter la ligne dans SQL Editor."
          );
        } else {
          throw updateError;
        }
      } else if (updatedRecipe) {
        if (onUpdateRecipe) {
          onUpdateRecipe(updatedRecipe as Recipe);
        }
        setActiveHeroPhoto(newPhotoUrl);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.error(err);
      alert('Erreur lors de l\'ajout de la photo: ' + err.message);
    } finally {
      setIsUploadingDishPhoto(false);
      if (addDishPhotoInputRef.current) addDishPhotoInputRef.current.value = '';
    }
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
        // Ignorer
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
        <div className="relative h-52 sm:h-60 bg-stone-900 shrink-0 overflow-hidden">
          {activeHeroPhoto ? (
            <img
              src={activeHeroPhoto}
              alt={recipe.title}
              className="w-full h-full object-cover transition-all duration-300"
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

          {/* SECTION : Photos du plat cuisiné (Nouveau !) */}
          <div className="p-4 rounded-3xl bg-amber-50/50 border border-amber-200/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Photos de votre plat ({recipe.dish_photos?.length || 0})</span>
              </span>
              <button
                type="button"
                onClick={() => addDishPhotoInputRef.current?.click()}
                disabled={isUploadingDishPhoto}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs hover:bg-amber-50 transition-all"
              >
                {isUploadingDishPhoto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Upload...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>+ Ajouter mon plat</span>
                  </>
                )}
              </button>
            </div>

            {/* Galerie horizontale de photos */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {/* Scan original */}
              {recipe.image_url && (
                <button
                  type="button"
                  onClick={() => setActiveHeroPhoto(recipe.image_url!)}
                  className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeHeroPhoto === recipe.image_url ? 'border-amber-500 ring-2 ring-amber-400/40 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={recipe.image_url} alt="Scan" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white text-center font-bold">
                    Scan
                  </span>
                </button>
              )}

              {/* Photos du plat fini */}
              {recipe.dish_photos?.map((photoUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveHeroPhoto(photoUrl)}
                  className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeHeroPhoto === photoUrl ? 'border-amber-500 ring-2 ring-amber-400/40 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photoUrl} alt={`Plat ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-amber-600/90 text-[8px] text-white text-center font-bold">
                    Plat #{idx + 1}
                  </span>
                </button>
              ))}

              {(!recipe.dish_photos || recipe.dish_photos.length === 0) && (
                <div className="text-[11px] text-stone-500 italic py-1">
                  Vous avez cuisiné ce plat ? Ajoutez votre photo souvenir ci-dessus !
                </div>
              )}
            </div>

            <input
              ref={addDishPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleAddDishPhoto}
              className="hidden"
            />
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

          {/* Scans multi-pages (si présents) */}
          {recipe.scan_image_urls && recipe.scan_image_urls.length > 1 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-stone-400" />
                <span>Pages originales scannées ({recipe.scan_image_urls.length})</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {recipe.scan_image_urls.map((scanUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveHeroPhoto(scanUrl)}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-stone-200 shadow-2xs hover:border-amber-400 transition-all cursor-pointer"
                  >
                    <img src={scanUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white font-bold">
                      Page {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
