import GoogleSignInButton from '@/components/GoogleSignInButton';
import { UtensilsCrossed, Sparkles, BookOpenCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-stone-50 flex flex-col justify-between px-4 py-8 max-w-md mx-auto">
      {/* En-tête */}
      <div className="pt-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 shadow-inner mb-2 ring-8 ring-amber-500/5">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">
          GourmetScan
        </h1>
        <p className="text-stone-600 text-sm max-w-xs mx-auto leading-relaxed">
          Numérisez vos carnets manuscrits et recettes de famille en quelques secondes grâce à l&apos;intelligence artificielle.
        </p>
      </div>

      {/* Points forts */}
      <div className="my-8 space-y-3 bg-white/70 backdrop-blur-sm p-4 rounded-3xl border border-stone-200/60 shadow-sm">
        <div className="flex items-start gap-3 p-2">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">IA Vision Cursive</h3>
            <p className="text-xs text-stone-500">Déchiffre les écritures à la main et les cahiers anciens.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-2">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-700 mt-0.5">
            <BookOpenCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">Recettes Structurées</h3>
            <p className="text-xs text-stone-500">Ingrédients, quantités et étapes prêtes pour la cuisine.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-2">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">Espace Privé & Sécurisé</h3>
            <p className="text-xs text-stone-500">Vos recettes sont sauvegardées dans votre cloud personnel.</p>
          </div>
        </div>
      </div>

      {/* Action de Connexion */}
      <div className="space-y-4 pb-4">
        <GoogleSignInButton />
        <p className="text-center text-[11px] text-stone-400">
          En vous connectant, vous acceptez la sauvegarde de vos recettes sur votre compte privé.
        </p>
      </div>
    </main>
  );
}
