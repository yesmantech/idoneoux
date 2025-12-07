"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

export default function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id: quizId, attemptId } = use(params);
  const router = useRouter();

  const [attempt, setAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: att } = await supabase
        .from("quiz_attempts" as any)
        .select("*")
        .eq("id", attemptId)
        .single();
      
      setAttempt(att);

      if (att?.answers) {
        // Collect question IDs
        const ids = (att.answers as any[]).map((a: any) => a.question_id).filter(Boolean);
        if (ids.length > 0) {
          const { data: qs } = await supabase.from("questions").select("*").in("id", ids);
          setQuestions((qs || []) as QuestionRow[]);
        }
      }
      setLoading(false);
    };
    load();
  }, [attemptId]);

  const questionsMap = useMemo(() => {
    const map: Record<string, QuestionRow> = {};
    questions.forEach(q => map[q.id] = q);
    return map;
  }, [questions]);

  if (loading || !attempt) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button onClick={() => router.push(`/quiz/${quizId}/attempts`)} className="text-xs text-slate-400 hover:text-white mb-4">← Torna alla lista</button>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Dettaglio Prova</h1>
          <div className="text-right">
            <div className="text-3xl font-bold text-sky-400">{attempt.score.toFixed(2)}</div>
            <div className="text-xs text-slate-500 uppercase">Punteggio Finale</div>
          </div>
        </div>

        <div className="space-y-4">
          {(attempt.answers as any[]).map((ans, idx) => {
            const q = questionsMap[ans.question_id];
            if (!q) return null;
            
            const isCorrect = ans.is_correct;
            const userChoice = ans.chosen_option;
            // FIX: Added .trim() here too
            const correctChoice = q.correct_option?.trim().toLowerCase();

            return (
              <div key={idx} className={`p-5 rounded-xl border ${isCorrect ? 'border-emerald-900/50 bg-emerald-900/5' : userChoice ? 'border-rose-900/50 bg-rose-900/5' : 'border-slate-800 bg-slate-900/20'}`}>
                <div className="flex gap-3 mb-3">
                  <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-200 font-medium mb-3">{q.text}</p>
                    
                    <div className="grid gap-2">
                      {['a', 'b', 'c', 'd'].map(opt => {
                        const optText = (q as any)[`option_${opt}`];
                        const isSelected = userChoice === opt;
                        const isActuallyCorrect = correctChoice === opt;
                        
                        let style = "border-slate-800 bg-slate-900/50 opacity-60";
                        
                        if (isActuallyCorrect) {
                          style = "border-emerald-600 bg-emerald-900/20 text-emerald-200"; // Always highlight correct answer
                        } else if (isSelected && !isActuallyCorrect) {
                          style = "border-rose-600 bg-rose-900/20 text-rose-200"; // Wrong selection
                        }

                        return (
                          <div key={opt} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${style}`}>
                            <span className="uppercase font-bold w-4">{opt}</span>
                            <span>{optText}</span>
                            {isSelected && <span className="ml-auto text-[10px] uppercase font-bold opacity-70">(Tua scelta)</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}