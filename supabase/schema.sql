-- ==============================================================================
-- SCHEMA SUPABASE : APP RECETTES (PWA MOBILE)
-- ==============================================================================

-- 1. Table des Recettes
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    servings INTEGER DEFAULT 4,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    source_type TEXT DEFAULT 'scan_handwritten', -- 'scan_handwritten', 'scan_printed', 'manual'
    image_url TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb, 
    -- Ex: [{"name": "Farine", "quantity": "250", "unit": "g"}]
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, 
    -- Ex: ["Préchauffer le four à 180°C", "Mélanger les œufs et le sucre"]
    tags TEXT[] DEFAULT '{}'::text[],
    is_favorite BOOLEAN DEFAULT false,
    raw_ocr_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON public.recipes USING gin(to_tsvector('french', title));
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON public.recipes(created_at DESC);

-- 2. Sécurité Row Level Security (RLS)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Politique : L'utilisateur ne voit que ses recettes
CREATE POLICY "Users can view own recipes"
    ON public.recipes FOR SELECT
    USING (auth.uid() = user_id);

-- Politique : L'utilisateur peut créer ses recettes
CREATE POLICY "Users can insert own recipes"
    ON public.recipes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Politique : L'utilisateur peut modifier ses recettes
CREATE POLICY "Users can update own recipes"
    ON public.recipes FOR UPDATE
    USING (auth.uid() = user_id);

-- Politique : L'utilisateur peut supprimer ses recettes
CREATE POLICY "Users can delete own recipes"
    ON public.recipes FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Configuration du stockage Supabase (Bucket pour les photos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS sur le bucket de photos
CREATE POLICY "Recipe images are publicly accessible" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'recipe-photos');

CREATE POLICY "Authenticated users can upload recipe images" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'recipe-photos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete their recipe images" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'recipe-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
