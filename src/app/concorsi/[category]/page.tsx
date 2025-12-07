
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategoryBySlug, getRolesByCategory, type Category, type Role } from "@/lib/data";

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const router = useRouter();
  
  const [categoryData, setCategoryData] = useState<Category | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const cat = await getCategoryBySlug(category);
      if (cat) {
        setCategoryData(cat);
        const rls = await getRolesByCategory(category);
        setRoles(rls);
      }
      setLoading(false);
    };
    load();
  }, [category]);

  if (loading) return <div className="p-8 text-center text-slate-400">Caricamento...</div>;
  if (!categoryData) return <div className="p-8 text-center">Categoria non trovata</div>;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar */}
      <div className="sticky top-0 bg-white z-10 px-4 h-16 flex items-center">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="px-6 pb-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-32 h-12 border-2 border-slate-900 rounded-xl flex items-center justify-center mb-4 font-bold tracking-wider">
            LOGO
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Preparazione per la prova scritta di preselezione
          </p>
          <h1 className="text-2xl font-bold font-serif">
            {categoryData.title}
          </h1>
        </div>

        {/* Informazioni */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-2">Informazioni</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {categoryData.description || "Nessuna descrizione disponibile."}
          </p>
        </div>

        {/* Concorsi Disponibili (Roles) */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Concorsi disponibili</h3>
          <div className="space-y-3">
            {roles.map((role) => (
              <Link 
                key={role.slug} 
                href={`/concorsi/${category}/${role.slug}`}
                className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-900 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                  <span className="font-medium text-lg">{role.title}</span>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
