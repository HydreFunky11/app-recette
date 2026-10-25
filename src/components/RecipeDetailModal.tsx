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

  // 1. Ajout d'une photo du plat fini
  const handleAddDishPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDishPhoto(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Utilisateur non connecté.');

      let compressedFile = file;
      try {
        compressedFile = await compressImage(file);
      } catch {
        // conserver original
      }

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

      const { data: updatedRecipe, error: updateError } = await supabase
        .from('recipes')
        .update({
          dish_photos: updatedPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedRecipe && onUpdateRecipe) {
        onUpdateRecipe(updatedRecipe as Recipe);
      }
      setActiveHeroPhoto(newPhotoUrl);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error(err);
      alert('Erreur lors de l\'ajout de la photo: ' + err.message);
    } finally {
      setIsUploadingDishPhoto(false);
      if (addDishPhotoInputRef.current) addDishPhotoInputRef.current.value = '';
    }
  };

  // 2. Suppression d'une photo du plat cuisiné
  const handleDeleteDishPhoto = async (indexToDelete: number) => {
    if (!confirm('Voulez-vous supprimer cette photo de votre plat ?')) return;

    try {
      const updatedPhotos = (recipe.dish_photos || []).filter((_, i) => i !== indexToDelete);
      const { data: updatedRecipe, error } = await supabase
        .from('recipes')
        .update({
          dish_photos: updatedPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id)
        .select()
        .single();

      if (error) throw error;
      if (updatedRecipe && onUpdateRecipe) {
        onUpdateRecipe(updatedRecipe as Recipe);
      }

      // Si la photo supprimée était celle affichée en haut, basculer vers une autre
      const nextPhoto = updatedPhotos.length > 0 ? updatedPhotos[0] : (recipe.image_url || null);
      setActiveHeroPhoto(nextPhoto);
    } catch (err: any) {
      alert('Erreur lors de la suppression de la photo: ' + err.message);
    }
  };

  // 3. Suppression d'une photo de scan original
  const handleDeleteScanPhoto = async (urlToDelete: string) => {
    if (!confirm('Voulez-vous supprimer cette page de scan ?')) return;

    try {
      const updatedScans = (recipe.scan_image_urls || []).filter((u) => u !== urlToDelete);
      const newMainImage = recipe.image_url === urlToDelete ? (updatedScans[0] || null) : recipe.image_url;

      const { data: updatedRecipe, error } = await supabase
        .from('recipes')
        .update({
          scan_image_urls: updatedScans,
          image_url: newMainImage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id)
        .select()
        .single();

      if (error) throw error;
      if (updatedRecipe && onUpdateRecipe) {
        onUpdateRecipe(updatedRecipe as Recipe);
      }

      if (activeHeroPhoto === urlToDelete) {
        const nextPhoto = recipe.dish_photos?.[0] || newMainImage || null;
        setActiveHeroPhoto(nextPhoto);
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  };

  // Suppression de la photo courante active
  const handleDeleteCurrentPhoto = () => {
    if (!activeHeroPhoto) return;
    const dishIndex = recipe.dish_photos?.indexOf(activeHeroPhoto);
    if (dishIndex !== undefined && dishIndex >= 0) {
      handleDeleteDishPhoto(dishIndex);
    } else if (recipe.image_url === activeHeroPhoto || recipe.scan_image_urls?.includes(activeHeroPhoto)) {
      handleDeleteScanPhoto(activeHeroPhoto);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Voulez-vous vraiment supprimer cette recette entière ?')) return;

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
              {/* Bouton supprimer la photo actuellement affichée */}
              {activeHeroPhoto && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentPhoto}
                  title="Supprimer cette photo"
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-rose-600 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
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

          {/* SECTION : Photos du plat cuisiné */}
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

            {/* Galerie horizontale de photos avec bouton supprimer individuel */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
              {/* Scan original (si présent) */}
              {recipe.image_url && (
                <div className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveHeroPhoto(recipe.image_url!)}
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden block border-2 transition-all cursor-pointer ${
                      activeHeroPhoto === recipe.image_url ? 'border-amber-500 ring-2 ring-amber-400/40 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={recipe.image_url} alt="Scan" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white text-center font-bold">
                      Scan
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScanPhoto(recipe.image_url!);
                    }}
                    title="Supprimer cette photo de scan"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors z-10 cursor-pointer"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* Photos du plat fini */}
              {recipe.dish_photos?.map((photoUrl, idx) => (
                <div key={idx} className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveHeroPhoto(photoUrl)}
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden block border-2 transition-all cursor-pointer ${
                      activeHeroPhoto === photoUrl ? 'border-amber-500 ring-2 ring-amber-400/40 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photoUrl} alt={`Plat ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-amber-600/90 text-[8px] text-white text-center font-bold">
                      Plat #{idx + 1}
                    </span>
                  </button>
                  {/* Bouton supprimer la photo du plat */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDishPhoto(idx);
                    }}
                    title="Supprimer cette photo de plat"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors z-10 cursor-pointer"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              ))}

              {(!recipe.dish_photos || recipe.dish_photos.length === 0) && !recipe.image_url && (
                <div className="text-[11px] text-stone-500 italic py-1">
                  Aucune photo pour l&apos;instant. Cliquez ci-dessus pour ajouter votre première photo !
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
                  <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-stone-200 shadow-2xs group">
                    <button
                      type="button"
                      onClick={() => setActiveHeroPhoto(scanUrl)}
                      className="w-full h-full block cursor-pointer"
                    >
                      <img src={scanUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white font-bold">
                        Page {idx + 1}
                      </span>
                    </button>
                    {/* Bouton supprimer la page de scan */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScanPhoto(scanUrl);
                      }}
                      title="Supprimer cette page"
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors z-10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
