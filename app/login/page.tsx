"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ComponentType,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";
import { getPostLoginRedirectPath, type AuthRole } from "@/lib/authRedirects";
import MarketingHeaderLogo3D from "@/components/MarketingHeaderLogo3D";
import MarketingSectionHeading3D from "@/components/MarketingSectionHeading3D";
import SoundHeaderAppPill from "@/components/SoundHeaderAppPill";
import {
  DashboardMessagingRowIcon3D,
  DashboardPlanRowIcon3D,
  DashboardProgressRowIcon3D,
  DashboardSessionsRowIcon3D,
} from "@/components/dashboard/DashboardFeatureRowIcons3D";

type Role = AuthRole;

type PendingMfaChallenge = {
  challengeId: string;
  factorId: string;
  factorLabel: string;
};

type WebGlIconComponent = ComponentType<{
  active?: boolean;
  className?: string;
  paused?: boolean;
}>;

const loginFeatureCards: Array<{
  Icon3D: WebGlIconComponent;
  text: string;
  title: string;
}> = [
  {
    Icon3D: DashboardSessionsRowIcon3D,
    title: "Upcoming Sessions",
    text: "See scheduled training and intro sessions.",
  },
  {
    Icon3D: DashboardProgressRowIcon3D,
    title: "Progress Tracking",
    text: "Review workouts, goals, habits, and wins.",
  },
  {
    Icon3D: DashboardMessagingRowIcon3D,
    title: "Coach Messaging",
    text: "Keep communication organized in one place.",
  },
  {
    Icon3D: DashboardPlanRowIcon3D,
    title: "Training Dashboard",
    text: "Access your plan, notes, and next steps.",
  },
];

const loginCrestSparkles = ["one", "two", "three", "four", "five"] as const;

function getInitialAuthErrorMessage() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const errorCode = params.get("auth_error");
  const providerName =
    params.get("provider") === "facebook" ? "Facebook" : "Google";

  if (errorCode === "profile") {
    return `${providerName} sign in worked, but this account needs a Sound Fitness profile before it can enter.`;
  }

  if (errorCode === "email") {
    return `${providerName} didn't share an email address, so we can't send your plan or receipts. Allow email when ${providerName} asks, or sign in with your email and password instead.`;
  }

  // "google" is still accepted so any older links in the wild keep working.
  if (errorCode === "oauth" || errorCode === "google") {
    return `${providerName} sign in could not be completed. Try again.`;
  }

  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/login";

  const portal = useMemo(() => {
    if (pathname.startsWith("/admin")) {
      return {
        label: "Admin Sign In",
        title: "Admin Access",
        subtitle:
          "Access your Sound Fitness admin portal and manage the business.",
        button: "Enter Admin Portal →",
        allowedRoles: ["admin"] as Role[],
      };
    }

    if (pathname.startsWith("/coach")) {
      return {
        label: "Coach Sign In",
        title: "Coach Access",
        subtitle:
          "Access your coaching tools, members, sessions, and messages.",
        button: "Enter Coach Portal →",
        allowedRoles: ["coach", "admin"] as Role[],
      };
    }

    return {
      label: "Member Sign In",
      title: "Welcome Back",
      subtitle:
        "Access your Sound Fitness dashboard and keep your momentum going.",
      button: "Enter Member Dashboard →",
      allowedRoles: ["member"] as Role[],
    };
  }, [pathname]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState(getInitialAuthErrorMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<PendingMfaChallenge | null>(
    null,
  );
  const [mfaCode, setMfaCode] = useState("");

  const authPanelLabel = mfaChallenge
    ? "Two-factor verification"
    : portal.label;
  const authPanelTitle = mfaChallenge ? "Verify It's You" : portal.title;
  const authPanelSubtitle = mfaChallenge
    ? `Enter the 6-digit code from ${mfaChallenge.factorLabel}.`
    : portal.subtitle;

  const getRedirectPath = useCallback((role: Role) => {
    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;

    return getPostLoginRedirectPath(role, next);
  }, []);

  const completeAuthenticatedLogin = useCallback(
    async (userId: string) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || !profile?.role) {
        setErrorMessage("Account profile not found.");
        return false;
      }

      const role = profile.role as Role;

      if (!portal.allowedRoles.includes(role)) {
        await supabase.auth.signOut();
        setErrorMessage("Use the correct portal for this account.");
        return false;
      }

      router.replace(getRedirectPath(role));
      router.refresh();
      return true;
    },
    [getRedirectPath, portal.allowedRoles, router],
  );

  const startMfaChallengeForSession = useCallback(async () => {
    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    const totpFactor = factorsData?.totp?.[0];

    if (factorsError || !totpFactor) {
      await supabase.auth.signOut();
      setErrorMessage(
        "Two-factor authentication is required, but no verified authenticator app is available.",
      );
      return false;
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError || !challengeData?.id) {
      await supabase.auth.signOut();
      setErrorMessage("Could not start two-factor verification. Try again.");
      return false;
    }

    setMfaChallenge({
      challengeId: challengeData.id,
      factorId: totpFactor.id,
      factorLabel: totpFactor.friendly_name || "Authenticator app",
    });
    return true;
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setMfaChallenge(null);
    setMfaCode("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setIsLoading(false);
      setErrorMessage("Email or password is incorrect.");
      return;
    }

    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Could not confirm two-factor status. Try again.");
      return;
    }

    const needsMfa =
      aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2";

    if (needsMfa) {
      await startMfaChallengeForSession();
      setIsLoading(false);
      return;
    }

    // 🔥 IMPORTANT: get role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile?.role) {
      setIsLoading(false);
      setErrorMessage("Account profile not found.");
      return;
    }

    const role = profile.role as Role;

    // 🚫 block wrong portal usage
    if (!portal.allowedRoles.includes(role)) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Use the correct portal for this account.");
      return;
    }

    // ✅ FINAL REDIRECT FIX
    const destination = getRedirectPath(role);

    router.replace(destination);
    router.refresh();
  }

  async function handleMfaVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!mfaChallenge) {
      return;
    }

    const code = mfaCode.replace(/\D/g, "").slice(0, 6);

    if (code.length !== 6) {
      setErrorMessage("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setErrorMessage("");
    setIsMfaLoading(true);

    const { data, error } = await supabase.auth.mfa.verify({
      factorId: mfaChallenge.factorId,
      challengeId: mfaChallenge.challengeId,
      code,
    });

    if (error || !data?.user) {
      setIsMfaLoading(false);
      setErrorMessage("That two-factor code could not be verified.");
      return;
    }

    const didRedirect = await completeAuthenticatedLogin(data.user.id);

    if (!didRedirect) {
      setIsMfaLoading(false);
    }
  }

  async function handleMfaBack() {
    setErrorMessage("");
    setMfaChallenge(null);
    setMfaCode("");
    setPassword("");
    await supabase.auth.signOut();
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("mfa") !== "required") return;

    let isActive = true;

    async function resumeMfaAfterOAuthSignIn() {
      setErrorMessage("");
      setMfaCode("");
      setIsMfaLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (error || !user) {
        setIsMfaLoading(false);
        setErrorMessage("Sign in needs to be restarted.");
        return;
      }

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!isActive) return;

      const needsMfa =
        aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2";

      if (!needsMfa) {
        const didRedirect = await completeAuthenticatedLogin(user.id);
        if (isActive && !didRedirect) setIsMfaLoading(false);
        return;
      }

      await startMfaChallengeForSession();
      if (isActive) setIsMfaLoading(false);
    }

    void resumeMfaAfterOAuthSignIn();

    return () => {
      isActive = false;
    };
  }, [completeAuthenticatedLogin, startMfaChallengeForSession]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <style>{`
        @keyframes login-urgency-pill-pulse {
          0%,
          100% {
            border-color: rgba(56, 189, 248, 0.34);
            box-shadow:
              0 0 0 rgba(14, 165, 233, 0),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
          }

          48% {
            border-color: rgba(56, 189, 248, 0.78);
            box-shadow:
              0 0 0.95rem rgba(14, 165, 233, 0.2),
              0 0 1.65rem rgba(59, 130, 246, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.16);
          }
        }

        @keyframes login-urgency-pill-sheen {
          0%,
          58%,
          100% {
            opacity: 0;
            transform: translateX(-130%);
          }

          72% {
            opacity: 0.38;
          }

          90% {
            opacity: 0.08;
            transform: translateX(130%);
          }
        }

        @keyframes login-urgency-pill-dot {
          0%,
          100% {
            opacity: 0.68;
            transform: scale(0.82);
            box-shadow: 0 0 0.36rem rgba(56, 189, 248, 0.5);
          }

          45% {
            opacity: 1;
            transform: scale(1.14);
            box-shadow:
              0 0 0.52rem rgba(56, 189, 248, 0.85),
              0 0 1rem rgba(14, 165, 233, 0.28);
          }
        }

        @keyframes login-crest-halo-breathe {
          0%,
          100% {
            opacity: 0.62;
            transform: scale(0.96);
          }

          48% {
            opacity: 0.95;
            transform: scale(1.04);
          }
        }

        @keyframes login-crest-ring-drift {
          0% {
            transform: rotate(0deg) scale(0.98);
          }

          50% {
            transform: rotate(180deg) scale(1.03);
          }

          100% {
            transform: rotate(360deg) scale(0.98);
          }
        }

        @keyframes login-crest-mark-breathe {
          0%,
          100% {
            filter:
              drop-shadow(0 1.1rem 1.6rem rgba(0, 0, 0, 0.42))
              drop-shadow(0 0 0.65rem rgba(125, 211, 252, 0.26));
            transform: translateZ(0) scale(1);
          }

          48% {
            filter:
              drop-shadow(0 1.35rem 1.85rem rgba(0, 0, 0, 0.46))
              drop-shadow(0 0 1.1rem rgba(125, 211, 252, 0.48))
              drop-shadow(0 0 1.7rem rgba(14, 165, 233, 0.26));
            transform: translateZ(0) scale(1.035);
          }
        }

        @keyframes login-crest-sparkle {
          0%,
          12%,
          58%,
          100% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.34) rotate(0deg);
          }

          20% {
            opacity: 0.78;
            transform: translate3d(calc(var(--spark-x) * 0.28), calc(var(--spark-y) * 0.28), 0) scale(0.82)
              rotate(28deg);
          }

          34% {
            opacity: 0.52;
            transform: translate3d(var(--spark-x), var(--spark-y), 0) scale(1) rotate(82deg);
          }

          48% {
            opacity: 0.16;
            transform: translate3d(calc(var(--spark-x) * 1.22), calc(var(--spark-y) * 1.22), 0)
              scale(0.56) rotate(136deg);
          }
        }

        .login-urgency-pill {
          animation: login-urgency-pill-pulse 2.8s ease-in-out infinite;
          background:
            radial-gradient(circle at 16% 50%, rgba(56, 189, 248, 0.22), transparent 28%),
            linear-gradient(90deg, rgba(2, 132, 199, 0.13), rgba(15, 23, 42, 0.36), rgba(14, 165, 233, 0.12));
          clip-path: inset(0 round 999px);
          overflow: hidden;
          position: relative;
        }

        .login-urgency-pill::before {
          animation: login-urgency-pill-sheen 3.8s ease-in-out infinite;
          background: linear-gradient(
            105deg,
            transparent 0 30%,
            rgba(186, 230, 253, 0.28) 48%,
            rgba(56, 189, 248, 0.16) 56%,
            transparent 74% 100%
          );
          border-radius: inherit;
          content: "";
          inset: 1px;
          pointer-events: none;
          position: absolute;
        }

        .login-urgency-pill__dot {
          animation: login-urgency-pill-dot 1.45s ease-in-out infinite;
          position: relative;
          z-index: 1;
        }

        .login-urgency-pill__text {
          position: relative;
          z-index: 1;
        }

        .login-crest-stage {
          display: grid;
          height: clamp(7.4rem, 18vw, 11.25rem);
          isolation: isolate;
          place-items: center;
          position: relative;
          width: clamp(7.4rem, 18vw, 11.25rem);
        }

        .login-crest-stage::before {
          animation: login-crest-halo-breathe 4.8s ease-in-out infinite;
          background:
            radial-gradient(circle, rgba(125, 211, 252, 0.2) 0 34%, rgba(14, 165, 233, 0.1) 48%, transparent 69%),
            radial-gradient(circle, rgba(250, 204, 21, 0.08), transparent 58%);
          border: 1px solid rgba(125, 211, 252, 0.22);
          border-radius: 999px;
          box-shadow:
            0 0 2.6rem rgba(14, 165, 233, 0.18),
            inset 0 0 1.4rem rgba(125, 211, 252, 0.08);
          content: "";
          inset: 0.35rem;
          pointer-events: none;
          position: absolute;
          z-index: 0;
        }

        .login-crest-stage::after {
          animation: login-crest-ring-drift 9s linear infinite;
          background:
            conic-gradient(from 16deg, transparent 0 15%, rgba(125, 211, 252, 0.56) 18%, transparent 24% 48%, rgba(250, 204, 21, 0.34) 52%, transparent 58% 100%);
          border-radius: 999px;
          content: "";
          inset: 0;
          mask: radial-gradient(circle, transparent 0 62%, #000 63% 66%, transparent 67%);
          -webkit-mask: radial-gradient(circle, transparent 0 62%, #000 63% 66%, transparent 67%);
          pointer-events: none;
          position: absolute;
          z-index: 1;
        }

        .login-crest-orbit {
          animation: login-crest-ring-drift 14s linear infinite reverse;
          border: 1px solid rgba(125, 211, 252, 0.22);
          border-radius: 999px;
          box-shadow:
            inset 0 0 0 1px rgba(250, 204, 21, 0.08),
            0 0 2rem rgba(34, 211, 238, 0.08);
          inset: 0.9rem;
          pointer-events: none;
          position: absolute;
          z-index: 1;
        }

        .login-crest-mark {
          animation: login-crest-mark-breathe 5.4s ease-in-out infinite;
          height: 61%;
          object-fit: contain;
          position: relative;
          transform-origin: center;
          width: 61%;
          z-index: 2;
        }

        .login-crest-sparkle {
          --spark-x: 1rem;
          --spark-y: -1rem;
          animation: login-crest-sparkle 7.8s cubic-bezier(0.22, 0.74, 0.18, 1) infinite;
          background:
            linear-gradient(90deg, transparent 0 42%, rgba(255, 255, 255, 0.96) 45% 55%, transparent 58% 100%),
            linear-gradient(0deg, transparent 0 42%, rgba(125, 211, 252, 0.98) 45% 55%, transparent 58% 100%);
          border-radius: 999px;
          height: 0.72rem;
          left: 50%;
          pointer-events: none;
          position: absolute;
          top: 50%;
          width: 0.72rem;
          z-index: 3;
        }

        .login-crest-sparkle--one {
          --spark-x: -3.45rem;
          --spark-y: -2.65rem;
          animation-delay: -0.6s;
        }

        .login-crest-sparkle--two {
          --spark-x: 3.1rem;
          --spark-y: -2.9rem;
          animation-delay: -2.2s;
        }

        .login-crest-sparkle--three {
          --spark-x: 3.55rem;
          --spark-y: 1.1rem;
          animation-delay: -3.9s;
        }

        .login-crest-sparkle--four {
          --spark-x: -2.85rem;
          --spark-y: 2.6rem;
          animation-delay: -5.5s;
        }

        .login-crest-sparkle--five {
          --spark-x: 0.25rem;
          --spark-y: -4.05rem;
          animation-delay: -6.7s;
        }

        .login-footer-wordmark {
          max-width: calc(100vw - 4rem);
          width: clamp(10.25rem, 16vw, 11rem);
        }

        @media (prefers-reduced-motion: reduce) {
          .login-urgency-pill,
          .login-urgency-pill::before,
          .login-urgency-pill__dot,
          .login-crest-stage::before,
          .login-crest-stage::after,
          .login-crest-orbit,
          .login-crest-mark,
          .login-crest-sparkle {
            animation: none;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,132,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 pt-5 sm:px-8 sm:pt-7">
          <Link
            href={ROUTES.public.home}
            className="login-crest-stage"
            aria-label="Sound Fitness home"
          >
            <span aria-hidden="true" className="login-crest-orbit" />
            {loginCrestSparkles.map((sparkle) => (
              <span
                key={sparkle}
                aria-hidden="true"
                className={`login-crest-sparkle login-crest-sparkle--${sparkle}`}
              />
            ))}
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={180}
              height={180}
              priority
              className="login-crest-mark"
            />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl items-center gap-10 px-4 pb-10 sm:px-8 sm:pb-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="absolute left-[10%] top-[10%] hidden h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-3xl lg:block" />

        <div className="relative hidden lg:block">
          <h1 className="max-w-[31rem]">
            <MarketingSectionHeading3D
              className="h-[220px]"
              label="Pick up where you left off."
              lines={["Pick up", "where you", "left off."]}
              scale="hero"
              variant="ice"
            />
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            {portal.subtitle}
          </p>

          <div className="mt-8 grid max-w-xl gap-1">
            {[
              [
                "📅",
                "Upcoming Sessions",
                "See scheduled training and intro sessions.",
              ],
              [
                "📈",
                "Progress Tracking",
                "Review workouts, goals, habits, and wins.",
              ],
              [
                "💬",
                "Coach Messaging",
                "Keep communication organized in one place.",
              ],
              [
                "🏋️",
                "Training Dashboard",
                "Access your plan, notes, and next steps.",
              ],
            ].map(([, title, text]) => {
              const Icon3D =
                loginFeatureCards.find((card) => card.title === title)
                  ?.Icon3D ?? DashboardPlanRowIcon3D;

              return (
                <div
                  key={title}
                  className="flex gap-4 border-t border-sky-300/12 py-4 first:border-t-0"
                >
                  <Icon3D active className="h-12 w-12 shrink-0" />

                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section className="relative mx-auto w-full max-w-xl px-1 sm:px-4">
          <div className="relative">
            <div className="text-center">
              <div className="login-urgency-pill mx-auto inline-flex items-center gap-2 rounded-full border border-sky-400/30 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                <span className="login-urgency-pill__dot h-2 w-2 rounded-full bg-sky-400" />
                <span className="login-urgency-pill__text">
                  {authPanelLabel}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                {authPanelTitle}
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                {authPanelSubtitle}
              </p>
            </div>

            {mfaChallenge ? (
              <form
                onSubmit={handleMfaVerify}
                className="mt-8 space-y-5"
                data-lpignore="true"
              >
                <div className="border-y border-sky-300/12 py-4 text-center">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    2FA method
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-200">
                    Authenticator app code
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="mfa-code"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
                  >
                    Verification code
                  </label>

                  <input
                    id="mfa-code"
                    name="mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    data-lpignore="true"
                    value={mfaCode}
                    onChange={(event) =>
                      setMfaCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    required
                    autoFocus
                    className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-center text-2xl font-black tracking-[0.32em] text-white outline-none placeholder:text-slate-600 transition focus:border-sky-400"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isMfaLoading}
                  className="block w-full rounded-xl bg-sky-500 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMfaLoading ? "Verifying..." : "Verify Code ->"}
                </button>

                <button
                  type="button"
                  onClick={handleMfaBack}
                  className="block w-full text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400 transition hover:text-sky-300"
                >
                  Use a different account
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleLogin}
                className="mt-8 space-y-4"
                data-lpignore="true"
              >
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
                    placeholder="you@example.com"
                    autoComplete="email"
                    data-lpignore="true"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
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
                    placeholder="Enter password"
                    autoComplete="current-password"
                    data-lpignore="true"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
                  />

                  <Link
                    href={ROUTES.auth.forgotPassword}
                    className="mt-3 inline-flex text-xs font-black uppercase tracking-[0.12em] text-sky-400 transition hover:text-sky-300"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <div className="flex flex-col items-start gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <label
                    htmlFor="remember"
                    className="flex cursor-pointer items-center gap-3 text-sm text-slate-400"
                  >
                    <input
                      id="remember"
                      name="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-5 w-5 rounded border-white/20 bg-[#050b16] accent-sky-500"
                    />
                    Remember me
                  </label>

                  <span className="hidden text-xs text-slate-500 sm:inline">
                    Secure portal access
                  </span>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                {!rememberMe && (
                  <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-xs leading-5 text-yellow-100">
                    Heads up: Supabase keeps sessions by default. We’ll make
                    this checkbox fully control session persistence in the next
                    auth pass.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="block w-full rounded-xl bg-sky-500 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Signing In..." : portal.button}
                </button>

                <div className="pt-2 text-center">
                  <p className="text-sm text-slate-400">New here?</p>

                  <Link
                    href={ROUTES.onboarding.home}
                    className="mt-2 inline-flex text-sm font-black uppercase tracking-[0.14em] text-sky-400 hover:text-sky-300"
                  >
                    Take the Quiz → Get Access
                  </Link>
                </div>
              </form>
            )}

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-center text-xs leading-6 text-slate-500">
                Your training data, messages, and progress tools live inside
                your private Sound Fitness portal.
              </p>
            </div>
          </div>
        </section>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 border-t border-white/10 px-5 py-7 text-xs text-slate-500 sm:px-8">
        <Link
          href={ROUTES.public.home}
          className="group flex max-w-full flex-col items-center justify-center text-center"
        >
          <MarketingHeaderLogo3D alwaysOpen className="login-footer-wordmark" />
          <SoundHeaderAppPill />
        </Link>

        <div>© 2026 Sound Fitness. All rights reserved.</div>

        <div className="flex items-center gap-4">
          <Link href={ROUTES.coach.login} className="hover:text-sky-300">
            Coach Sign In
          </Link>
          <span>•</span>
          <Link href={ROUTES.admin.login} className="hover:text-sky-300">
            Admin Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}
