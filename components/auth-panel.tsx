'use client';

import { useState, type SyntheticEvent } from 'react';
import { CheckCircle2, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

import { Eyebrow } from '@/components/fanta-bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-white/7 bg-card lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative overflow-hidden bg-[linear-gradient(150deg,#12211b,#0b120f)] p-6 sm:p-9">
        <div className="pointer-events-none absolute inset-0 opacity-[.16] [background-image:radial-gradient(circle_at_20%_15%,#00e3a0,transparent_30%),linear-gradient(rgba(0,227,160,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(0,227,160,.25)_1px,transparent_1px)] [background-size:auto,42px_42px,42px_42px]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            <Eyebrow className="text-primary">Area personale</Eyebrow>
          </span>
          <h2 className="font-display mt-6 max-w-md text-[34px] leading-[1.02] font-extrabold sm:text-[40px]">
            La tua asta, rilancio dopo rilancio.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/45">
            Crea la squadra, registra ogni acquisto e controlla crediti, slot e spesa per reparto da qualsiasi
            dispositivo.
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {['Dati sincronizzati', 'Rosa sempre pronta', 'Accesso personale'].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-xs font-semibold text-foreground/65"
              >
                <CheckCircle2 className="size-4 shrink-0 text-primary" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-9">
        <Eyebrow>FantaBoard account</Eyebrow>
        <h3 className="font-display mt-1.5 text-2xl font-extrabold">Entra nella tua asta</h3>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-white/7 bg-secondary p-1">
          {(
            [
              ['login', 'Accedi'],
              ['register', 'Registrati'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded-full py-2 text-xs font-extrabold transition ${
                mode === value ? 'bg-foreground text-background' : 'text-foreground/45 hover:text-foreground/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
          <label htmlFor="auth-email" className="block text-xs font-bold text-foreground/60">
            Email
            <div className="relative mt-2">
              <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/40" />
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@email.it"
                className="h-12 rounded-2xl border-white/7 bg-secondary pl-10.5 placeholder:text-foreground/30"
              />
            </div>
          </label>

          <label htmlFor="auth-password" className="block text-xs font-bold text-foreground/60">
            Password
            <div className="relative mt-2">
              <LockKeyhole className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/40" />
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Almeno 6 caratteri"
                className="h-12 rounded-2xl border-white/7 bg-secondary pl-10.5 placeholder:text-foreground/30"
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs text-primary">
              {message}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="h-13 w-full rounded-2xl text-[15px] font-black shadow-[0_14px_34px_-12px_rgba(0,227,160,.6)]"
          >
            {pending && <Loader2 className="animate-spin" />}
            {mode === 'login' ? 'Accedi alla dashboard' : 'Crea il mio account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-foreground/30">
          I dati della rosa sono separati per account tramite Row Level Security su Supabase.
        </p>
      </div>
    </div>
  );
}
