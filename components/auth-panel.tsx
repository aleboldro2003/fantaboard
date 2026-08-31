'use client';

import { useState, type SyntheticEvent } from 'react';
import { CheckCircle2, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'register';

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      const result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            });

      if (result.error) {
        setError(result.error.message);
      } else if (mode === 'register' && !result.data.session) {
        setMessage('Account creato. Apri l’email di conferma per completare la registrazione.');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossibile contattare Supabase. Riprova.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border bg-card shadow-[0_24px_80px_rgba(8,15,13,.08)] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative overflow-hidden bg-[#0b1210] p-6 text-white sm:p-9">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_20%_15%,#bef264,transparent_28%),linear-gradient(rgba(190,242,100,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(190,242,100,.25)_1px,transparent_1px)] [background-size:auto,42px_42px,42px_42px]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-lime-300">
            <ShieldCheck className="size-3.5" /> Area personale protetta
          </span>
          <h2 className="mt-6 max-w-md text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
            La tua asta, aggiornata rilancio dopo rilancio.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
            Crea la squadra, registra ogni acquisto e controlla crediti, slot e spesa per reparto da qualsiasi dispositivo.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {['Dati sincronizzati', 'Rosa sempre pronta', 'Accesso personale'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.055] px-3 py-2.5 text-xs text-white/70">
                <CheckCircle2 className="size-4 shrink-0 text-lime-300" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-9">
        <p className="text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">FantaBoard account</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight">Entra nella tua asta</h3>
        <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="mt-6">
          <TabsList className="grid h-10 w-full grid-cols-2">
            <TabsTrigger value="login">Accedi</TabsTrigger>
            <TabsTrigger value="register">Registrati</TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label htmlFor="auth-email" className="block text-xs font-medium">
            Email
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@email.it"
                className="h-11 pl-10"
              />
            </div>
          </label>
          <label htmlFor="auth-password" className="block text-xs font-medium">
            Password
            <div className="relative mt-1.5">
              <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Almeno 6 caratteri"
                className="h-11 pl-10"
              />
            </div>
          </label>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">{message}</p>}

          <Button type="submit" disabled={pending} className="h-11 w-full rounded-xl">
            {pending && <Loader2 className="animate-spin" />}
            {mode === 'login' ? 'Accedi alla dashboard' : 'Crea il mio account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
          I dati della rosa sono separati per account tramite Row Level Security su Supabase.
        </p>
      </div>
    </div>
  );
}
