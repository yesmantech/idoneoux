
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

export default function RulesPage({ params }: { params: Promise<{ category: string; role: string; contestSlug: string; type: string }> }) {
  const { contestSlug, type } = use(params);
  const router = useRouter();

  // In a real app, fetch config based on contestSlug and type
  const quizId = "test"; // Assuming we map to a specific quiz ID or use the slug

  const handleStart = () => {
    // Map to the existing quiz engine route
    // Assuming the quiz engine is at /quiz/[id]/official
    // We pass the contestSlug as the ID
    router.push(`/quiz/${contestSlug}/official`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col p-6">
      
      <div className="flex-1 flex flex-col items-center pt-10">
        <p className="text-lg font-handwriting mb-6">regole prova</p>
        
        <h1 className="text-3xl font-bold mb-2">Pronto alla prova?</h1>
        <p className="text-sm text-slate-500 text-center mb-8 max-w-xs">
          Ecco un riepilogo delle informazioni prima di iniziare.
        </p>

        {/* Stats Pills */}
        <div className="w-full bg-white rounded-2xl border-2 border-slate-900 p-4 mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span>⏰</span>
                <span className="font-bold text-sm">Durata</span>
              </div>
              <span className="font-mono">100 minuti</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>📑</span>
                <span className="font-bold text-sm">Domande totali</span>
              </div>
              <span className="font-mono">150</span>
            </div>
          </div>
        </div>

        {/* Scoring Rules */}
        <div className="w-full bg-white rounded-3xl border-2 border-slate-900 p-5 mb-8">
          <p className="text-sm font-medium mb-4">Criteri di valutazione</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-xs">✓</div>
                 <span className="text-sm">Risposta corretta</span>
               </div>
               <span className="font-bold">+1</span>
            </div>
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-xs">-</div>
                 <span className="text-sm">Senza risposta</span>
               </div>
               <span className="font-bold">0</span>
            </div>
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-xs">✕</div>
                 <span className="text-sm">Risposta errata</span>
               </div>
               <span className="font-bold">-1</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-slate-500 leading-relaxed max-w-xs mb-8">
          Allenati come se fosse il giorno dell'esame. Una volta avviata la simulazione, il tempo partirà automaticamente.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" className="w-5 h-5 rounded border-2 border-slate-900" />
          <span className="text-sm font-medium">Non mostrare più</span>
        </div>
      </div>

      <button 
        onClick={handleStart}
        className="w-full py-4 rounded-2xl border-2 border-slate-900 text-center font-bold hover:bg-slate-900 hover:text-white transition-colors"
      >
        inizia esercitazione
      </button>
    </div>
  );
}
