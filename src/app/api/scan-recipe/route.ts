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
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    // 2. Récupération de l'image
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier image fourni.' },
        { status: 400 }
      );
    }

    // Convertir en base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // 3. Prompt spécialisé pour recettes manuscrites ou imprimées
    const prompt = `Tu es un expert culinaire et spécialiste de la reconnaissance de texte (OCR), particulièrement doué pour déchiffrer les écritures manuscrites difficiles (carnets de grand-mère, fiches de recettes griffonnées, ratures, abréviations culinaires comme càs, càc, pincée, etc.) ainsi que les recettes imprimées.

TÂCHE :
Analyse attentivement cette image de recette de cuisine.
Décode l'ensemble du texte, même si l'écriture est penchée, cursive ou ancienne.
Structure la recette au format JSON strictement valide.

RÈGLES IMPORTANTES :
1. Si une quantité est sous forme de fraction (ex: 1/2), convertis-la ou garde "1/2".
2. Sépare bien le nom de l'ingrédient, sa quantité et son unité (ex: { "name": "farine", "quantity": "250", "unit": "g" }).
3. Si le temps de préparation ou de cuisson n'est pas explicite, estime-le logiquement selon la recette.
4. Ordonne les étapes de préparation de manière claire, concise et facile à lire sur un écran de smartphone.
5. Inclus le texte brut retranscrit fidèlement dans "raw_text".
6. Réponds UNIQUEMENT avec un objet JSON respectant ce schéma sans texte additionnel ni markdown:

{
  "title": "Nom de la recette",
  "description": "Brève description ou résumé de la recette",
  "servings": 4,
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "ingredients": [
    { "name": "Beurre", "quantity": "100", "unit": "g" },
    { "name": "Oeufs", "quantity": "3", "unit": "" }
  ],
  "steps": [
    "Préchauffer le four à 180°C.",
    "Faire fondre le beurre..."
  ],
  "tags": ["Dessert", "Gâteau", "Traditionnel"],
  "raw_text": "Retranscription exacte du texte de l'image",
  "confidence_notes": "Note éventuelle sur les doutes de lecture (ou null si tout est clair)"
}`;

    // 4. Appel du modèle Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
      ],
    });

    const responseText = response.text || '';

    // Nettoyer les balises markdown ```json éventuelles
    const cleanedJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsedData = JSON.parse(cleanedJson);
      return NextResponse.json({ success: true, data: parsedData });
    } catch {
      return NextResponse.json(
        {
          error: "Erreur de formatage de la recette par l'IA",
          raw: responseText,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erreur scan recipe:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne lors de la reconnaissance.' },
      { status: 500 }
    );
  }
}
