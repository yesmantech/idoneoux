
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, type Category } from "@/lib/data";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* Top Section */}
      <div className="p-4 space-y-4">
        {/* Hero / Blog Card */}
        <div className="w-full h-48 bg-slate-200 rounded-3xl relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
            <span className="text-white font-bold text-lg">Blog & Novità</span>
          </div>
        </div>

        {/* Horizontal Scroll (Placeholder for secondary hero items) */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="w-32 h-24 bg-sky-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-sky-800 text-xs font-bold">
            News
          </div>
          <div className="w-32 h-24 bg-emerald-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-emerald-800 text-xs font-bold">
            Bandi
          </div>
          <div className="w-32 h-24 bg-amber-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-amber-800 text-xs font-bold">
            Guide
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            placeholder="banche dati, bandi, materie" 
            className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-slate-900 bg-white text-sm placeholder-slate-500 focus:outline-none"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
               <span className="text-white text-[10px]">🔍</span>
            </div>
          </div>
        </div>
      </div>

      {/* In Primo Piano */}
      <div className="mt-4 px-4">
        <h2 className="text-lg font-bold mb-3">In primo piano</h2>
        
        {loading ? (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
             {[1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-slate-100 rounded-2xl"></div>)}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/concorsi/${cat.slug}`} className="group">
                <div className="aspect-[3/4] bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-2 text-center hover:border-slate-900 transition-colors">
                  <div className="w-10 h-10 bg-slate-300 rounded-full mb-2"></div>
                  <span className="text-[10px] font-semibold leading-tight">{cat.title}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Nessuna categoria disponibile.</p>
        )}
      </div>

      {/* Suggeriti */}
      <div className="mt-8 px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Suggeriti</h2>
          <span className="text-slate-400 text-xl">›</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-32 aspect-[3/4] bg-slate-50 rounded-2xl border border-slate-200 flex-shrink-0"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
