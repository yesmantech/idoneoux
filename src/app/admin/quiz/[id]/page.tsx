

"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];
type RuleRow = Database["public"]["Tables"]["quiz_subject_rules"]["Row"];

export default function AdminQuizRulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = use(params);
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [rulesMap, setRulesMap] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Carica quiz, materie, regole
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setRulesError(null);
      setSaveSuccess(null);

      try {
        // 1) Quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError || !quizData) throw new Error("Concorso non trovato.");
        setQuiz(quizData as QuizRow);

        // 2) Materie del concorso
        const { data: subjectsData, error: subjectsError } = await supabase
          .from("subjects")
          .select("*")
          .eq("quiz_id", quizId)
          .order("name", { ascending: true }); // sort by name better

        if (subjectsError) throw new Error("Errore caricando materie.");
        const subjList = (subjectsData || []) as SubjectRow[];
        setSubjects(subjList);

        // 3) Regole per materia
        const { data: rulesData, error: rulesErrorRaw } = await supabase
          .from("quiz_subject_rules")
          .select("*")
          .eq("quiz_id", quizId);

        if (rulesErrorRaw) {
          console.warn("Error reading rules:", rulesErrorRaw);
          setRules([]);
          setRulesError("Impossibile leggere le regole salvate (DB error).");
        } else {
          setRules((rulesData || []) as RuleRow[]);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Errore imprevisto.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [quizId]);

  // Mappa subject_id -> question_count
  useEffect(() => {
    const map: Record<string, number> = {};
    rules.forEach((r) => {
      if (r.subject_id) map[r.subject_id] = r.question_count ?? 0;
    });
    // Ensure all subjects have an entry
    subjects.forEach((s) => {
      if (map[s.id] === undefined) map[s.id] = 0;
    });
    setRulesMap(map);
  }, [rules, subjects]);

  const totalQuestionsFromRules = useMemo(() => {
    return Object.values(rulesMap).reduce((acc: number, v: number) => acc + (v || 0), 0);
  }, [rulesMap]);

  const handleChangeRule = (subjectId: string, value: string) => {
    const n = parseInt(value, 10);
    const safe = isNaN(n) || n < 0 ? 0 : n;
    setRulesMap((prev) => ({
      ...prev,
      [subjectId]: safe,
    }));
  };

  const handleSave = async () => {
    if (!quiz) return;
    setSaving(true);
    setSaveSuccess(null);
    setError(null);

    try {
      // 1) Delete old rules
      const { error: delError } = await supabase
        .from("quiz_subject_rules")
        .delete()
        .eq("quiz_id", quizId);

      if (delError) throw delError;

      // 2) Insert new rules (only > 0)
      const toInsert = subjects
        .map((s) => ({
          quiz_id: quizId,
          subject_id: s.id,
          question_count: rulesMap[s.id] ?? 0,
        }))
        .filter((r) => r.question_count > 0);

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("quiz_subject_rules")
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      // 3) Reload rules
      const { data: rulesData } = await supabase
        .from("quiz_subject_rules")
        .select("*")
        .eq("quiz_id", quizId);
      
      setRules((rulesData || []) as RuleRow[]);
      setSaveSuccess("Regole salvate correttamente.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-300 animate-pulse">Caricamento...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="max-w-md px-4 text-center">
          <p className="text-red-400 mb-4">{error || "Non trovato"}</p>
          <button onClick={() => router.push("/admin/quiz")} className="underline text-sm">
            Indietro
          </button>
        </div>
      </div>
    );
  }

  const expectedTotal = quiz.total_questions ?? 0;
  const hasMismatch = expectedTotal > 0 && totalQuestionsFromRules !== expectedTotal;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/admin/quiz")}
              className="text-xs text-slate-400 hover:text-white mb-2 transition-colors"
            >
              ← Torna ai concorsi
            </button>
            <h1 className="text-2xl font-bold text-slate-100">Regole Concorso</h1>
            <p className="text-slate-400 text-sm mt-1">{quiz.title} {quiz.year ? `(${quiz.year})` : ""}</p>
          </div>
          
          <div className="text-right bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Totale Domande</p>
            <div className="flex items-baseline justify-end gap-2">
              <span className={`text-2xl font-bold ${hasMismatch ? "text-amber-400" : "text-emerald-400"}`}>
                {totalQuestionsFromRules}
              </span>
              <span className="text-slate-500 text-sm">/ {expectedTotal} previste</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {rulesError && (
          <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-800 text-amber-200 text-sm">
            ⚠ {rulesError}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-800 text-emerald-200 text-sm">
            ✅ {saveSuccess}
          </div>
        )}
        {hasMismatch && (
          <div className="mb-6 p-3 rounded-lg bg-amber-900/10 border border-amber-800/50 text-amber-200 text-xs">
            <strong>Attenzione:</strong> La somma delle domande ({totalQuestionsFromRules}) non corrisponde al totale previsto nel bando ({expectedTotal}). 
            Il quiz funzionerà comunque, ma la simulazione potrebbe non essere fedele.
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          {subjects.length === 0 ? (
            <p className="p-8 text-center text-slate-500 text-sm">
              Nessuna materia associata a questo concorso.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-medium text-xs">
                <tr>
                  <th className="px-6 py-3">Materia</th>
                  <th className="px-6 py-3 w-32 text-center">Domande</th>
                  <th className="px-6 py-3 text-right">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-200">
                      {s.name}
                      {s.code && <span className="ml-2 text-xs text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{s.code}</span>}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-slate-100 focus:border-sky-500 outline-none"
                        value={rulesMap[s.id] ?? 0}
                        onChange={(e) => handleChangeRule(s.id, e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-slate-500">
                      {(rulesMap[s.id] ?? 0) === 0 ? "Esclusa" : "Inclusa"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || subjects.length === 0}
            className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-900/20 transition-all"
          >
            {saving ? "Salvataggio..." : "Salva Regole"}
          </button>
        </div>
      </div>
    </div>
  );
}