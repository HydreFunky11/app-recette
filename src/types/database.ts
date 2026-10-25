export interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  source_type: 'scan_handwritten' | 'scan_printed' | 'manual';
  image_url?: string | null;
  scan_image_urls?: string[] | null;
  dish_photos?: string[] | null;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  is_favorite: boolean;
  raw_ocr_text?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedRecipeData {
  title: string;
  description?: string;
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  ingredients: Ingredient[];
  steps: string[];
  tags?: string[];
  raw_text?: string;
}
