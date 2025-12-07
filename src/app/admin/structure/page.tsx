
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// --- Types Local to this Admin Page ---
type Category = { id: string; slug: string; title: string; description: string; is_featured: boolean };
type Role = { id: string; category_id: string; slug: string; title: string; order_index: number };
type Quiz = { id: string; title: string; slug: string; year: number; is_official: boolean; role_id: string };

// Simple Slugify Helper
const slugify = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

export default function AdminStructurePage() {
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  // Selection State (Column Navigation)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);

  // Form State - Category
  const [catTitle, setCatTitle] = useState("");
  const [catSlug, setCatSlug] = useState("");
  
  // Form State - Role
  const [roleTitle, setRoleTitle] = useState("");
  const [roleSlug, setRoleSlug] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [c, r, q] = await Promise.all([
      supabase.from("categories").select("*").order("title"),
      supabase.from("roles").select("*").order("order_index"),
      supabase.from("quizzes").select("id, title, slug, year, is_official, role_id").order("created_at", { ascending: false })
    ]);
    
    if (c.data) setCategories(c.data);
    if (r.data) setRoles(r.data);
    if (q.data) setQuizzes(q.data);
    setLoading(false);
  };

  // --- ACTIONS: Category ---
  const handleAddCategory = async () => {
    if (!catTitle) return;
    const slug = catSlug || slugify(catTitle);
    const { error } = await supabase.from("categories").insert({ title: catTitle, slug });
    if (!error) {
        setCatTitle(""); setCatSlug(""); loadData();
    } else {
        alert(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if(!confirm("Cancella categoria e tutto il contenuto?")) return;
    await supabase.from("categories").delete().eq("id", id);
    if (selectedCatId === id) setSelectedCatId(null);
    loadData();
  };

  // --- ACTIONS: Role ---
  const handleAddRole = async () => {
    if (!roleTitle || !selectedCatId) return;
    const slug = roleSlug || slugify(roleTitle);
    const { error } = await supabase.from("roles").insert({ 
        title: roleTitle, 
        slug, 
        category_id: selectedCatId,
        order_index: roles.filter(r => r.category_id === selectedCatId).length + 1
    });
    if (!error) {
        setRoleTitle(""); setRoleSlug(""); loadData();
    } else {
        alert(error.message);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if(!confirm("Cancella ruolo?")) return;
    await supabase.from("roles").delete().eq("id", id);
    if (selectedRoleId === id) setSelectedRoleId(null);
    loadData();
  };

  // --- Filtered Lists ---
  const visibleRoles = useMemo(() => roles.filter(r => r.category_id === selectedCatId), [roles, selectedCatId]);
  const visibleQuizzes = useMemo(() => quizzes.filter(q => q.role_id === selectedRoleId), [quizzes, selectedRoleId]);

  const selectedCat = categories.find(c => c.id === selectedCatId);
  const selectedRole = roles.find(r => r.id === selectedRoleId);

  if (loading) return <div className="p-8 text-slate-400">Caricamento struttura...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <div>
                <Link href="/admin" className="text-xs text-slate-400 hover:text-white">← Dashboard</Link>
                <h1 className="text-2xl font-bold text-slate-100">Gestione Struttura</h1>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
            
            {/* COLUMN 1: CATEGORIES */}
            <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="font-bold text-emerald-400">1. Categorie</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {categories.map(c => (
                        <div 
                            key={c.id}
                            onClick={() => { setSelectedCatId(c.id); setSelectedRoleId(null); }}
                            className={`p-3 rounded-lg cursor-pointer border transition-all flex justify-between group ${
                                selectedCatId === c.id 
                                ? "bg-emerald-900/20 border-emerald-500/50 ring-1 ring-emerald-500/20" 
                                : "bg-slate-950 border-slate-800 hover:border-slate-600"
                            }`}
                        >
                            <div>
                                <div className="font-medium text-sm text-slate-200">{c.title}</div>
                                <div className="text-[10px] text-slate-500">/{c.slug}</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id); }}
                                className="text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-400 px-2"
                            >×</button>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-800 bg-slate-950/30 space-y-2">
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" 
                        placeholder="Nuova Categoria..." 
                        value={catTitle} 
                        onChange={e => { setCatTitle(e.target.value); setCatSlug(slugify(e.target.value)); }}
                    />
                     <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-500" 
                        placeholder="Slug automatico" 
                        value={catSlug} 
                        onChange={e => setCatSlug(e.target.value)}
                    />
                    <button onClick={handleAddCategory} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 rounded font-bold">Aggiungi</button>
                </div>
            </div>

            {/* COLUMN 2: ROLES */}
            <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-opacity ${!selectedCatId ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="font-bold text-sky-400">2. Ruoli</h2>
                    {selectedCat && <p className="text-[10px] text-slate-500 mt-1">in {selectedCat.title}</p>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                     {visibleRoles.length === 0 && <p className="text-xs text-slate-500 text-center mt-10">Nessun ruolo creato.</p>}
                     {visibleRoles.map(r => (
                        <div 
                            key={r.id}
                            onClick={() => setSelectedRoleId(r.id)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all flex justify-between group ${
                                selectedRoleId === r.id 
                                ? "bg-sky-900/20 border-sky-500/50 ring-1 ring-sky-500/20" 
                                : "bg-slate-950 border-slate-800 hover:border-slate-600"
                            }`}
                        >
                            <div>
                                <div className="font-medium text-sm text-slate-200">{r.title}</div>
                                <div className="text-[10px] text-slate-500">/{r.slug}</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }}
                                className="text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-400 px-2"
                            >×</button>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-800 bg-slate-950/30 space-y-2">
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" 
                        placeholder="Nuovo Ruolo (es. Maresciallo)..." 
                        value={roleTitle} 
                        onChange={e => { setRoleTitle(e.target.value); setRoleSlug(slugify(e.target.value)); }}
                    />
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-500" 
                        placeholder="Slug" 
                        value={roleSlug} 
                        onChange={e => setRoleSlug(e.target.value)}
                    />
                    <button onClick={handleAddRole} className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs py-1.5 rounded font-bold">Aggiungi Ruolo</button>
                </div>
            </div>

            {/* COLUMN 3: CONTESTS (Quizzes) */}
            <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-opacity ${!selectedRoleId ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="font-bold text-amber-400">3. Concorsi</h2>
                    {selectedRole && <p className="text-[10px] text-slate-500 mt-1">per {selectedRole.title}</p>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {visibleQuizzes.length === 0 && <p className="text-xs text-slate-500 text-center mt-10">Nessun concorso collegato.</p>}
                    {visibleQuizzes.map(q => (
                        <div key={q.id} className="p-3 rounded-lg border bg-slate-950 border-slate-800 flex flex-col gap-2 hover:border-amber-500/30 transition-colors">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm text-slate-200 leading-tight">{q.title}</h4>
                                {q.year && <span className="text-[10px] bg-slate-800 px-1.5 rounded">{q.year}</span>}
                            </div>
                            <div className="flex justify-between items-end mt-1">
                                <span className="text-[10px] text-slate-500 font-mono">{q.slug || "no-slug"}</span>
                                <div className="flex gap-2">
                                    <Link href={`/concorsi/${selectedCat?.slug}/${selectedRole?.slug}/${q.slug || q.id}`} target="_blank" className="text-[10px] text-emerald-400 hover:underline">Preview ↗</Link>
                                    <Link href={`/admin/quiz`} className="text-[10px] text-amber-400 hover:underline">Modifica</Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-800 bg-slate-950/30">
                    <Link href="/admin/quiz">
                        <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs py-2 rounded font-medium">
                            Gestisci / Crea Concorsi
                        </button>
                    </Link>
                    <p className="text-[10px] text-slate-500 text-center mt-2">
                        Vai al pannello completo per creare concorsi e collegarli a questo ruolo.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
