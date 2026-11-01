'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Sparkles, Loader2, Plus, Layers, ArrowLeft } from 'lucide-react';
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
  const multiGalleryInputRef = useRef<HTMLInputElement>(null);

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
          ? 'Lecture combinée des pages...'
          : 'Déchiffrage de la recette...',
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
    e.target.value = '';
    if (!file) return;

    setError(null);
    let finalFile = file;
    try {
      finalFile = await compressImage(file);
    } catch {
      // Conserver fichier brut si échec
    }

    const preview = URL.createObjectURL(finalFile);
    setSelectedImages([finalFile]);
    setPreviewUrls([preview]);

    // Analyse instantanée
    processAndScan([finalFile]);
  };

  // 2. Mode multi-pages : ajout d'une photo prise via la caméra
  const handleAddPageCamera = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    let finalFile = file;
    try {
      finalFile = await compressImage(file);
    } catch {
      // Conserver brut
    }

    const preview = URL.createObjectURL(finalFile);
    setSelectedImages((prev) => [...prev, finalFile]);
    setPreviewUrls((prev) => [...prev, preview]);
    setIsMultiPageMode(true);
  };

  // 3. Mode multi-pages : ajout de photos depuis la galerie
  const handleAddPageGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
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
        // Conserver brut
      }
      compressedFiles.push(finalFile);
      previews.push(URL.createObjectURL(finalFile));
    }

    setSelectedImages((prev) => [...prev, ...compressedFiles]);
    setPreviewUrls((prev) => [...prev, ...previews]);
    setIsMultiPageMode(true);
  };

  // 4. Galerie accueil (1 ou plusieurs photos -> analyse instantanée)
  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
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
        // Conserver brut
      }
      compressedFiles.push(finalFile);
      previews.push(URL.createObjectURL(finalFile));
    }

    setSelectedImages(compressedFiles);
    setPreviewUrls(previews);

    // Analyse directe
    processAndScan(compressedFiles);
  };

  const handleRemoveImage = (index: number) => {
    const newImgs = selectedImages.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setSelectedImages(newImgs);
    setPreviewUrls(newUrls);
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
            {isMultiPageMode && !isScanning ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedImages.length === 0) {
                    setIsMultiPageMode(false);
                  } else if (confirm('Revenir au menu principal ? Les pages ajoutées seront réinitialisées.')) {
                    handleReset();
                  }
                }}
                className="p-1.5 -ml-1.5 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
                title="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <h2 className="text-lg font-bold text-stone-900 font-serif">
              {isMultiPageMode ? 'Recette multi-pages' : 'Scanner une recette'}
            </h2>
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
                    <div
                      key={idx}
                      className="relative w-12 h-16 rounded-lg overflow-hidden border border-stone-200 shadow-xs"
                    >
                      <img
                        src={url}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center font-bold">
                        P.{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isMultiPageMode ? (
            /* Écran du Mode Multi-pages (recette sur 2 pages ou plus) */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Pages ajoutées ({selectedImages.length})</span>
                </span>
                {selectedImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => multiCameraInputRef.current?.click()}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Prendre page {selectedImages.length + 1}
                  </button>
                )}
              </div>

              {selectedImages.length === 0 ? (
                /* Aucune page encore prise en multi-pages */
                <div className="py-6 text-center space-y-4 bg-stone-50 rounded-3xl p-5 border border-dashed border-stone-300">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800">
                      Ajoutez les pages de votre recette
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                      Prenez chaque page l&apos;une après l&apos;autre, ou importez-les toutes depuis votre galerie.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => multiCameraInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Prendre la Page 1 (Appareil photo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => multiGalleryInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-200 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-stone-500" />
                      <span>Choisir depuis la galerie</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Liste des pages capturées */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-stone-100 border border-stone-200 shadow-xs group"
                      >
                        <img
                          src={url}
                          alt={`Page ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                          Page {idx + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                          title="Supprimer cette page"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Carte pour ajouter la page suivante */}
                    <button
                      type="button"
                      onClick={() => multiCameraInputRef.current?.click()}
                      className="rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-400 aspect-[3/4] flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50/50 transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold">Page suivante</span>
                      <span className="text-[10px] text-stone-400">Appareil photo</span>
                    </button>
                  </div>

                  {/* Actions d'ajout complémentaire */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => multiGalleryInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                      <span>Ajouter depuis galerie</span>
                    </button>
                  </div>

                  {/* Bouton pour déclencher l'analyse */}
                  <button
                    type="button"
                    onClick={() => processAndScan(selectedImages)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer mt-3"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>
                      Analyser les {selectedImages.length} page
                      {selectedImages.length > 1 ? 's' : ''} avec l&apos;IA
                    </span>
                  </button>
                </>
              )}
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
                onClick={() => setIsMultiPageMode(true)}
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
            </div>
          )}
        </div>

        {/* Inputs fichiers TOUJOURS présents dans le DOM (hors des ternaires) */}
        {/* 1. Appareil photo instantané */}
        <input
          ref={directCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
          onChange={handleDirectPhoto}
          className="hidden"
        />

        {/* 2. Appareil photo mode multi-pages */}
        <input
          ref={multiCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
          onChange={handleAddPageCamera}
          className="hidden"
        />

        {/* 3. Galerie accueil (avec option multiple) */}
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
          onChange={handleGallerySelect}
          className="hidden"
        />

        {/* 4. Galerie mode multi-pages (pour ajouter des photos à la liste en cours) */}
        <input
          ref={multiGalleryInputRef}
          type="file"
          multiple
          accept="image/*"
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
          onChange={handleAddPageGallery}
          className="hidden"
        />
      </div>
    </div>
  );
}
