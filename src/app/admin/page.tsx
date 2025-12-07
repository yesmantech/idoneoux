
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];

// Properly typed join result
type QuestionListItem = QuestionRow & {
  subjects: SubjectRow | null;
  quizzes: QuizRow | null;
};

export default function AdminQuestionsPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("questions")
        .select(
          `
          *,
          subjects(*),
          quizzes(*)
        `
        )
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      // Cast needed because Supabase types joins as array or object depending on relationship
      setQuestions((data as unknown) as QuestionListItem[]);
    } catch (err: any) {
      console.error("Errore caricando domande:", err);
      setError(err.message || "Errore imprevisto.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleToggleArchived = async (q: QuestionListItem) => {
    const newValue = !q.is_archived;
    try {
      const { error } = await supabase
        .from("questions")
        .update({ is_archived: newValue })
        .eq("id", q.id);

      if (error) throw error;

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id ? { ...item, is_archived: newValue } : item
        )
      );
    } catch (err) {
      console.error(err);
      alert("Errore nel cambiare lo stato della domanda.");
    }
  };

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((question) => {
      if (!showArchived && question.is_archived) return false;
      if (!term) return true;

      const text = (question.text || "").toLowerCase();
      const subjName = (question.subjects?.name || "").toLowerCase();
      const quizTitle = (question.quizzes?.title || "").toLowerCase();

      return (
        text.includes(term) ||
        subjName.includes(term) ||
        quizTitle.includes(term)
      );
    });
  }, [questions, search, showArchived]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

        {/* NAV ADMIN */}
        <nav className="mb-8 flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded-md text-sm font-medium border bg-white text-slate-900 border-white shadow-sm transition-colors">
            Domande
          </button>
          <button
            onClick={() => router.push("/admin/structure")}
            className="px-4 py-2 rounded-md text-sm font-medium border bg-slate-900 text-emerald-400 border-emerald-900 hover:border-emerald-500 hover:text-white transition-colors"
          >
            Struttura (Categorie/Ruoli)
          </button>
          <button
            onClick={() => router.push("/admin/quiz")}
            className="px-4 py-2 rounded-md text-sm font-medium border bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500 hover:text-white transition-colors"
          >
            Concorsi &amp; Materie
          </button>
          <button
            onClick={() => router.push("/admin/images")}
            className="px-4 py-2 rounded-md text-sm font-medium border bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500 hover:text-white transition-colors"
          >
            Immagini
          </button>
          <button
            onClick={() => router.push("/admin/upload-csv")}
            className="px-4 py-2 rounded-md text-sm font-medium border bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500 hover:text-white transition-colors"
          >
            Upload CSV
          </button>
        </nav>

        {/* FILTRI */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex-1 max-w-lg">
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 outline-none transition-colors"
              placeholder="Cerca domanda, materia o concorso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-sky-600"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              <span>Mostra archiviate</span>
            </label>
            <button
              type="button"
              onClick={loadQuestions}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              Ricarica
            </button>
          </div>
        </div>

        {/* LISTA DOMANDE */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-sm">
          {loading ? (
            <p className="p-8 text-slate-400 text-sm text-center animate-pulse">
              Caricamento domande...
            </p>
          ) : error ? (
            <p className="p-8 text-red-400 text-sm text-center">{error}</p>
          ) : filteredQuestions.length === 0 ? (
            <p className="p-8 text-slate-400 text-sm text-center">
              Nessuna domanda trovata.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm text-slate-400 border-b border-slate-800 uppercase font-medium z-10">
                  <tr>
                    <th className="py-3 px-4 w-20">ID</th>
                    <th className="py-3 px-4">Testo</th>
                    <th className="py-3 px-4 w-32">Materia</th>
                    <th className="py-3 px-4 w-40">Concorso</th>
                    <th className="py-3 px-4 w-24">Stato</th>
                    <th className="py-3 px-4 w-32 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredQuestions.map((q) => {
                    const shortId = q.id.slice(0, 6);
                    const truncatedText = q.text && q.text.length > 120
                        ? `${q.text.slice(0, 120)}...`
                        : q.text || "(senza testo)";

                    const subjectLabel = q.subjects?.name || (q.subject_id ? "..." : "-");
                    const quizLabel = q.quizzes?.title || (q.quiz_id ? "..." : "-");
                    
                    // Check for missing data (simple heuristic)
                    const hasMissingData = !q.correct_option && !(q as any).correct_answer;

                    return (
                      <tr
                        key={q.id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                          {shortId}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-medium relative">
                          {hasMissingData && (
                            <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-red-600 rounded-full" title="Risposta corretta mancante">!</span>
                          )}
                          {truncatedText}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {subjectLabel}
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]" title={quizLabel}>
                          {quizLabel}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            q.is_archived
                              ? "bg-slate-800 text-slate-400 border-slate-700"
                              : "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                          }`}>
                            {q.is_archived ? "Archiviata" : "Attiva"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Link
                            href={`/admin/questions/${q.id}`}
                            className="text-sky-400 hover:text-sky-300 font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleToggleArchived(q)}
                            className={`${q.is_archived ? "text-emerald-400 hover:text-emerald-300" : "text-rose-400 hover:text-rose-300"} font-medium`}
                          >
                            {q.is_archived ? "Ripristina" : "Archivia"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
