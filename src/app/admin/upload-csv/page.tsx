"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];

type CsvRow = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  subject_id?: string;
  image_name?: string;
};

const BUCKET = "question-images";

function normalizeImageName(original: string): string {
  return original.trim().replace(/\s+/g, "_").toLowerCase();
}

export default function AdminUploadCsvPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Bulk Images
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageMsg, setImageMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Load Data
  useEffect(() => {
    supabase.from("quizzes").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setQuizzes((data || []) as QuizRow[]));
  }, []);

  useEffect(() => {
    if (!selectedQuizId) {
      setSubjects([]);
      return;
    }
    supabase.from("subjects").select("*").eq("quiz_id", selectedQuizId)
      .then(({ data }) => {
        const list = (data || []) as SubjectRow[];
        setSubjects(list);
        if (list.length > 0) setSelectedSubjectId(list[0].id);
      });
  }, [selectedQuizId]);

  // CSV Logic
  const parseCsv = async (file: File): Promise<CsvRow[]> => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error("CSV vuoto o senza righe.");

    // Auto-detect separator
    const headerLine = lines[0];
    const separator = headerLine.includes(";") ? ";" : ",";
    
    // Helper to split CSV line respecting quotes (basic)
    const splitLine = (line: string) => {
      // Regex matches: quoted fields OR non-comma/semicolon sequences
      const pattern = separator === ";" ? /(".*?"|[^";]+)(?=\s*;|\s*$)/g : /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
      const matches = line.match(pattern) || [];
      return matches.map(m => m.replace(/^"|"$/g, "").trim()); // remove quotes
    };

    const headers = splitLine(headerLine).map(h => h.toLowerCase().replace(/['"]/g, "").trim());
    
    // Map common aliases
    const findIdx = (candidates: string[]) => headers.findIndex(h => candidates.includes(h));

    const idxText = findIdx(["question_text", "question", "domanda", "testo"]);
    const idxA = findIdx(["option_a", "a", "opzione_a"]);
    const idxB = findIdx(["option_b", "b", "opzione_b"]);
    const idxC = findIdx(["option_c", "c", "opzione_c"]);
    const idxD = findIdx(["option_d", "d", "opzione_d"]);
    const idxCorrect = findIdx(["correct_option", "correct", "correct_answer", "risposta", "esatta"]);
    const idxSubj = findIdx(["subject_id", "subject", "materia"]);
    const idxImg = findIdx(["image_name", "image", "immagine", "img"]);

    if (idxText === -1 || idxA === -1 || idxCorrect === -1) {
      throw new Error(`Colonne obbligatorie mancanti. Trovate: ${headers.join(", ")}. Servono: question_text, option_a... correct_option`);
    }
    
    const result: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (cols.length < 3) continue; // skip empty/malformed lines

      // Clean Correct Option
      const rawCorrect = cols[idxCorrect] ?? "";
      // Remove punctuation, brackets, whitespace
      const cleanCorrect = rawCorrect.replace(/[.,:;()\[\]"' ]/g, "").toLowerCase().substring(0, 1);

      if (!["a", "b", "c", "d"].includes(cleanCorrect)) {
        console.warn(`Row ${i}: Invalid correct option '${rawCorrect}' (cleaned: '${cleanCorrect}'). Skipping.`);
        continue;
      }

      result.push({
        question_text: cols[idxText] ?? "",
        option_a: cols[idxA] ?? "",
        option_b: cols[idxB] ?? "",
        option_c: cols[idxC] ?? "",
        option_d: cols[idxD] ?? "",
        correct_option: cleanCorrect,
        subject_id: idxSubj > -1 ? cols[idxSubj] : undefined,
        image_name: idxImg > -1 ? cols[idxImg] : undefined,
      });
    }

    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setCsvFile(f || null);
    setParsedPreview([]);
    setImportMsg(null);

    if (f) {
      try {
        const rows = await parseCsv(f);
        setParsedPreview(rows.slice(0, 5)); // Show first 5
        setImportMsg({ type: 'success', text: `File letto correttamente. ${rows.length} domande valide trovate.` });
      } catch (err: any) {
        setImportMsg({ type: 'error', text: err.message });
      }
    }
  };

  const handleImport = async () => {
    if (!selectedQuizId || !csvFile) return;
    setImporting(true);
    
    try {
      const rows = await parseCsv(csvFile);
      const toInsert = [];

      for (const row of rows) {
        let sid = row.subject_id;
        // If subject_id in CSV is just a name, we can't map it easily without fetching all subjects.
        // For now, we fallback to selected default if CSV subject is missing.
        if (!sid && selectedSubjectId) sid = selectedSubjectId;
        
        if (!sid) continue; 

        let imgUrl = null;
        if (row.image_name) {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(normalizeImageName(row.image_name));
          imgUrl = data.publicUrl;
        }

        toInsert.push({
          quiz_id: selectedQuizId,
          subject_id: sid,
          text: row.question_text,
          option_a: row.option_a,
          option_b: row.option_b,
          option_c: row.option_c,
          option_d: row.option_d,
          correct_option: row.correct_option,
          image_url: imgUrl
        });
      }

      if (toInsert.length === 0) throw new Error("Nessuna riga valida da importare.");

      // Batch insert (Supabase limit is usually huge, but let's do chunks if needed. 
      // For simple apps, one big insert is fine up to a few thousand rows)
      const { error } = await supabase.from("questions").insert(toInsert);
      if (error) throw error;

      setImportMsg({ type: 'success', text: `Importazione completata! ${toInsert.length} domande aggiunte.` });
      setCsvFile(null);
      setParsedPreview([]);
    } catch (err: any) {
      console.error(err);
      setImportMsg({ type: 'error', text: err.message || "Errore import." });
    } finally {
      setImporting(false);
    }
  };

  // Bulk Image Upload (Existing logic)
  const handleUploadImages = async () => {
    if (!imageFiles || imageFiles.length === 0) return;
    setUploadingImages(true);
    setImageMsg(null);

    let count = 0;
    let errors = 0;

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const name = normalizeImageName(file.name);
        // FIX: upsert: true allows overwriting existing files
        const { error } = await supabase.storage.from(BUCKET).upload(name, file, { upsert: true });
        if (error) {
          console.error("Upload fail:", name, error);
          errors++;
        }
        else count++;
      }
      setImageMsg({ type: count > 0 ? 'success' : 'error', text: `Caricate: ${count}, Errori: ${errors}` });
    } catch (err: any) {
      setImageMsg({ type: 'error', text: "Errore upload massivo." });
    } finally {
      setUploadingImages(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button onClick={() => router.push("/admin")} className="text-xs text-slate-400 hover:text-white mb-4">← Dashboard</button>
        <h1 className="text-2xl font-bold mb-2 text-slate-100">Import Massivo</h1>
        <p className="text-sm text-slate-400 mb-8">Supporta CSV separati da virgola (,) o punto e virgola (;)</p>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* CSV Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-emerald-400">1. Domande (CSV)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Concorso</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Materia Default</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedQuizId}
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">File CSV</label>
                <input 
                  type="file" accept=".csv"
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  onChange={handleFileChange}
                />
              </div>

              {importMsg && (
                <div className={`text-xs p-2 rounded border ${importMsg.type === 'error' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-emerald-900/20 border-emerald-800 text-emerald-300'}`}>
                  {importMsg.text}
                </div>
              )}

              {/* Preview */}
              {parsedPreview.length > 0 && (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-400 overflow-x-auto">
                  <p className="font-semibold mb-1 text-slate-300">Anteprima (Prime 5 righe):</p>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="p-1">Domanda</th>
                        <th className="p-1 text-emerald-400">Risposta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.map((r, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          <td className="p-1 truncate max-w-[150px]">{r.question_text}</td>
                          <td className="p-1 font-mono text-emerald-400">{r.correct_option}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={importing || !csvFile || !selectedQuizId}
                className="w-full py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {importing ? "Importazione..." : "Importa CSV"}
              </button>
            </div>
          </div>

          {/* Images Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-sky-400">2. Immagini (Bulk)</h2>
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Carica tutte le immagini citate nel CSV (colonna <code>image_name</code>).
                I nomi file verranno normalizzati (es. &quot;Fig 1.jpg&quot; &rarr; &quot;fig_1.jpg&quot;).
              </p>
              
              <input 
                type="file" accept="image/*" multiple
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                onChange={(e) => setImageFiles(e.target.files)}
              />

              {imageMsg && (
                <div className={`text-xs p-2 rounded border ${imageMsg.type === 'error' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-sky-900/20 border-sky-800 text-sky-300'}`}>
                  {imageMsg.text}
                </div>
              )}

              <button
                onClick={handleUploadImages}
                disabled={uploadingImages || !imageFiles}
                className="w-full py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-500 disabled:opacity-50"
              >
                {uploadingImages ? "Caricamento..." : "Carica Immagini"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}