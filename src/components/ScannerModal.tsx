'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Sparkles, Loader2, PenTool, BookOpen } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { ExtractedRecipeData } from '@/types/database';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ExtractedRecipeData, imageFile: File | null) => void;
}

export default function ScannerModal({ isOpen, onClose, onScanComplete }: ScannerModalProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isHandwritten, setIsHandwritten] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleStartScan = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setError(null);
    setStatusMessage("Envoi de l'image...");

    try {
      const steps = [
        "Déchiffrage de l'écriture...",
        'Analyse des ingrédients et dosages...',
        'Formatage des étapes de cuisine...',
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < steps.length) {
          setStatusMessage(steps[stepIndex]);
        }
      }, 1400);

      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('isHandwritten', String(isHandwritten));

      const res = await fetch('/api/scan-recipe', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Erreur lors du scan.');
      }

      onScanComplete(json.data, selectedImage);
      handleReset();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de numériser cette recette.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setIsScanning(false);
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

          {/* Mode Selector */}
          <div className="flex rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setIsHandwritten(true)}
              disabled={isScanning}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isHandwritten
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-amber-600" />
              <span>Manuscrit</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHandwritten(false)}
              disabled={isScanning}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                !isHandwritten
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-600" />
              <span>Imprimé / Livre</span>
            </button>
          </div>

          {/* Image Selection or Preview */}
          {!previewUrl ? (
            <div className="space-y-3">
              {/* Take Photo */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 active:scale-[0.98] transition-all cursor-pointer text-amber-900"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm">Prendre une photo</div>
                  <div className="text-xs text-amber-700/80">Ouvre l&apos;appareil photo mobile</div>
                </div>
              </button>

              {/* Upload from Gallery */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 active:scale-[0.98] transition-all cursor-pointer text-stone-700"
              >
                <ImageIcon className="w-5 h-5 text-stone-500" />
                <span className="text-sm font-medium">Choisir depuis la galerie</span>
              </button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-stone-900 shadow-inner flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Aperçu recette"
                  className="w-full h-full object-contain"
                />
                {!isScanning && (
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isScanning ? (
                <div className="py-4 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-600 animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-stone-700 animate-pulse">
                    {statusMessage}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    L&apos;IA déchiffre la recette en temps réel...
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Analyser avec l&apos;IA</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
