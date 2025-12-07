
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

export default function SimulationTypePage({ params }: { params: Promise<{ category: string; role: string; contestSlug: string }> }) {
  const { category, role, contestSlug } = use(params);
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"official" | "custom">("official");

  const handleNext = () => {
    const typeSlug = selectedType === "official" ? "ufficiale" : "personalizzata";
    router.push(`/concorsi/${category}/${role}/${contestSlug}/simulazione/${typeSlug}/regole`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="px-4 h-16 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          📄
        </div>
      </div>

      <div className="px-6 flex-1">
        <h1 className="text-xl font-bold text-center mb-6">Scegli il tipo di simulazione</h1>

        <div className="space-y-4 mb-8">
          {/* Official Card */}
          <div 
            onClick={() => setSelectedType("official")}
            className={`relative rounded-3xl border-2 p-5 transition-all cursor-pointer ${
              selectedType === "official" ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-1">
                 <span>⏰</span><span>📅</span>
              </div>
              {selectedType === "official" && <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
            </div>
            <h3 className="font-bold text-lg mb-1">Simulazione d'esame</h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Allenati con una simulazione completa che replica il test ufficiale. Stesse regole, stesso tempo, stessa difficoltà.
            </p>
            <div className="flex gap-2">
               <span className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">IT 20</span>
               <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">15</span>
               <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">30</span>
            </div>
          </div>

          {/* Custom Card */}
          <div 
            onClick={() => setSelectedType("custom")}
            className={`relative rounded-3xl border-2 p-5 transition-all cursor-pointer ${
              selectedType === "custom" ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-1">
                 <span>🧩</span>
              </div>
              {selectedType === "custom" && <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
            </div>
            <h3 className="font-bold text-lg mb-1">Prova personalizzata</h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Costruisci la tua prova su misura. Scegli le materie e il numero di quesiti.
            </p>
          </div>
        </div>

        {/* Course List (Visual Only) */}
        <div className="pl-2">
          <div className="space-y-1 text-sm font-medium font-serif">
            <p>corsi</p>
            <p className="opacity-70">elenco corsi</p>
            <p className="opacity-60">elenco corsi</p>
            <p className="opacity-50">elenco corsi</p>
            <p className="opacity-40">elenco corsi</p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-6 mt-auto">
        <button 
          onClick={handleNext}
          className="w-full py-4 rounded-2xl border-2 border-slate-900 text-center font-bold hover:bg-slate-900 hover:text-white transition-colors"
        >
          Inizia esercitazione
        </button>
      </div>
    </div>
  );
}
