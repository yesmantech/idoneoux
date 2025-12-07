
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getContestBySlug, type Contest } from "@/lib/data";

export default function ContestPage({ params }: { params: Promise<{ category: string; role: string; contestSlug: string }> }) {
  const { category, role, contestSlug } = use(params);
  const router = useRouter();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStats, setHasStats] = useState(false); // Toggle for UI demo

  useEffect(() => {
    getContestBySlug(contestSlug).then((data) => {
      setContest(data);
      setLoading(false);
    });
  }, [contestSlug]);

  if (loading) return <div className="p-8 text-center text-slate-400">Caricamento...</div>;
  if (!contest) return <div className="p-8 text-center">Concorso non trovato</div>;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 h-16">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-24 h-10 border border-slate-900 rounded-lg flex items-center justify-center font-bold text-sm">
          LOGO
        </div>
        <div className="w-8 h-8 flex items-center justify-center bg-amber-100 rounded-full text-amber-600">
          🏆
        </div>
      </div>

      <div className="px-6 mt-4">
        {/* Titles */}
        <div className="text-center mb-6">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            Preparazione per la prova scritta di preselezione
          </p>
          <h1 className="text-xl font-bold leading-tight">
            {contest.title}
          </h1>
        </div>

        {/* Info Box */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 text-xs text-slate-600 leading-relaxed">
          <div className="flex gap-2 mb-2">
            <span className="text-blue-600 font-bold">ℹ️</span>
            <p>{contest.description || "Nessuna descrizione aggiuntiva."}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-200 pt-2">
            Questa è una BANCA DATI DI ESERCITAZIONE NON UFFICIALE, utile per prepararsi in modo efficace.
          </p>
        </div>

        {/* Main CTA */}
        <Link 
          href={`/concorsi/${category}/${role}/${contestSlug}/simulazione`}
          className="block w-full py-3 rounded-xl border-2 border-slate-900 text-center font-bold hover:bg-slate-900 hover:text-white transition-colors mb-8"
        >
          Crea o avvia simulazione
        </Link>

        {/* Register / Stats */}
        <div className="mb-8">
          <h3 className="text-center text-sm text-slate-500 mb-3">Registro esercitazioni</h3>
          
          {/* Toggle for demo purposes */}
          <div className="flex justify-center mb-4 opacity-30">
            <button onClick={() => setHasStats(!hasStats)} className="text-[10px] underline">
              (Toggle Demo State)
            </button>
          </div>

          {hasStats ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
               {[1, 2, 3].map(i => (
                 <div key={i} className="w-28 h-24 flex-shrink-0 rounded-2xl border border-slate-200 p-3 flex flex-col justify-between bg-white shadow-sm">
                   <div className="text-[10px] text-slate-400">Simulazione #{i}</div>
                   <div className="text-center font-bold text-lg">7/10</div>
                   <div className="text-[10px] text-slate-400 text-right">20 min</div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 text-center">
              <p className="text-sm font-medium mb-1">Non hai ancora completato nessuna esercitazione!</p>
              <p className="text-xs text-slate-500">Inizia la prima simulazione per tracciare i tuoi progressi.</p>
            </div>
          )}
        </div>

        {/* Tools */}
        <div>
          <h3 className="text-sm font-semibold mb-3 ml-1">Strumenti utili</h3>
          <div className="space-y-3">
            {["Guida", "Manuali di Preparazione", "Condividi banca dati"].map((item) => (
              <button key={item} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-900 bg-white">
                <span className="font-medium">{item}</span>
                <span className="text-slate-400">›</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
