'use client';

import { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, Clock, Users, Flame, Save, Loader2, Sparkles } from 'lucide-react';
import { ExtractedRecipeData, Ingredient, Recipe } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';

interface RecipeReviewModalProps {
  isOpen: boolean;
  initialData: ExtractedRecipeData | null;
  imageFiles?: File[] | null;
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
}

export default function RecipeReviewModal({
  isOpen,
  initialData,
  imageFiles,
  onClose,
  onSaved,
}: RecipeReviewModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [servings, setServings] = useState(initialData?.servings || 4);
  const [prepTime, setPrepTime] = useState(initialData?.prep_time_minutes || 15);
  const [cookTime, setCookTime] = useState(initialData?.cook_time_minutes || 20);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialData?.ingredients || []);
  const [steps, setSteps] = useState<string[]>(initialData?.steps || []);
  const [tags, setTags] = useState<string>(initialData?.tags?.join(', ') || 'Plat, Maison');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Synchroniser l'état dès que de nouvelles données arrivent de l'IA
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || 'Recette sans titre');
      setDescription(initialData.description || '');
      setServings(Number(initialData.servings) || 4);
      setPrepTime(Number(initialData.prep_time_minutes) || 15);
      setCookTime(Number(initialData.cook_time_minutes) || 20);

      // Normalisation intelligente des ingrédients
      if (Array.isArray(initialData.ingredients) && initialData.ingredients.length > 0) {
        const normalized: Ingredient[] = initialData.ingredients.map((ing: any) => {
          if (typeof ing === 'string') {
            return { name: ing, quantity: '', unit: '' };
          }
          return {
            name: String(ing.name || ing.item || ing.ingredient || ing.label || ''),
            quantity: String(ing.quantity || ing.amount || ing.qty || ''),
            unit: String(ing.unit || ing.measure || ''),
          };
        });
        setIngredients(normalized);
      } else {
        setIngredients([]);
      }

      // Normalisation intelligente des étapes
      if (Array.isArray(initialData.steps) && initialData.steps.length > 0) {
        const normalizedSteps: string[] = initialData.steps.map((st: any) => {
          if (typeof st === 'string') return st;
          return st.instruction || st.text || st.step || st.description || JSON.stringify(st);
        });
        setSteps(normalizedSteps);
      } else {
        setSteps([]);
      }

      // Normalisation des tags
      if (Array.isArray(initialData.tags) && initialData.tags.length > 0) {
        setTags(initialData.tags.join(', '));
      } else if (typeof initialData.tags === 'string') {
        setTags(initialData.tags);
      } else {
        setTags('Maison');
      }
    }
  }, [initialData]);

  if (!isOpen || !initialData) return null;

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

  // Sauvegarde
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Veuillez renseigner un titre pour la recette.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Utilisateur non connecté');

      let uploadedImageUrls: string[] = [];

      // Upload des images (mono ou multi-pages)
      if (imageFiles && imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const fileExt = 'jpg';
          const fileName = `${user.id}/${Date.now()}_page_${i + 1}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('recipe-photos')
            .upload(fileName, file, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('recipe-photos')
              .getPublicUrl(fileName);
            uploadedImageUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // Formatage des tags
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const mainImageUrl = uploadedImageUrls[0] || null;

      // Base payload
      const recipePayload: any = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        servings: Number(servings) || 4,
        prep_time_minutes: Number(prepTime) || 0,
        cook_time_minutes: Number(cookTime) || 0,
        ingredients: ingredients.filter((ing) => ing.name.trim() !== ''),
        steps: steps.filter((step) => step.trim() !== ''),
        tags: parsedTags,
        image_url: mainImageUrl,
        scan_image_urls: uploadedImageUrls,
        dish_photos: [],
        raw_ocr_text: initialData.raw_text || null,
        source_type: 'scan_handwritten',
      };

      // Insertion dans la table recipes (avec fallback si colonnes récentes absentes)
      let data: any = null;
      let { data: inserted, error: insertError } = await supabase
        .from('recipes')
        .insert(recipePayload)
        .select()
        .single();

      if (insertError && insertError.message?.includes('column')) {
        // Fallback sans colonnes optionnelles
        delete recipePayload.scan_image_urls;
        delete recipePayload.dish_photos;
        const res = await supabase.from('recipes').insert(recipePayload).select().single();
        inserted = res.data;
        insertError = res.error;
      }

      if (insertError) throw insertError;
      data = inserted;

      // Déclenche une petite pluie de confettis festifs
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F59E0B', '#10B981', '#3B82F6'],
      });

      onSaved(data);
      onClose();
    } catch (err: any) {
      console.error('Erreur sauvegarde recette:', err);
      setError(err.message || 'Erreur lors de la sauvegarde de la recette.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-stone-900 font-serif">Vérifier & Enregistrer</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200/50 transition-colors"
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
                placeholder="Ex: Tarte aux pommes de Grand-Mère"
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
                placeholder="Petite anecdote ou résumé de la recette..."
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

          {/* Ingrédients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Ingrédients ({ingredients.length})
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
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
                    placeholder="Qté (ex: 200)"
                    className="w-20 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 text-center"
                  />
                  <input
                    type="text"
                    value={ing.unit || ''}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                    placeholder="Unité (g, ml)"
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
                    className="p-2 text-stone-300 hover:text-rose-600 rounded-lg"
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
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
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
                    className="p-2 text-stone-300 hover:text-rose-600 rounded-lg mt-1"
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
                <span>Sauvegarde dans votre carnet...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Enregistrer la recette</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
