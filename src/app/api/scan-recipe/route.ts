import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé GEMINI_API_KEY non configurée sur le serveur.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Authentification de l'utilisateur
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Session expirée ou non connecté. Veuillez vous connecter pour scanner.' },
        { status: 401 }
      );
    }

    // 2. Récupération des images (support mono ou multi-pages)
    const formData = await req.formData();
    let files: File[] = [];

    const allImages = formData.getAll('images') as File[];
    const singleImage = formData.get('image') as File | null;

    if (allImages && allImages.length > 0) {
      files = allImages.filter((f) => f && f.size > 0);
    } else if (singleImage && singleImage.size > 0) {
      files = [singleImage];
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier image fourni.' },
        { status: 400 }
      );
    }

    // Convertir toutes les images en base64 pour Gemini
    const inlineDataParts = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'image/jpeg';
        return {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
      })
    );

    // 3. Prompt multimodal optimisé pour mono & multi-pages (manuscrit ou imprimé)
    const prompt = `Tu es un expert culinaire et spécialiste de la reconnaissance de texte (OCR), particulièrement doué pour déchiffrer TOUS types de recettes :
- Écritures manuscrites difficiles, cursives, anciennes (carnets de grand-mère).
- Recettes imprimées de livres, magazines ou ordinateurs.
- Faible luminosité, ombres, photos prises de biais ou de loin.
${files.length > 1 ? `- MULTI-PAGES : Tu as reçu ${files.length} images/pages pour cette même recette (ex: page 1 avec les ingrédients, page 2 avec les étapes). Synthétise l'ensemble des pages en une seule recette unifiée et complète sans oublier aucun ingrédient ni étape.` : ''}

TÂCHE :
Analyse très attentivement chaque détail de l'image (ou des images). Déchiffre même les mots partiellement lisibles en t'aidant du contexte culinaire.
Structure la recette extraite en respectant EXACTEMENT la structure JSON ci-dessous.

RÈGLES IMPORTANTES :
1. Si le titre n'est pas explicite, déduis le nom du plat à partir des ingrédients et étapes (ex: "Tarte aux pommes").
2. Si une quantité est floue ou sous forme de fraction (ex: 1/2), convertis-la ou garde "1/2".
3. Sépare bien chaque ingrédient: { "name": "nom", "quantity": "quantite", "unit": "unite" }. Si pas d'unité, laisse une chaîne vide "".
4. Si le temps de préparation ou cuisson n'est pas écrit, estime-le logiquement selon le type de plat.
5. Ordonne les étapes de préparation clairement pour être lues sur mobile.
6. Dans "raw_text", inclus la retranscription la plus fidèle possible de ce que tu arrives à lire.
7. Si l'image ne contient aucun texte culinaire, indique-le dans "confidence_notes".

Format JSON attendu :
{
  "title": "Nom de la recette",
  "description": "Courte description ou résumé",
  "servings": 4,
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "ingredients": [
    { "name": "Farine", "quantity": "250", "unit": "g" }
  ],
  "steps": [
    "Préchauffer le four..."
  ],
  "tags": ["Plat", "Maison"],
  "raw_text": "Texte brut déchiffré",
  "confidence_notes": "Précisions sur la lisibilité ou les doutes"
}`;

    // 4. Appel du modèle Gemini avec toutes les pages
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        ...inlineDataParts,
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';

    // Nettoyage et parsing JSON
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error("L'IA n'a pas retourné de JSON valide");
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Erreur /api/scan-recipe:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erreur interne lors de la reconnaissance par IA.',
      },
      { status: 500 }
    );
  }
}
