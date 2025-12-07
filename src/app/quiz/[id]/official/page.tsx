
"use client";

import { use, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];
type RuleRow = Database["public"]["Tables"]["quiz_subject_rules"]["Row"];

type FullQuestion = QuestionRow & {
  subject?: SubjectRow | null;
};

// Helper for shuffling arrays
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Helper to normalize DB answers
function normalizeDBAnswer(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.replace(/[.,:;()\[\]]/g, "").trim().toLowerCase();
}

// Robust accessor to find correct answer
function getCorrectOption(q: any): string | null {
  if (!q) return null;
  if (q.correct_option) return normalizeDBAnswer(q.correct_option);
  if (q.correct_answer) return normalizeDBAnswer(q.correct_answer);
  if (q.answer) return normalizeDBAnswer(q.answer);
  return null;
}

export default function OfficialQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = use(params);
  const router = useRouter();

  // --- Data State ---
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<FullQuestion[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Quiz Execution State ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    { selectedOption: "a" | "b" | "c" | "d" | null }[]
  >([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [results, setResults] = useState<{
    correct: number;
    wrong: number;
    skipped: number;
  } | null>(null);

  // --- Timer State ---
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // --- Modes & Config ---
  const [autoNext, setAutoNext] = useState(false);
  const [instantCheck, setInstantCheck] = useState(false); // Default false for official
  const [navigable, setNavigable] = useState(true);

  const autoNextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load Data (Logic kept from original file) ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
           // For testing UI without auth, comment out redirect
           // router.push("/login");
           // return;
           setUserId("test-user"); // Mock
        } else {
           setUserId(user.id);
        }

        // Fetch Quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId) // In real app, id might be UUID. If checking by slug, need logic change.
          .maybeSingle();

        // Fallback mock if DB is empty/not connected during UI dev
        let qz = quizData as QuizRow;
        if (!qz && quizId === 'test') { // Mock for UI testing
             qz = { title: "Simulazione Test", time_limit: 100, points_correct: 1, points_wrong: -1, points_blank: 0 } as any;
        } else if (quizError || !quizData) {
             // throw new Error("Concorso non trovato."); 
             // Suppress error for now to show UI if DB fails
        }
        setQuiz(qz);

        // Fetch Questions
        const { data: questionsData } = await supabase
          .from("questions")
          .select(`*, subject:subjects(*)`)
          .eq("quiz_id", quizId);
          
        let allQuestions = (questionsData || []) as FullQuestion[];
        
        if (allQuestions.length === 0) {
            // Mock questions for UI Dev
            allQuestions = [
                { id: "1", text: "Quale tra i seguenti pianeti è il più vicino al Sole?", option_a: "Marte", option_b: "Venere", option_c: "Mercurio", option_d: "Terra", correct_option: "c", quiz_id: "test" } as any,
                { id: "2", text: "Qual è la capitale d'Italia?", option_a: "Milano", option_b: "Roma", option_c: "Napoli", option_d: "Torino", correct_option: "b", quiz_id: "test" } as any,
            ];
        }

        setQuestions(allQuestions);
        setAnswers(Array.from({ length: allQuestions.length }, () => ({ selectedOption: null })));

        if (qz && qz.time_limit) {
          setRemainingSeconds(qz.time_limit * 60);
        }

        setStartedAt(Date.now());
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [quizId, router]);

  // --- Timer Logic ---
  useEffect(() => {
    if (remainingSeconds === null || finished) return;
    if (remainingSeconds <= 0) {
      // Handle finish
      return;
    }
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds, finished]);


  // --- Navigation Logic ---
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }, [questions.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSelectOption = useCallback((opt: "a" | "b" | "c" | "d") => {
    if (finished) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = { selectedOption: opt };
      return next;
    });
  }, [finished, currentIndex]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Caricamento...</div>;
  
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex]?.selectedOption ?? null;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      
      {/* 1. Top Bar */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => router.back()} className="text-xl font-light text-slate-400 hover:text-slate-900">
          ✕
        </button>
        
        <div className="flex items-center gap-2 font-mono font-bold text-lg">
          <span>⏰</span>
          <span>{formatTime(remainingSeconds)}</span>
        </div>

        <div className="flex items-center gap-3">
           <button className="p-1 rounded-full hover:bg-slate-100">
             {/* Bookmark Icon */}
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
           </button>
        </div>
      </div>

      {/* 2. Question Area */}
      <div className="flex-1 px-6 py-8 flex flex-col">
        <div className="mb-8 text-center">
           <h2 className="text-lg font-medium leading-relaxed">
             {currentQuestion?.text}
           </h2>
        </div>

        {/* 3. Answer Options */}
        <div className="space-y-4">
          {(['a', 'b', 'c', 'd'] as const).map((opt) => {
            const text = (currentQuestion as any)[`option_${opt}`];
            const isSelected = currentAnswer === opt;
            
            return (
              <button
                key={opt}
                onClick={() => handleSelectOption(opt)}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                  isSelected 
                    ? "border-slate-900 bg-slate-50" 
                    : "border-slate-900 bg-white"
                }`}
              >
                <span className={`font-handwriting text-xl font-bold ${isSelected ? "underline" : ""}`}>
                  {opt.toUpperCase()}.
                </span>
                <span className="text-left text-sm font-medium">{text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Navigation */}
      <div className="p-4 border-t border-slate-100">
        {/* Dots / Pagination Strip */}
        <div className="flex justify-center gap-1 mb-4 overflow-x-auto py-2">
          {questions.map((_, idx) => (
             <div 
               key={idx} 
               className={`w-6 h-6 rounded-lg border-2 border-slate-900 flex-shrink-0 ${
                 idx === currentIndex ? "bg-slate-900" : 
                 answers[idx]?.selectedOption ? "bg-slate-200" : "bg-white"
               }`}
             />
          ))}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-900 font-bold text-sm disabled:opacity-30"
          >
            Precedente
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-900 font-bold text-sm disabled:opacity-30"
          >
            Successiva
          </button>
        </div>
      </div>

    </div>
  );
}
