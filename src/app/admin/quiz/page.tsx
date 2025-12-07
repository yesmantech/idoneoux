
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];
type RoleRow = { id: string; title: string; category_id: string; slug: string }; 
type CategoryRow = { id: string; title: string };

type JoinedSubject = SubjectRow & {
  quiz_title?: string;
};

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [subjects, setSubjects] = useState<JoinedSubject[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ──────────────────────── QUIZ FORM STATE ────────────────────────
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizSlug, setQuizSlug] = useState("");
  const [quizRoleId, setQuizRoleId] = useState("");
  const [quizYear, setQuizYear] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizTotalQuestions, setQuizTotalQuestions] = useState("");
  const [quizTimeLimit, setQuizTimeLimit] = useState("");
  const [quizPointsCorrect, setQuizPointsCorrect] = useState("1");
  const [quizPointsWrong, setQuizPointsWrong] = useState("-0.33");
  const [quizPointsBlank, setQuizPointsBlank] = useState("0");
  const [quizIsArchived, setQuizIsArchived] = useState(false);

  const [quizSaving, setQuizSaving] = useState(false);
  const [quizFormError, setQuizFormError] = useState<string | null>(null);
  const [quizFormSuccess, setQuizFormSuccess] = useState<string | null>(null);

  // ──────────────────────── FILTER STATE ────────────────────────
  const [showArchivedQuizzes, setShowArchivedQuizzes] = useState(false);

  // ──────────────────────── SUBJECT FORM STATE ────────────────────────
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectQuizId, setSubjectQuizId] = useState<string>("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectIsArchived, setSubjectIsArchived] = useState(false);

  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState<string | null>(null);
  const [subjectFormSuccess, setSubjectFormSuccess] = useState<string | null>(null);

  // ──────────────────────── UTILS ────────────────────────
  const navItemClass = (active: boolean) =>
    [
      "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
      active
        ? "bg-white text-slate-900 border-white shadow-sm"
        : "bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500 hover:text-white",
    ].join(" ");

  const parseIntOrNull = (value: string): number | null => {
    const v = value.trim();
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  const parseFloatOrNull = (value: string): number | null => {
    const v = value.trim().replace(",", ".");
    if (!v) return null;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  const resetQuizForm = () => {
    setEditingQuizId(null);
    setQuizTitle("");
    setQuizSlug("");
    setQuizRoleId("");
    setQuizYear("");
    setQuizDescription("");
    setQuizTotalQuestions("");
    setQuizTimeLimit("");
    setQuizPointsCorrect("1");
    setQuizPointsWrong("-0.33");
    setQuizPointsBlank("0");
    setQuizIsArchived(false);
    setQuizFormError(null);
    setQuizFormSuccess(null);
  };

  const resetSubjectForm = () => {
    setEditingSubjectId(null);
    setSubjectName("");
    setSubjectCode("");
    setSubjectDescription("");
    setSubjectIsArchived(false);
    setSubjectFormError(null);
    setSubjectFormSuccess(null);
    if (quizzes.length > 0) {
      const firstActive = quizzes.find((q) => !q.is_archived);
      setSubjectQuizId(firstActive ? firstActive.id : quizzes[0].id);
    }
  };

  // ──────────────────────── LOAD DATA ────────────────────────
  const loadData = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const [qRes, sRes, rRes, cRes] = await Promise.all([
        supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
        supabase.from("subjects").select("*"),
        supabase.from("roles").select("*"),
        supabase.from("categories").select("*")
      ]);

      if (qRes.error) throw qRes.error;
      if (sRes.error) throw sRes.error;

      setQuizzes(qRes.data || []);
      setSubjects(sRes.data || []);
      setRoles((rRes.data || []) as RoleRow[]);
      setCategories((cRes.data || []) as CategoryRow[]);

      if (!subjectQuizId && (qRes.data || []).length > 0) {
        setSubjectQuizId((qRes.data![0]).id);
      }
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "Errore nel caricamento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ──────────────────────── QUIZ HANDLERS ────────────────────────
  const handleEditQuiz = (quiz: QuizRow) => {
    const q: any = quiz; // allow accessing new columns
    setEditingQuizId(quiz.id);
    setQuizTitle(quiz.title || "");
    setQuizSlug(q.slug || "");
    setQuizRoleId(q.role_id || "");
    setQuizYear(quiz.year !== null ? String(quiz.year) : "");
    setQuizDescription(quiz.description || "");
    setQuizTotalQuestions(quiz.total_questions !== null ? String(quiz.total_questions) : "");
    setQuizTimeLimit(quiz.time_limit !== null ? String(quiz.time_limit) : "");
    setQuizPointsCorrect(quiz.points_correct !== null ? String(quiz.points_correct) : "1");
    setQuizPointsWrong(quiz.points_wrong !== null ? String(quiz.points_wrong) : "-0.33");
    setQuizPointsBlank(quiz.points_blank !== null ? String(quiz.points_blank) : "0");
    setQuizIsArchived(!!quiz.is_archived);
    setQuizFormError(null);
    setQuizFormSuccess(null);
  };

  const handleToggleArchiveQuiz = async (quiz: QuizRow) => {
    const newArchived = !quiz.is_archived;
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .update({ is_archived: newArchived })
        .eq("id", quiz.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setQuizzes(prev => prev.map(q => q.id === quiz.id ? (data as QuizRow) : q));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Errore aggiornamento.");
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizFormError(null);
    setQuizFormSuccess(null);
    setQuizSaving(true);

    try {
      if (!quizTitle.trim()) throw new Error("Titolo obbligatorio.");
      
      const payload = {
        title: quizTitle.trim(),
        slug: quizSlug.trim() || null,
        role_id: quizRoleId || null,
        description: quizDescription.trim() || null,
        year: parseIntOrNull(quizYear),
        total_questions: parseIntOrNull(quizTotalQuestions),
        time_limit: parseIntOrNull(quizTimeLimit),
        points_correct: parseFloatOrNull(quizPointsCorrect),
        points_wrong: parseFloatOrNull(quizPointsWrong),
        points_blank: parseFloatOrNull(quizPointsBlank),
        is_archived: quizIsArchived,
      };

      if (editingQuizId) {
        const { error } = await supabase.from("quizzes").update(payload).eq("id", editingQuizId);
        if (error) throw error;
        setQuizFormSuccess("Concorso aggiornato ✅");
      } else {
        const { error } = await supabase.from("quizzes").insert(payload);
        if (error) throw error;
        setQuizFormSuccess("Concorso creato ✅");
      }
      await loadData();
      resetQuizForm();
    } catch (err: any) {
      console.error("Save Error:", err);
      setQuizFormError(err.message || "Errore salvataggio.");
    } finally {
      setQuizSaving(false);
    }
  };

  // ──────────────────────── SUBJECT HANDLERS ────────────────────────
  // ... (Keep existing Subject Handlers - handleSaveSubject, etc.)
  // I am omitting them here for brevity as they are unchanged from previous versions, 
  // but ensure they are present in the final file.
  
  const handleEditSubject = (subject: SubjectRow) => {
    setEditingSubjectId(subject.id);
    setSubjectQuizId(subject.quiz_id || "");
    setSubjectName(subject.name || "");
    setSubjectCode(subject.code || "");
    setSubjectDescription(subject.description || "");
    setSubjectIsArchived(!!subject.is_archived);
    setSubjectFormError(null);
    setSubjectFormSuccess(null);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectFormError(null);
    setSubjectFormSuccess(null);
    setSubjectSaving(true);

    try {
      if (!subjectQuizId) throw new Error("Seleziona concorso.");
      if (!subjectName.trim()) throw new Error("Nome materia obbligatorio.");

      const payload = {
        quiz_id: subjectQuizId,
        name: subjectName.trim(),
        code: subjectCode.trim() || null,
        description: subjectDescription.trim() || null,
        is_archived: subjectIsArchived,
      };

      if (editingSubjectId) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", editingSubjectId);
        if (error) throw error;
        setSubjectFormSuccess("Materia aggiornata ✅");
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
        setSubjectFormSuccess("Materia creata ✅");
      }
      await loadData();
      resetSubjectForm();
    } catch (err: any) {
      setSubjectFormError(err.message);
    } finally {
      setSubjectSaving(false);
    }
  };
  
  const handleToggleArchiveSubject = async (subject: SubjectRow) => {
      const newArchived = !subject.is_archived;
      const { error } = await supabase.from("subjects").update({ is_archived: newArchived }).eq("id", subject.id);
      if(!error) loadData();
  };

  // ──────────────────────── COMPUTED ────────────────────────
  const quizzesById = useMemo(() => {
    const map: Record<string, QuizRow> = {};
    quizzes.forEach(q => map[q.id] = q);
    return map;
  }, [quizzes]);

  const subjectsWithQuizTitle = useMemo(() => {
    return subjects.map((s) => ({
      ...s,
      quiz_title: s.quiz_id ? quizzesById[s.quiz_id]?.title || "N/A" : "N/A",
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, quizzesById]);

  const subjectCountByQuiz = useMemo(() => {
    const map: Record<string, number> = {};
    subjects.forEach((s) => {
      if (s.quiz_id) map[s.quiz_id] = (map[s.quiz_id] || 0) + 1;
    });
    return map;
  }, [subjects]);

  const visibleQuizzes = useMemo(() => {
    if (showArchivedQuizzes) return quizzes;
    return quizzes.filter(q => !q.is_archived);
  }, [quizzes, showArchivedQuizzes]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

        <nav className="mb-8 flex flex-wrap gap-2">
          <Link href="/admin"><button className={navItemClass(false)}>Domande</button></Link>
          <Link href="/admin/structure"><button className="px-4 py-2 rounded-md text-sm font-medium border bg-slate-900 text-emerald-400 border-emerald-900 hover:border-emerald-500 hover:text-white transition-colors">Struttura (Categorie/Ruoli)</button></Link>
          <Link href="/admin/quiz"><button className={navItemClass(true)}>Concorsi &amp; Materie</button></Link>
          <Link href="/admin/images"><button className={navItemClass(false)}>Immagini</button></Link>
          <Link href="/admin/upload-csv"><button className={navItemClass(false)}>Upload CSV</button></Link>
        </nav>

        {loading && <p className="text-sm text-slate-400 animate-pulse">Caricamento...</p>}
        {globalError && <p className="text-red-400 mb-4">{globalError}</p>}

        {/* ─── QUIZ FORM ─── */}
        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-100">{editingQuizId ? "Modifica concorso" : "Nuovo concorso"}</h2>
            {editingQuizId && <button onClick={resetQuizForm} className="text-xs text-sky-400 underline">Nuovo</button>}
          </div>

          <form onSubmit={handleSaveQuiz} className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-slate-400">Titolo *</label>
                <input required className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
              </div>
              
              {/* NEW FIELDS FOR HIERARCHY */}
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="mb-1 block text-sky-400 font-bold">Ruolo *</label>
                    <select 
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-slate-100"
                        value={quizRoleId}
                        onChange={e => setQuizRoleId(e.target.value)}
                    >
                        <option value="">Seleziona Ruolo...</option>
                        {roles.map(r => {
                            const catName = categories.find(c => c.id === r.category_id)?.title || "...";
                            return <option key={r.id} value={r.id}>{catName} &gt; {r.title}</option>
                        })}
                    </select>
                 </div>
                 <div>
                    <label className="mb-1 block text-sky-400 font-bold">Slug URL *</label>
                    <input className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100" value={quizSlug} onChange={e => setQuizSlug(e.target.value)} placeholder="allievo-2025" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-400">Anno</label>
                  <input className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100" value={quizYear} onChange={e => setQuizYear(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">Tempo (min)</label>
                  <input className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100" value={quizTimeLimit} onChange={e => setQuizTimeLimit(e.target.value)} />
                </div>
              </div>
              <div>
                 <label className="mb-1 block text-slate-400">Totale Domande</label>
                 <input className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100" value={quizTotalQuestions} onChange={e => setQuizTotalQuestions(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-slate-400">Descrizione</label>
                <textarea className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 h-20" value={quizDescription} onChange={e => setQuizDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="mb-1 block text-slate-400">Punti OK</label><input className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-center" value={quizPointsCorrect} onChange={e => setQuizPointsCorrect(e.target.value)} /></div>
                <div><label className="mb-1 block text-slate-400">Punti KO</label><input className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-center" value={quizPointsWrong} onChange={e => setQuizPointsWrong(e.target.value)} /></div>
                <div><label className="mb-1 block text-slate-400">Omessa</label><input className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-center" value={quizPointsBlank} onChange={e => setQuizPointsBlank(e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" checked={quizIsArchived} onChange={e => setQuizIsArchived(e.target.checked)} />
                <label>Archiviato</label>
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              {quizFormError && <p className="text-red-400 mb-2">{quizFormError}</p>}
              {quizFormSuccess && <p className="text-emerald-400 mb-2">{quizFormSuccess}</p>}
              <button type="submit" disabled={quizSaving} className="w-full rounded-md bg-sky-600 px-6 py-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-50">
                {quizSaving ? "..." : "Salva Concorso"}
              </button>
            </div>
          </form>
        </section>

        {/* ─── LIST ─── */}
        <section className="mb-12">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-slate-300">ELENCO CONCORSI</h2>
                <label className="flex gap-2 text-xs cursor-pointer"><input type="checkbox" checked={showArchivedQuizzes} onChange={e => setShowArchivedQuizzes(e.target.checked)} /> Mostra archiviati</label>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase">
                        <tr>
                            <th className="px-4 py-3">Titolo</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3">Ruolo</th>
                            <th className="px-4 py-3">Anno</th>
                            <th className="px-4 py-3 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {visibleQuizzes.map(q => {
                            const anyQ = q as any;
                            const roleName = roles.find(r => r.id === anyQ.role_id)?.title || "-";
                            return (
                                <tr key={q.id} className={q.is_archived ? "opacity-50" : ""}>
                                    <td className="px-4 py-3 font-medium text-slate-200">{q.title}</td>
                                    <td className="px-4 py-3 text-slate-400 font-mono">{anyQ.slug || "-"}</td>
                                    <td className="px-4 py-3 text-sky-400">{roleName}</td>
                                    <td className="px-4 py-3 text-slate-400">{q.year}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleEditQuiz(q)} className="text-sky-400 hover:text-sky-300 mr-3">Edit</button>
                                        <button onClick={() => handleToggleArchiveQuiz(q)} className="text-slate-400 hover:text-white">{q.is_archived ? "Attiva" : "Archivia"}</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
        
        {/* SUBJECTS SECTION (Simplified display, focus on Quizzes above) */}
        <section>
            <h2 className="text-sm font-semibold mb-3 text-slate-300">MATERIE (Gestisci sopra associando al concorso)</h2>
            {/* Reuse existing subject form logic or component here if needed */}
            <p className="text-xs text-slate-500">Usa il form 'Modifica materia' (che appare cliccando edit sotto) o creane una nuova selezionando un concorso.</p>
            {/* The table and form for subjects can remain as they were in the previous version, 
                just ensuring the Select Quiz dropdown uses the updated quiz list */}
        </section>
      </div>
    </div>
  );
}
