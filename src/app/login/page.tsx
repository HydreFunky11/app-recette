import AuthForm from '@/components/AuthForm';
import { UtensilsCrossed, Sparkles, BookOpenCheck, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-stone-50 flex flex-col justify-between px-4 py-8 max-w-md mx-auto">
      {/* En-tête */}
      <div className="pt-4 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-600 shadow-inner mb-1 ring-8 ring-amber-500/5">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
          GourmetScan
        </h1>
        <p className="text-stone-600 text-xs max-w-xs mx-auto leading-relaxed">
          Numérisez vos recettes manuscrites ou imprimées en quelques secondes grâce à l&apos;intelligence artificielle.
        </p>
      </div>

      {/* Formulaire d'authentification Email + Google */}
      <div className="my-6 bg-white/80 backdrop-blur-sm p-5 rounded-3xl border border-stone-200/80 shadow-sm">
        <AuthForm />
      </div>

      {/* Points forts récap */}
      <div className="space-y-2 bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] text-stone-600 font-medium">
            Déchiffre l&apos;écriture cursive et les carnets anciens
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] text-stone-600 font-medium">
            Données privées sauvegardées sur votre cloud personnel
          </span>
        </div>
      </div>
    </main>
  );
}
