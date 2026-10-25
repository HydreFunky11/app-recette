'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Recipe, ExtractedRecipeData } from '@/types/database';
import RecipeCard from '@/components/RecipeCard';
import ScannerModal from '@/components/ScannerModal';
import RecipeReviewModal from '@/components/RecipeReviewModal';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import RecipeEditModal from '@/components/RecipeEditModal';
import AuthForm from '@/components/AuthForm';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Sparkles,
  LogOut,
  Heart,
  PenTool,
  BookOpen,
  ChefHat,
  Loader2,
} from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'handwritten' | 'printed'>('all');

  // Modales
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState<ExtractedRecipeData | null>(null);
  const [scannedImageFile, setScannedImageFile] = useState<File | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  const supabase = createClient();

  // 1. Initialiser l'état d'authentification
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          fetchRecipes();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAuth(false);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRecipes();
      } else {
        setRecipes([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Charger les recettes
  const fetchRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes((data as Recipe[]) || []);
    } catch (err) {
      console.error('Erreur chargement recettes:', err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // 3. Déconnexion
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // 4. Callback du scanner
  const handleScanComplete = (data: ExtractedRecipeData, imageFile: File | null) => {
    setScannedData(data);
    setScannedImageFile(imageFile);
    setIsScannerOpen(false);
    setIsReviewOpen(true);
  };

  // 5. Callback de recette enregistrée
  const handleRecipeSaved = (newRecipe: Recipe) => {
    setRecipes((prev) => [newRecipe, ...prev]);
    setSelectedRecipe(newRecipe);
  };

  // 6. Basculer favori
  const handleToggleFavorite = async (e: React.MouseEvent | null, id: string, isFav: boolean) => {
    if (e) e.stopPropagation();

    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_favorite: isFav } : r))
    );

    if (selectedRecipe?.id === id) {
      setSelectedRecipe((prev) => (prev ? { ...prev, is_favorite: isFav } : null));
    }

    try {
      await supabase.from('recipes').update({ is_favorite: isFav }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Supprimer recette
  const handleRecipeDeleted = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  // 8. Modifier recette
  const handleOpenEdit = (recipe: Recipe) => {
    setRecipeToEdit(recipe);
  };

  const handleRecipeUpdated = (updated: Recipe) => {
    setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecipe(updated);
    setRecipeToEdit(null);
  };

  // Filtrage
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      recipe.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'favorites') return recipe.is_favorite;
    if (activeFilter === 'handwritten') return recipe.source_type === 'scan_handwritten';
    if (activeFilter === 'printed') return recipe.source_type === 'scan_printed';
    return true;
  });

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // ÉCRAN NON CONNECTÉ : Invitation chaleureuse & Google Sign-In
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col justify-between px-5 py-8 max-w-md mx-auto">
        <div className="pt-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500 text-white shadow-lg shadow-amber-500/25 mb-2">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 font-serif">
            GourmetScan
          </h1>
          <p className="text-stone-600 text-sm max-w-xs mx-auto leading-relaxed">
            Vos vieilles recettes manuscrites et découpes de magazines, scannées et prêtes à cuisiner en 1 clic.
          </p>
        </div>

        <div className="my-8 space-y-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <PenTool className="w-4 h-4" />
            </div>
            <div className="text-left text-xs text-stone-700 font-medium">
              Déchiffre l&apos;écriture cursive et les ratures
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-left text-xs text-stone-700 font-medium">
              Extrait les ingrédients et ajuste les portions
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left text-xs text-stone-700 font-medium">
              Mode cuisine pas-à-pas avec cases à cocher
            </div>
          </div>
        </div>

        <div className="space-y-4 pb-4">
          <AuthForm />
          <p className="text-center text-[11px] text-stone-400">
            Accès sécurisé pour votre cercle de cuisiniers
          </p>
        </div>
      </main>
    );
  }

  // ÉCRAN CONNECTÉ : Application Principale Mobile
  return (
    <div className="min-h-screen pb-28 max-w-lg mx-auto bg-stone-50/50">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-stone-200/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 font-serif leading-none">
                GourmetScan
              </h1>
              <span className="text-[10px] font-semibold text-amber-600 tracking-wider uppercase">
                Carnet de Recettes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSignOut}
              title="Déconnexion"
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barre de Recherche */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une recette, un ingrédient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-stone-100 border border-stone-200/80 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
          />
        </div>

        {/* Filtres Tags */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Toutes ({recipes.length})
          </button>
          <button
            onClick={() => setActiveFilter('favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
              activeFilter === 'favorites'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Favoris
          </button>
          <button
            onClick={() => setActiveFilter('handwritten')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
              activeFilter === 'handwritten'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Manuscrits
          </button>
          <button
            onClick={() => setActiveFilter('printed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
              activeFilter === 'printed'
                ? 'bg-orange-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Imprimés
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="p-4">
        {loadingRecipes ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-xs text-stone-500">Chargement de votre carnet de recettes...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <ChefHat className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800 font-serif">
                {recipes.length === 0 ? 'Aucune recette pour le moment' : 'Aucun résultat'}
              </h2>
              <p className="mt-1 text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                {recipes.length === 0
                  ? 'Appuyez sur le bouton ci-dessous pour scanner votre premier carnet ou fiche manuscrite !'
                  : 'Essayez de modifier vos critères de recherche.'}
              </p>
            </div>
            {recipes.length === 0 && (
              <button
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Scanner ma 1ère recette</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
                onToggleFavorite={(e, id, isFav) => handleToggleFavorite(e, id, isFav)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (Scanner de recette) */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="pointer-events-auto flex items-center gap-2.5 px-6 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-amber-500/35 active:scale-95 transition-all cursor-pointer border border-amber-400/40"
        >
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span>Scanner une recette</span>
        </button>
      </div>

      {/* Modales */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />

      {isReviewOpen && scannedData && (
        <RecipeReviewModal
          isOpen={isReviewOpen}
          initialData={scannedData}
          imageFile={scannedImageFile}
          onClose={() => {
            setIsReviewOpen(false);
            setScannedData(null);
            setScannedImageFile(null);
          }}
          onSaved={handleRecipeSaved}
        />
      )}

      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onDelete={handleRecipeDeleted}
        onToggleFavorite={(id, isFav) => handleToggleFavorite(null, id, isFav)}
        onEdit={handleOpenEdit}
      />

      {recipeToEdit && (
        <RecipeEditModal
          isOpen={!!recipeToEdit}
          recipe={recipeToEdit}
          onClose={() => setRecipeToEdit(null)}
          onUpdated={handleRecipeUpdated}
        />
      )}
    </div>
  );
}
