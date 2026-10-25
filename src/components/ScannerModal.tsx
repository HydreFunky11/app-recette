'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Sparkles, Loader2, Plus, Layers, FileText } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { ExtractedRecipeData } from '@/types/database';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ExtractedRecipeData, imageFiles: File[]) => void;
}

export default function ScannerModal({ isOpen, onClose, onScanComplete }: ScannerModalProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMultiPageMode, setIsMultiPageMode] = useState(false);

  const directCameraInputRef = useRef<HTMLInputElement>(null);
  const multiCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Lancement de l'analyse avec une ou plusieurs images
  const processAndScan = async (imagesToScan: File[]) => {
    if (imagesToScan.length === 0) return;

    setIsScanning(true);
    setError(null);
    setStatusMessage(
      imagesToScan.length > 1
        ? `Analyse de vos ${imagesToScan.length} pages...`
        : "Déchiffrage de l'écriture et des ingrédients..."
    );

    try {
      const steps = [
        imagesToScan.length > 1
          ? "Lecture combinée des pages..."
          : "Déchiffrage de la recette...",
        'Extraction des ingrédients et dosages...',
        'Formatage des étapes de cuisine...',
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < steps.length) {
          setStatusMessage(steps[stepIndex]);
        }
      }, 1300);

      const formData = new FormData();
      imagesToScan.forEach((img) => {
        formData.append('images', img);
      });

      const res = await fetch('/api/scan-recipe', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Erreur lors du scan.');
      }

      onScanComplete(json.data, imagesToScan);
      handleReset();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de numériser cette recette.');
      setIsScanning(false);
    }
  };

  // 1. Scan direct (1 seule photo -> analyse instantanée !)
  const handleDirectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    let finalFile = file;
    try {
      finalFile = await compressImage(file);
    } catch {
      // conserver fichier brut si échec
    }

    const preview = URL.createObjectURL(finalFile);
    setSelectedImages([finalFile]);
    setPreviewUrls([preview]);

    // Analyse instantanée sans clic supplémentaire !
    processAndScan([finalFile]);
  };

  // 2. Mode multi-pages (ajout successif de pages)
  const handleAddPage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    let finalFile = file;
    try {
      finalFile = await compressImage(file);
    } catch {
      // conserver brut
    }

    const preview = URL.createObjectURL(finalFile);
    setSelectedImages((prev) => [...prev, finalFile]);
    setPreviewUrls((prev) => [...prev, preview]);
    setIsMultiPageMode(true);
  };

  // 3. Sélection depuis la galerie (peut être 1 ou plusieurs photos)
  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    const compressedFiles: File[] = [];
    const previews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let finalFile = file;
      try {
        finalFile = await compressImage(file);
      } catch {
        // conserver brut
      }
      compressedFiles.push(finalFile);
      previews.push(URL.createObjectURL(finalFile));
    }

    setSelectedImages(compressedFiles);
    setPreviewUrls(previews);

    // Si 1 seule photo choisie -> analyse instantanée !
    // Si plusieurs photos choisies -> analyse instantanée des pages combinées !
    processAndScan(compressedFiles);
  };

  const handleRemoveImage = (index: number) => {
    const newImgs = selectedImages.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setSelectedImages(newImgs);
    setPreviewUrls(newUrls);
    if (newImgs.length === 0) {
      setIsMultiPageMode(false);
    }
  };

  const handleReset = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
    setError(null);
    setIsScanning(false);
    setIsMultiPageMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 font-serif">Scanner une recette</h2>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={isScanning}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium space-y-1">
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Loader en cours de scan */}
          {isScanning ? (
            <div className="py-8 text-center space-y-4">
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-75"></div>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-stone-800 font-serif">
                  {statusMessage}
                </p>
                <p className="text-xs text-stone-400 max-w-xs mx-auto">
                  L&apos;IA lit et structure les ingrédients, portions et étapes...
                </p>
              </div>

              {/* Aperçu des pages en cours de scan */}
              {previewUrls.length > 0 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-12 h-16 rounded-lg overflow-hidden border border-stone-200 shadow-xs">
                      <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center font-bold">
                        P.{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isMultiPageMode && selectedImages.length > 0 ? (
            /* Écran du Mode Multi-pages (recette sur 2 pages ou plus) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Pages de la recette ({selectedImages.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => multiCameraInputRef.current?.click()}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une page
                </button>
              </div>

              {/* Grille des pages capturées */}
              <div className="grid grid-cols-2 gap-3">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-stone-100 border border-stone-200 shadow-xs group">
                    <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                      Page {idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Bouton pour ajouter la page suivante */}
                <button
                  type="button"
                  onClick={() => multiCameraInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-400 aspect-[3/4] flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50/50 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Page suivante</span>
                </button>
              </div>

              {/* Bouton pour déclencher l'analyse de toutes les pages */}
              <button
                type="button"
                onClick={() => processAndScan(selectedImages)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer mt-4"
              >
                <Sparkles className="w-5 h-5" />
                <span>Analyser les {selectedImages.length} pages avec l&apos;IA</span>
              </button>
            </div>
          ) : (
            /* Écran d'accueil du scanner : 1 clic = Scan instantané */
            <div className="space-y-3">
              {/* Option 1 : Prendre une photo directe (Scan Instantané !) */}
              <button
                type="button"
                onClick={() => directCameraInputRef.current?.click()}
                className="w-full flex items-center gap-3.5 p-5 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-amber-500/25 text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>Prendre une photo</span>
                    <span className="text-[10px] bg-white text-amber-700 font-bold px-1.5 py-0.5 rounded-full uppercase">
                      Direct
                    </span>
                  </div>
                  <div className="text-xs text-amber-100 mt-0.5">
                    Prenez la photo, l&apos;IA analyse instantanément
                  </div>
                </div>
              </button>

              {/* Option 2 : Recette sur 2 pages ou plus */}
              <button
                type="button"
                onClick={() => {
                  setIsMultiPageMode(true);
                  multiCameraInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 active:scale-[0.98] transition-all cursor-pointer text-stone-800 text-left shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs">Recette sur plusieurs pages</div>
                  <div className="text-[11px] text-stone-500">
                    Pour les recettes sur 2 pages ou recto/verso
                  </div>
                </div>
              </button>

              {/* Option 3 : Choisir depuis la galerie (support multi-fichiers) */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 active:scale-[0.98] transition-all cursor-pointer text-stone-700 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-200/80 text-stone-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-xs">Choisir depuis la galerie</div>
                  <div className="text-[11px] text-stone-400">
                    Sélectionnez 1 ou plusieurs photos existantes
                  </div>
                </div>
              </button>

              {/* Inputs fichiers invisibles */}
              {/* 1. Appareil photo instantané */}
              <input
                ref={directCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleDirectPhoto}
                className="hidden"
              />

              {/* 2. Appareil photo mode multi-pages */}
              <input
                ref={multiCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAddPage}
                className="hidden"
              />

              {/* 3. Galerie (avec option multiple) */}
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleGallerySelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
