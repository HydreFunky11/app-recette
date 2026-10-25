'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Users, Flame, Save, Loader2, Sparkles, Pencil, Camera, Layers } from 'lucide-react';
import { Ingredient, Recipe } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface RecipeEditModalProps {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onUpdated: (recipe: Recipe) => void;
}

export default function RecipeEditModal({
  isOpen,
  recipe,
  onClose,
  onUpdated,
}: RecipeEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState(15);
  const [cookTime, setCookTime] = useState(20);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [tags, setTags] = useState<string>('');
  const [dishPhotos, setDishPhotos] = useState<string[]>([]);
  const [scanImageUrls, setScanImageUrls] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || '');
      setDescription(recipe.description || '');
      setServings(recipe.servings || 4);
      setPrepTime(recipe.prep_time_minutes || 15);
      setCookTime(recipe.cook_time_minutes || 20);
      setIngredients(recipe.ingredients || []);
      setSteps(recipe.steps || []);
      setTags(recipe.tags?.join(', ') || '');
      setDishPhotos(recipe.dish_photos || []);
      setScanImageUrls(recipe.scan_image_urls || []);
      setImageUrl(recipe.image_url || null);
      setError(null);
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  // Ingrédients
  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Étapes
  const handleStepChange = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Suppression d'une photo du plat
  const handleRemoveDishPhoto = (indexToDelete: number) => {
    setDishPhotos((prev) => prev.filter((_, i) => i !== indexToDelete));
  };

  // Suppression d'une photo de scan
  const handleRemoveScanPhoto = (urlToDelete: string) => {
    const remaining = scanImageUrls.filter((u) => u !== urlToDelete);
    setScanImageUrls(remaining);
    if (imageUrl === urlToDelete) {
      setImageUrl(remaining[0] || null);
    }
  };

  // Sauvegarde des modifications
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Veuillez renseigner un titre pour la recette.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const updatePayload: any = {
        title: title.trim(),
        description: description.trim(),
        servings: Number(servings) || 4,
        prep_time_minutes: Number(prepTime) || 0,
        cook_time_minutes: Number(cookTime) || 0,
        ingredients: ingredients.filter((ing) => ing.name.trim() !== ''),
        steps: steps.filter((step) => step.trim() !== ''),
        tags: parsedTags,
        dish_photos: dishPhotos,
        scan_image_urls: scanImageUrls,
        image_url: imageUrl || scanImageUrls[0] || null,
        updated_at: new Date().toISOString(),
      };

      let { data, error: updateError } = await supabase
        .from('recipes')
        .update(updatePayload)
        .eq('id', recipe.id)
        .select()
        .single();

      if (updateError && updateError.message?.includes('column')) {
        delete updatePayload.dish_photos;
        delete updatePayload.scan_image_urls;
        const res = await supabase.from('recipes').update(updatePayload).eq('id', recipe.id).select().single();
        data = res.data;
        updateError = res.error;
      }

      if (updateError) throw updateError;

      onUpdated(data as Recipe);
      onClose();
    } catch (err: any) {
      console.error('Erreur mise à jour recette:', err);
      setError(err.message || 'Erreur lors de la modification.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyPhotos = (dishPhotos && dishPhotos.length > 0) || (scanImageUrls && scanImageUrls.length > 0) || !!imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 font-serif">Modifier la recette</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Titre & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Nom de la recette
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Tarte aux pommes"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-semibold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Description ou notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Notes ou description..."
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm text-stone-800"
              />
            </div>
          </div>

          {/* Chiffres clés (Portions, Prépa, Cuisson) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col">
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 mb-1">
                <Users className="w-3.5 h-3.5" /> Personnes
              </span>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full bg-transparent font-bold text-amber-950 text-base outline-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-100 flex flex-col">
              <span className="flex items-center gap-1 text-[11px] font-bold text-orange-800 mb-1">
                <Clock className="w-3.5 h-3.5" /> Prépa (min)
              </span>
              <input
                type="number"
                min="0"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full bg-transparent font-bold text-orange-950 text-base outline-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col">
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-800 mb-1">
                <Flame className="w-3.5 h-3.5" /> Cuisson (min)
              </span>
              <input
                type="number"
                min="0"
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                className="w-full bg-transparent font-bold text-rose-950 text-base outline-none"
              />
            </div>
          </div>

          {/* Gestion des photos (Suppression de photos) */}
          {hasAnyPhotos && (
            <div className="space-y-3 p-4 rounded-3xl bg-stone-50 border border-stone-200">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Gestion des photos associées
              </label>

              {/* Photos du plat */}
              {dishPhotos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-amber-800">Photos du plat :</span>
                  <div className="flex flex-wrap gap-2">
                    {dishPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-stone-300 shadow-2xs group">
                        <img src={url} alt={`Plat ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveDishPhoto(idx)}
                          title="Supprimer cette photo"
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer hover:bg-rose-600/70"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scans */}
              {(scanImageUrls.length > 0 || imageUrl) && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-600">Photos des scans de recette :</span>
                  <div className="flex flex-wrap gap-2">
                    {(scanImageUrls.length > 0 ? scanImageUrls : (imageUrl ? [imageUrl] : [])).map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-stone-300 shadow-2xs group">
                        <img src={url} alt={`Scan ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveScanPhoto(url)}
                          title="Supprimer cette page de scan"
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer hover:bg-rose-600/70"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ingrédients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Ingrédients ({ingredients.length})
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.quantity || ''}
                    onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                    placeholder="Qté"
                    className="w-20 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 text-center"
                  />
                  <input
                    type="text"
                    value={ing.unit || ''}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                    placeholder="Unité"
                    className="w-20 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 text-center"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    placeholder="Nom ingrédient"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="p-2 text-stone-300 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Étapes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Étapes de préparation ({steps.length})
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            <div className="space-y-2.5">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-2">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 leading-relaxed outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-2 text-stone-300 hover:text-rose-600 rounded-lg mt-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Étiquettes (séparées par des virgules)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Dessert, Chocolat, Rapide"
              className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-xs text-stone-800"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-100 bg-white">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enregistrement des modifications...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Enregistrer les modifications</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
