
import { createClient } from '../../lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '../components/LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch Attempts (with Quiz info)
  // FIX: Table is 'quiz_attempts', not 'attempts'
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(title, category)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });

  // 3. Calculate Stats
  const totalAttempts = attempts?.length || 0;
  
  const averageScore = totalAttempts > 0
    ? Math.round(attempts!.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAttempts)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
       {/* Header */}
       <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-sky-900/20">I</div>
            <h1 className="text-lg font-bold text-slate-100">Idoneo.it</h1>
          </Link>
          <div className="flex items-center gap-4">
             <Link href="/" className="text-xs font-medium text-slate-400 hover:text-sky-400 transition-colors">Torna alla Home</Link>
             <div className="h-4 w-px bg-slate-700"></div>
             <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">La tua Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">Monitora i tuoi progressi e preparati al meglio per il concorso.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex items-center hover:border-sky-700/50 transition-colors">
            <div className="p-3 bg-sky-900/20 text-sky-400 rounded-xl mr-4 border border-sky-800/30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Simulazioni Totali</p>
              <p className="text-2xl font-bold text-slate-100">{totalAttempts}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex items-center hover:border-emerald-700/50 transition-colors">
            <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-xl mr-4 border border-emerald-800/30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Punteggio Medio</p>
              <p className="text-2xl font-bold text-slate-100">{averageScore}%</p>
            </div>
          </div>
        </div>

        {/* Attempts History */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-100">Attività Recente</h3>
          </div>
          
          {totalAttempts === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Non hai ancora effettuato simulazioni. <br/>
              <Link href="/" className="text-sky-400 font-medium hover:underline mt-2 inline-block">Inizia un concorso ora!</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Concorso</th>
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium">Punteggio</th>
                    <th className="px-6 py-3 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {attempts!.map((attempt: any) => (
                    <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{attempt.quizzes?.title || 'Quiz sconosciuto'}</div>
                        {attempt.quizzes?.category && (
                          <div className="text-xs text-slate-500 mt-0.5">{attempt.quizzes?.category}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        {new Date(attempt.started_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <span className="block text-[10px] opacity-70">
                          {new Date(attempt.started_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                             attempt.score >= 70 ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' :
                             attempt.score >= 50 ? 'bg-amber-900/30 text-amber-300 border-amber-800' :
                             'bg-rose-900/30 text-rose-300 border-rose-800'
                         }`}>
                           {attempt.score != null ? `${attempt.score.toFixed(0)}%` : '-'}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        {attempt.finished_at ? (
                          <span className="flex items-center gap-1.5 text-emerald-400/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completato
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> In corso
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
