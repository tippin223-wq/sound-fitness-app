"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
          role: "member",
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || "Could not create your account.");
      return;
    }

    setMessage("Check your email to confirm your Sound Fitness account.");
  }

  return (
    <AuthCard
      eyebrow="Create Account"
      title="Create your paid member account"
      subtitle="Use this step after checkout so your private dashboard can attach to the membership you purchased."
      icon="SF"
      footer={
        <p className="text-center text-xs leading-6 text-slate-500">
          Already have access?{" "}
          <Link href="/login" className="font-black text-cyan-300 hover:text-cyan-200">
            Log in
          </Link>
          .
        </p>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
          >
            Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
            placeholder="Your name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
            placeholder="At least 8 characters"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="block w-full rounded-xl bg-sky-500 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Creating..." : "Create Account"}
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
          <p className="text-sm text-slate-400">Need direction first?</p>
          <Link
            href="/onboarding"
            className="mt-2 inline-flex text-sm font-black uppercase tracking-[0.14em] text-sky-400 hover:text-sky-300"
          >
            Start Free Assessment
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
