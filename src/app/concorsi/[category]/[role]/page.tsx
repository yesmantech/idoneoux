
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getContestsByRole, type Contest } from "@/lib/data";

export default function RolePage({ params }: { params: Promise<{ category: string; role: string }> }) {
  const { category, role } = use(params);
  const router = useRouter();
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getContestsByRole(role);
      setContests(data);
      setLoading(false);
    };
    load();
  }, [role]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="sticky top-0 bg-white z-10 px-4 h-16 flex items-center border-b border-slate-100">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="ml-2 font-semibold capitalize">{role.replace('-', ' ')}</span>
      </div>

      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Seleziona Concorso</h1>
        
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl"></div>)}
          </div>
        ) : contests.length === 0 ? (
          <p className="text-slate-500">Nessun concorso attivo per questo ruolo al momento.</p>
        ) : (
          <div className="space-y-3">
            {contests.map((c) => (
              <Link
                key={c.slug}
                href={`/concorsi/${category}/${role}/${c.slug}`}
                className="block p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{c.title}</h3>
                    {c.year && (
                      <span className="inline-block mt-1 px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 font-medium">
                        {c.year}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-300">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
