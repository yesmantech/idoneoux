'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      router.refresh();
      router.push('/');
    } catch (err: any) {
      setError(err.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-slate-950 text-white">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl shadow-slate-900/50">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-900/20 mb-3">
            I
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isLogin ? 'Bentornato' : 'Crea Account'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isLogin ? 'Accedi per continuare i tuoi quiz' : 'Inizia la tua preparazione oggi'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Email</label>
            <input
              type="email"
              placeholder="nome@esempio.it"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Elaborazione...' : isLogin ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            {isLogin ? "Non hai un account?" : "Hai già un account?"}
            <button
              className="ml-1 text-sky-400 hover:text-sky-300 font-medium underline-offset-2 hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Registrati" : "Accedi"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
