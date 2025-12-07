"use client";

import { use, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

type AnswerOption = "a" | "b" | "c" | "d";

type CustomMode = "standard" | "errors_recent" | "most_wrong";

type SubjectStat = {
  subjectId: string;
  name: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds: number | null) {
  if (seconds === null || seconds < 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Normalize helper
function normalizeDBAnswer(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.replace(/[.,:;()\[\]]/g, "").trim().toLowerCase();
}

function getCorrectOption(q: any): string | null {
  if (!q) return null;
  if (q.correct_option) return normalizeDBAnswer(q.correct_option);
  if (q.correct_answer) return normalizeDBAnswer(q.correct_answer);
  if (q.answer) return normalizeDBAnswer(q.answer);
  return null;
}

export default function CustomQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse Query Params
  const paramModeRaw = searchParams.get("mode");
  const paramMode: CustomMode =
    paramModeRaw === "errors_recent" || paramModeRaw === "most_wrong"
      ? paramModeRaw
      : "standard";

  const paramMinutes = searchParams.get("minutes");
  const paramSubjects = searchParams.get("subjects");
  const paramDist = searchParams.get("dist");
  const paramAttempts = searchParams.get("attempts");
  const paramLimit = searchParams.get("limit");

  const selectedSubjectIds = useMemo(
    () =>
      paramSubjects
        ? paramSubjects
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [paramSubjects]
  );

  const distributionMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!paramDist) return map;
    const chunks = paramDist.split(",").map((c) => c.trim());
    chunks.forEach((chunk) => {
      const [id, raw] = chunk.split(":");
      if (!id || !raw) return;
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) map[id] = n;
    });
    return map;
  }, [paramDist]);

  // State
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerOption | null>>(
    {}
  );
  const [finished, setFinished] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: number;
    wrong: number;
    blank: number;
    score: number;
  } | null>(null);

  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectStat[]>([]);

  // Image State
  const [imgError, setImgError] = useState(false);

  // Timer
  const [customTimeLimit, setCustomTimeLimit] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  // New Modes
  const [autoNext, setAutoNext] = useState(false);
  const [instantCheck, setInstantCheck] = useState(false);
  const autoNextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUserId(user.id);

        const needAttempts =
          paramMode === "errors_recent" || paramMode === "most_wrong";
        
        const recentAttemptsLimit = paramAttempts ? parseInt(paramAttempts, 10) : 10;
        const mostWrongLimit = paramLimit ? parseInt(paramLimit, 10) : 50;

        const [
          { data: quizData, error: quizError },
          { data: subjectsData, error: subjectsError },
          { data: questionsData, error: questionsError },
          attemptsRes,
        ] = await Promise.all([
          supabase.from("quizzes").select("*").eq("id", quizId).single(),
          supabase.from("subjects").select("*").eq("quiz_id", quizId),
          supabase.from("questions").select("*").eq("quiz_id", quizId),
          needAttempts
            ? supabase
                .from("quiz_attempts" as any) 
                .select("id, answers, finished_at")
                .eq("quiz_id", quizId)
                .order("finished_at", { ascending: false })
                .limit(paramMode === "errors_recent" ? recentAttemptsLimit : 500)
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (quizError || !quizData) throw new Error("Concorso non trovato.");
        if (subjectsError) throw new Error("Errore caricamento materie.");
        if (questionsError) throw new Error("Errore caricamento domande.");

        const attemptsError = attemptsRes.error;
        if (attemptsError) throw new Error("Errore caricamento tentativi.");

        const attemptsData = (attemptsRes.data || []) as any[];
        const qz = quizData as QuizRow;
        const sbj = (subjectsData || []) as SubjectRow[];
        const qs = (questionsData || []) as QuestionRow[];

        // Active Questions
        let activeQuestions = qs.filter((q) => !q.is_archived);

        if (selectedSubjectIds.length > 0) {
          activeQuestions = activeQuestions.filter(
            (q) => q.subject_id && selectedSubjectIds.includes(q.subject_id)
          );
        }

        if (activeQuestions.length === 0) {
          throw new Error("Nessuna domanda attiva trovata per i criteri selezionati.");
        }

        const activeById: Record<string, QuestionRow> = {};
        activeQuestions.forEach((q) => {
          activeById[q.id] = q;
        });

        // Strategy Selection
        const selected: QuestionRow[] = [];

        if (paramMode === "standard") {
          if (Object.keys(distributionMap).length === 0) {
            throw new Error("Distribuzione domande non valida.");
          }
          const bySubject: Record<string, QuestionRow[]> = {};
          activeQuestions.forEach((q) => {
            if (q.subject_id) {
              if (!bySubject[q.subject_id]) bySubject[q.subject_id] = [];
              bySubject[q.subject_id].push(q);
            }
          });

          Object.entries(distributionMap).forEach(([sid, count]) => {
            const pool = bySubject[sid] || [];
            if (pool.length > 0) {
              const shuffled = shuffle(pool);
              selected.push(...shuffled.slice(0, count));
            }
          });
        } else if (paramMode === "errors_recent") {
          const seen = new Set<string>();
          outer: for (const att of attemptsData) {
            const answersArr = (att.answers || []) as any[];
            for (const ans of answersArr) {
              if (selected.length >= mostWrongLimit) break outer;
              if (ans.question_id && !ans.is_correct && !seen.has(ans.question_id) && activeById[ans.question_id]) {
                seen.add(ans.question_id);
                selected.push(activeById[ans.question_id]);
              }
            }
          }
        } else if (paramMode === "most_wrong") {
          const statsMap: Record<string, { wrong: number }> = {};
          attemptsData.forEach((att) => {
            const answersArr = (att.answers || []) as any[];
            answersArr.forEach((ans) => {
              if (ans.question_id && activeById[ans.question_id]) {
                if (!statsMap[ans.question_id]) statsMap[ans.question_id] = { wrong: 0 };
                if (!ans.is_correct) statsMap[ans.question_id].wrong++;
              }
            });
          });

          const sorted = Object.entries(statsMap)
            .filter(([, v]) => v.wrong > 0)
            .sort((a, b) => b[1].wrong - a[1].wrong)
            .map(([qid]) => activeById[qid])
            .slice(0, mostWrongLimit);
          
          selected.push(...sorted);
        }

        if (selected.length === 0) {
          throw new Error("Non ci sono abbastanza domande per generare il quiz con questi criteri.");
        }

        const initialAnswers: Record<string, AnswerOption | null> = {};
        selected.forEach((q) => (initialAnswers[q.id] = null));

        const requestedMinutes = paramMinutes ? parseInt(paramMinutes, 10) : NaN;
        const minutes = (!Number.isNaN(requestedMinutes) && requestedMinutes > 0)
          ? requestedMinutes
          : (qz.time_limit || null);

        setQuiz(qz);
        setSubjects(sbj);
        if (paramMode === "standard") {
           setSelectedQuestions(shuffle(selected));
        } else {
           setSelectedQuestions(selected);
        }
        
        setAnswers(initialAnswers);
        setCustomTimeLimit(minutes);

        if (minutes) {
          setRemainingSeconds(minutes * 60);
          setTimerActive(true);
        }
        
        setStartedAt(Date.now());

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Errore inizializzazione quiz.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [quizId, paramMode, paramMinutes, paramSubjects, paramDist, paramAttempts, paramLimit, router]);

  const subjectsMap = useMemo(() => {
    const map: Record<string, SubjectRow> = {};
    subjects.forEach((s) => (map[s.id] = s));
    return map;
  }, [subjects]);

  const totalQuestions = selectedQuestions.length;
  const currentQuestion = selectedQuestions[currentIndex];

  // Timer Effect
  useEffect(() => {
    if (!timerActive || finished || remainingSeconds === null) return;
    if (remainingSeconds <= 0) {
      handleFinish(true);
      return;
    }
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, finished, remainingSeconds]);

  // --- Reset Image Error on Question Change ---
  useEffect(() => {
    setImgError(false);
  }, [currentIndex]);

  // Handlers
  const clearAutoNextTimeout = useCallback(() => {
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
  }, []);

  const handleNext = useCallback(() => {
    clearAutoNextTimeout();
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  }, [totalQuestions, clearAutoNextTimeout]);

  const handlePrev = useCallback(() => {
    clearAutoNextTimeout();
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [clearAutoNextTimeout]);

  const handleSelectAnswer = useCallback((qId: string, opt: AnswerOption) => {
    if (finished) return;
    
    if (instantCheck && answers[qId]) return;

    setAnswers((prev) => ({ ...prev, [qId]: opt }));

    clearAutoNextTimeout();
    if (autoNext) {
      const delay = instantCheck ? 1200 : 0;
      autoNextTimeoutRef.current = setTimeout(handleNext, delay);
    }
  }, [finished, instantCheck, answers, autoNext, handleNext, clearAutoNextTimeout]);

  const handleFinish = useCallback(async (auto = false) => {
    if (finished || savingResult) return;
    setFinished(true);
    setTimerActive(false);
    setSavingResult(true);
    setSaveErrorMsg(null);
    clearAutoNextTimeout();
    
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const sbMap: Record<string, SubjectStat> = {};
    const answersPayload = [];

    const ensureStat = (sid: string | null) => {
      const key = sid || "unknown";
      if (!sbMap[key]) {
        sbMap[key] = {
          subjectId: key,
          name: sid && subjectsMap[sid] ? subjectsMap[sid].name : "Sconosciuta",
          total: 0,
          correct: 0,
          wrong: 0,
          blank: 0,
        };
      }
      return sbMap[key];
    };

    selectedQuestions.forEach((q) => {
      const ans = answers[q.id];
      const correctOpt = getCorrectOption(q);
      const isCorrect = ans && ans === correctOpt;
      const stat = ensureStat(q.subject_id);
      
      stat.total++;
      if (!ans) {
        blank++;
        stat.blank++;
      } else if (isCorrect) {
        correct++;
        stat.correct++;
      } else {
        wrong++;
        stat.wrong++;
      }

      answersPayload.push({
        question_id: q.id,
        subject_id: q.subject_id,
        chosen_option: ans,
        correct_answer: correctOpt,
        is_correct: !!isCorrect
      });
    });

    const pc = quiz?.points_correct ?? 1;
    const pw = quiz?.points_wrong ?? -0.33;
    const pb = quiz?.points_blank ?? 0;
    const score = (correct * pc) + (wrong * pw) + (blank * pb);

    setResult({ correct, wrong, blank, score });
    setSubjectBreakdown(Object.values(sbMap));

    // SAVE TO DB
    if (userId && quizId) {
      try {
        console.log("Saving custom attempt...");
        const payload = {
          quiz_id: quizId,
          user_id: userId,
          started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
          finished_at: new Date().toISOString(),
          duration_seconds: startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0,
          total_questions: selectedQuestions.length,
          correct,
          wrong,
          blank,
          score,
          answers: answersPayload
        };

        const { error: saveError } = await supabase
          .from("quiz_attempts")
          .insert(payload);

        if (saveError) {
          console.error("Error saving custom attempt:", JSON.stringify(saveError, null, 2));
          setSaveErrorMsg(`Errore salvataggio: ${saveError.message}`);
        } else {
          console.log("Custom attempt saved successfully.");
        }
      } catch (e: any) {
        console.error("Exception saving attempt:", e);
        setSaveErrorMsg("Errore imprevisto durante il salvataggio.");
      } finally {
        setSavingResult(false);
      }
    }
  }, [answers, selectedQuestions, subjectsMap, quiz, clearAutoNextTimeout, userId, quizId, startedAt, finished, savingResult]);

  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Preparazione quiz...</div>;
  if (error || !quiz) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">{error || "Errore"}</div>;

  if (finished && result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <button onClick={() => router.push(`/quiz/${quizId}`)} className="text-xs text-slate-400 hover:text-white mb-4">← Torna alla home quiz</button>
          
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">Risultato Allenamento</h1>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>{quiz.title}</span>
              <span>•</span>
              <span>{totalQuestions} Domande</span>
              <span>•</span>
              <span className="capitalize">{paramMode.replace("_", " ")}</span>
            </div>
          </div>

          {saveErrorMsg && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-300 text-xs">
              Attenzione: {saveErrorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-sky-400">{result.score.toFixed(2)}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Punteggio</div>
            </div>
            <div className="bg-slate-900 border border-emerald-900/30 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-emerald-400">{result.correct}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Corrette</div>
            </div>
            <div className="bg-slate-900 border border-rose-900/30 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-rose-400">{result.wrong}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Errate</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-slate-300">{result.blank}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Omesse</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Materia</th>
                  <th className="px-4 py-3 font-medium text-center">Tot</th>
                  <th className="px-4 py-3 font-medium text-center text-emerald-400">OK</th>
                  <th className="px-4 py-3 font-medium text-center text-rose-400">KO</th>
                  <th className="px-4 py-3 font-medium text-center text-slate-400">Om</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {subjectBreakdown.map(s => (
                  <tr key={s.subjectId}>
                    <td className="px-4 py-3 text-slate-200">{s.name}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{s.total}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-medium">{s.correct}</td>
                    <td className="px-4 py-3 text-center text-rose-400 font-medium">{s.wrong}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{s.blank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => router.push(`/quiz/${quizId}`)} className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700">Chiudi</button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-500">Nuovo Allenamento</button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz View
  const userAns = currentQuestion ? answers[currentQuestion.id] : null;
  const showValidation = instantCheck && userAns !== null && userAns !== undefined;
  
  const correctKey = useMemo(() => {
    return getCorrectOption(currentQuestion);
  }, [currentQuestion]);

  const isCorrect = showValidation && userAns === correctKey;
  
  // Image UI Logic
  const rawImgUrl = currentQuestion.image_url || (currentQuestion as any).image;

  // Debug log
  useEffect(() => {
    if (instantCheck && userAns) {
      console.log(`[DEBUG Custom] Check:`, {
        user: userAns,
        dbRaw: currentQuestion?.correct_option,
        dbNorm: correctKey,
        isCorrect
      });
    }
  }, [instantCheck, userAns, correctKey, isCorrect, currentQuestion]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push(`/quiz/${quizId}`)} className="text-xs text-slate-400 hover:text-white mb-1">← Esci</button>
            <h2 className="text-lg font-bold text-slate-100">{quiz.title} <span className="font-normal text-slate-500">| Custom</span></h2>
            <div className="text-xs text-slate-400 mt-1">Domanda {currentIndex + 1} di {totalQuestions} • Risposte: {answeredCount}</div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {customTimeLimit && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Tempo</div>
                <div className="text-xl font-mono font-medium text-slate-200">{formatTime(remainingSeconds)}</div>
              </div>
            )}
            
            <div className="flex gap-4 text-[10px]">
               <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="h-3 w-3" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
                <span className="text-slate-300">Auto-next</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="h-3 w-3" checked={instantCheck} onChange={(e) => setInstantCheck(e.target.checked)} />
                <span className="text-slate-300">Verifica istantanea</span>
              </label>
            </div>
          </div>
        </div>

        {currentQuestion && (
          <div className="mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4 shadow-sm">
              <div className="mb-3">
                <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                  {currentQuestion.subject_id && subjectsMap[currentQuestion.subject_id]?.name || "Generale"}
                </span>
              </div>
              <p className="text-base text-slate-100 leading-relaxed">{currentQuestion.text}</p>
              
              {rawImgUrl && !imgError ? (
                <div className="mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={rawImgUrl} 
                    alt="Question" 
                    className="max-h-60 rounded-lg border border-slate-800"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : rawImgUrl && imgError ? (
                <div className="mt-4 p-4 rounded-xl bg-rose-950/20 border border-rose-900 text-center">
                   <p className="text-xs text-rose-400">⚠️ Immagine non trovata o caricamento fallito.</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {["a", "b", "c", "d"].map((opt) => {
                const key = opt as AnswerOption;
                const text = (currentQuestion as any)[`option_${key}`];
                if (!text) return null;
                
                const isSelected = answers[currentQuestion.id] === key;
                
                let buttonStyle = "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600";

                if (showValidation && correctKey) {
                    if (key === correctKey) {
                        buttonStyle = isSelected 
                            ? "bg-emerald-900/40 border-emerald-500 text-emerald-50" 
                            : "bg-emerald-900/20 border-emerald-600/70 text-emerald-100";
                    } else if (isSelected) {
                        buttonStyle = "bg-rose-900/40 border-rose-500 text-rose-50 line-through";
                    } else {
                        buttonStyle = "bg-slate-950 border-slate-800 opacity-60";
                    }
                } else if (isSelected) {
                    buttonStyle = "bg-sky-900/20 border-sky-500 text-sky-100";
                }

                return (
                  <button
                    key={key}
                    disabled={finished || (instantCheck && answers[currentQuestion.id] !== undefined)}
                    onClick={() => handleSelectAnswer(currentQuestion.id, key)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${buttonStyle} disabled:cursor-not-allowed`}
                  >
                    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold mr-3 border ${
                      isSelected || (showValidation && key === correctKey) 
                        ? "border-transparent bg-white/20 text-white" 
                        : "border-slate-600 text-slate-500"
                    }`}>
                      {key.toUpperCase()}
                    </span>
                    <span className="text-sm">{text}</span>
                  </button>
                );
              })}
            </div>
            {showValidation && !correctKey && (
              <div className="mt-3 text-xs text-amber-400 bg-amber-900/20 p-2 rounded border border-amber-800">
                ⚠️ Dati mancanti: risposta corretta non impostata.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button onClick={handlePrev} disabled={currentIndex === 0} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 disabled:opacity-50">Precedente</button>
          <div className="flex gap-2">
            <button onClick={() => handleFinish(false)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-500">Termina</button>
            <button onClick={handleNext} disabled={currentIndex === totalQuestions - 1} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 disabled:opacity-50">Successiva</button>
          </div>
        </div>
      </div>
    </div>
  );
}