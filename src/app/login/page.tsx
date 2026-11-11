"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useForm, type FieldErrors, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { JiddahLogo } from "@/components/brand/JiddahLogo";

import {
  forgotPasswordSchema,
  loginFormSchema,
  resetPasswordSchema,
  type ForgotPasswordForm,
  type LoginForm,
  type ResetPasswordForm,
} from "@/lib/validation";

type Screen = "login" | "forgot" | "reset";

const authFormOptions = {
  mode: "onTouched" as const,
  reValidateMode: "onChange" as const,
};

const NETWORK_MESSAGE =
  "Can't reach the sign-in service. Check your connection or verify the authentication endpoint.";

function isNetworkFailure(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return (
    e?.name === "AuthRetryableFetchError" ||
    /networkerror|failed to fetch|fetch failed|load failed|network request failed/i.test(e?.message ?? "")
  );
}

function visibleFieldError<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: FieldPath<T>,
): string | undefined {
  const { isSubmitted } = form.formState;
  const { error, isTouched } = form.getFieldState(name, form.formState);
  if (!error || (!isTouched && !isSubmitted)) return undefined;
  return error.message;
}

function firstFieldError<T extends FieldValues>(errors: FieldErrors<T>): string | undefined {
  for (const value of Object.values(errors)) {
    if (value && typeof value === "object" && "message" in value && value.message) {
      return String(value.message);
    }
  }
  return undefined;
}

function LoginContent() {
  const [screen, setScreen] = useState<Screen>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") ?? "/admin";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        if (
          session.user.user_metadata?.role?.toLowerCase().includes("teacher") &&
          !session.user.user_metadata?.onboarding_completed
        ) {
          router.replace("/onboarding");
        } else {
          router.replace(redirectTo);
        }
      }
    });
  }, [router, redirectTo]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    ...authFormOptions,
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    ...authFormOptions,
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    ...authFormOptions,
    defaultValues: { password: "" },
  });

  const handleLogin = async (values: LoginForm) => {
    setLoading(true);
    setAuthErrorMessage(null);
    const supabase = createClient();
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      // Local rehearsal auto-sync for developer environments
      if (
        error &&
        !isNetworkFailure(error) &&
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ) {
        try {
          const syncRes = await fetch("/api/auth/local-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: values.email, password: values.password }),
          });
          if (syncRes.ok) {
            const retry = await supabase.auth.signInWithPassword({
              email: values.email,
              password: values.password,
            });
            if (!retry.error) {
              data = retry.data;
              error = null;
            }
          }
        } catch {}
      }

      if (error) throw error;

      const needsOnboarding =
        data.user?.user_metadata?.role?.toLowerCase().includes("teacher") &&
        !data.user?.user_metadata?.onboarding_completed;

      window.location.href = needsOnboarding ? "/onboarding" : redirectTo;
    } catch (error: any) {
      try {
        await supabase.auth.signOut();
      } catch {}
      const msg = isNetworkFailure(error)
        ? NETWORK_MESSAGE
        : error?.message || "Invalid email or password. Please verify your credentials.";
      setAuthErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInvalid = (errors: FieldErrors<LoginForm>) => {
    const message = firstFieldError(errors) ?? "Please enter your email address and password.";
    setAuthErrorMessage(message);
    toast.error(message);
  };

  const handleForgot = async (values: ForgotPasswordForm) => {
    setLoading(true);
    setAuthErrorMessage(null);
    setForgotSuccessMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Unable to process password reset request.");
      }
      const confirmMsg =
        payload.message ||
        `Password reset instructions sent for ${values.email}. If email delivery is offline, your School Administrator has been notified to issue a temporary password.`;
      setForgotSuccessMessage(confirmMsg);
      toast.success("Password reset request submitted");
    } catch (error: any) {
      const msg = isNetworkFailure(error) ? NETWORK_MESSAGE : error.message || "Unable to process password reset request.";
      setAuthErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values: ResetPasswordForm) => {
    setLoading(true);
    setAuthErrorMessage(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      toast.success("Password updated. Please sign in.");
      setScreen("login");
    } catch (error: any) {
      const msg = isNetworkFailure(error) ? NETWORK_MESSAGE : error.message || "Error resetting password.";
      setAuthErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const emailError = visibleFieldError(loginForm, "email");
  const passwordError = visibleFieldError(loginForm, "password");
  const forgotEmailError = visibleFieldError(forgotForm, "email");
  const resetPasswordError = visibleFieldError(resetForm, "password");

  const goTo = (next: Screen) => {
    setAuthErrorMessage(null);
    setForgotSuccessMessage(null);
    setScreen(next);
  };

  const alertBanner = authErrorMessage && (
    <div
      role="alert"
      className="mb-5 p-3.5 rounded-xl bg-[#2A0E0B] border border-[#7A2722] text-[#FFC7C2] text-xs leading-relaxed flex items-start gap-2.5 shadow-sm"
    >
      <ShieldAlert className="w-4 h-4 text-[#F87171] flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-[#FEE2E2] mb-0.5">Authentication Issue</p>
        <p className="text-[#FFC7C2]">{authErrorMessage}</p>
        {isNetworkFailure({ message: authErrorMessage }) && (
          <p className="mt-1.5 text-[11px] text-[#FCA5A5] border-t border-[#7A2722]/60 pt-1.5">
            Diagnostic hint: If testing locally, verify Supabase credentials or verify your internet connection.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style jsx global>{`
        /* Browser Autofill Overrides for high contrast on dark forest surface */
        .jiddah-auth-input:-webkit-autofill,
        .jiddah-auth-input:-webkit-autofill:hover,
        .jiddah-auth-input:-webkit-autofill:focus,
        .jiddah-auth-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #062317 inset !important;
          box-shadow: 0 0 0 1000px #062317 inset !important;
          -webkit-text-fill-color: #FAF6EE !important;
          caret-color: #EA6A15 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .jiddah-auth-input:autofill {
          box-shadow: 0 0 0 1000px #062317 inset !important;
          filter: none !important;
          color: #FAF6EE !important;
        }

        .jiddah-auth-input {
          color: #FAF6EE;
          background-color: #062317;
          border: 1px solid #164E35;
        }

        .jiddah-auth-input::placeholder {
          color: #5D8070;
        }

        .jiddah-auth-input:hover:not(:disabled) {
          border-color: #247A4D;
        }

        .jiddah-auth-input:focus {
          background-color: #041B12;
          border-color: #EA6A15;
          box-shadow: 0 0 0 3px rgba(234, 106, 21, 0.22);
          outline: none;
        }
      `}</style>

      <main className="min-h-screen min-h-[100dvh] w-full bg-[#072619] text-[#FAF6EE] flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
        {/* MOBILE HERO BANNER (< lg): Shows photo cleanly framed at the top without any floating card over faces */}
        <div className="lg:hidden relative w-full h-56 sm:h-72 overflow-hidden bg-[#072619] flex-shrink-0">
          <Image
            src="/images/jiddah_campus_community.jpg"
            alt="Jiddah Islamic Nursery and Primary School students and campus"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_28%]"
          />
          {/* Bottom vignette blending seamlessly into the dark forest background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#072619] via-[#072619]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#072619]/50 via-transparent to-transparent" />

          {/* Compact brand header overlay on mobile */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#072619]/80 backdrop-blur-md border border-[#164E35] text-[11px] font-semibold text-[#FAF6EE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA6A15] animate-pulse" />
              <span>TERM 3, 2026</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-200/80 bg-[#072619]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#164E35]/60">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Official Staff Portal</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#FAF6EE] drop-shadow-md">
              Jiddah Islamic Nursery &amp; Primary School
            </h2>
            <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
              Strive for Life &amp; Hereafter • Day and Boarding
            </p>
          </div>
        </div>

        {/* DESKTOP SHOWCASE COLUMN (lg:col-span-7): Full height, editorial framing, traffic-cone vignette, gold pill lockup */}
        <section className="hidden lg:flex lg:col-span-7 relative flex-col justify-between overflow-hidden bg-[#072619] border-r border-[#134E35]/50">
          {/* Main School Photograph */}
          <div className="absolute inset-0">
            <Image
              src="/images/jiddah_campus_community.jpg"
              alt="Jiddah Islamic Nursery and Primary School students in green uniforms and orange hijabs with faculty in front of the campus mosque"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-[center_30%]"
            />
          </div>

          {/* Multi-layered directional vignettes:
              1. Heavy bottom-left gradient to completely mask the traffic cone on the pavement
              2. Right-edge gradient for smooth architectural seam into the authentication column
              3. Subtle top gradient for header pill legibility
          */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(0deg, #072619 0%, rgba(7, 38, 25, 0.98) 16%, rgba(7, 38, 25, 0.75) 32%, rgba(7, 38, 25, 0.2) 55%, transparent 80%),
                linear-gradient(90deg, rgba(7, 38, 25, 0.95) 0%, rgba(7, 38, 25, 0.7) 25%, rgba(7, 38, 25, 0.2) 50%, transparent 75%),
                linear-gradient(270deg, #072619 0%, rgba(7, 38, 25, 0.4) 10%, transparent 25%),
                linear-gradient(180deg, rgba(7, 38, 25, 0.8) 0%, rgba(7, 38, 25, 0.25) 20%, transparent 40%)
              `,
            }}
          />

          {/* Top Header Badge Lockup */}
          <header className="relative z-10 p-8 xl:p-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#072619]/85 backdrop-blur-md border border-[#164E35] text-xs font-semibold tracking-wide text-[#FAF6EE] shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#EA6A15] animate-pulse" />
              <span>JIDDAH ACADEMIC ENGINE</span>
              <span className="text-white/20">•</span>
              <span className="text-[#D4AF37] font-mono">PORTAL v2.4</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#072619]/75 backdrop-blur-md border border-[#164E35]/70 text-xs font-medium text-emerald-200/90 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Uganda MOES &amp; IPLE Standards</span>
            </div>
          </header>

          {/* Bottom Editorial Lockup (Positioned cleanly over masked pavement area) */}
          <footer className="relative z-10 p-8 xl:p-12 mt-auto">
            {/* Gold / Marigold Accent Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EA6A15]/20 border border-[#EA6A15]/45 text-[#F27A24] text-xs font-bold uppercase tracking-wider mb-3.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F27A24]" />
              TERM 3, 2026 • ACADEMIC &amp; THEOLOGY PORTAL
            </div>

            <h2 className="text-2xl xl:text-4xl font-extrabold text-[#FAF6EE] tracking-tight leading-tight mb-2 drop-shadow-sm">
              Jiddah Islamic Nursery &amp; Primary School
            </h2>

            <p className="text-sm xl:text-base font-medium text-emerald-200/90 leading-relaxed mb-4 max-w-xl">
              Day and Boarding School • Strive for Life &amp; Hereafter
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-emerald-500/20 text-xs text-emerald-300/80 font-medium">
              <span>Kampala, Uganda</span>
              <span className="text-emerald-500/40">•</span>
              <span>Integrated Secular &amp; Theology Standards</span>
              <span className="text-emerald-500/40">•</span>
              <span>Standard Competition Ranking (1224)</span>
            </div>
          </footer>
        </section>

        {/* RIGHT AUTHENTICATION COLUMN (lg:col-span-5): High-contrast institutional dark emerald surface */}
        <section
          className="lg:col-span-5 flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-10 xl:px-14 min-h-full bg-[#072619] relative z-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 85% 15%, rgba(234, 106, 21, 0.08) 0%, transparent 45%),
              radial-gradient(circle at 15% 85%, rgba(13, 92, 58, 0.35) 0%, transparent 55%)
            `,
          }}
        >
          {/* Top spacer or institutional bar */}
          <div className="w-full flex items-center justify-between pb-4">
            <div className="text-[11px] font-semibold text-emerald-300/70 tracking-wider uppercase">
              Official Staff Gateway
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>System Online</span>
            </div>
          </div>

          {/* Centered Authentication Form Box */}
          <div className="w-full max-w-md mx-auto my-auto py-4">
            {/* School Crest & Header Lockup: Clean proportioned frame with gold/emerald ring */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#093522] border border-[#1B5E3C] shadow-lg ring-1 ring-[#D4AF37]/35 flex-shrink-0">
                <JiddahLogo width={36} height={42} />
              </div>
              <div>
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-[#EA6A15]">
                  Jiddah Islamic Schools
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#FAF6EE] tracking-tight">
                  Staff Sign In
                </h1>
                <p className="text-xs text-emerald-300/70 mt-0.5">
                  Academic Assessment &amp; Reporting Portal
                </p>
              </div>
            </div>

            {/* Form Card */}
            <div className="w-full bg-[#093220]/75 backdrop-blur-md border border-[#164E35] rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/40">
              {/* SCREEN 1: LOGIN */}
              {screen === "login" && (
                <>
                  {alertBanner}

                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      loginForm.handleSubmit(handleLogin, handleLoginInvalid)(event);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold text-[#FAF6EE] mb-1.5 tracking-wide"
                      >
                        Official Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 w-4 h-4 text-[#7A9E8E] pointer-events-none" />
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          aria-label="Official Email Address"
                          placeholder="teacher@jiddahschool.ac.ug"
                          disabled={loading}
                          className="jiddah-auth-input w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl text-sm font-normal text-[#FAF6EE] focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          {...loginForm.register("email")}
                        />
                      </div>
                      {emailError && (
                        <p className="mt-1.5 text-xs text-[#F87171] font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{emailError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="password"
                          className="block text-xs font-semibold text-[#FAF6EE] tracking-wide"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          data-testid="forgot-password-trigger"
                          onClick={() => goTo("forgot")}
                          className="text-xs font-medium text-[#EA6A15] hover:text-[#F27A24] hover:underline focus:outline-none transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <LockKeyhole className="absolute left-3.5 w-4 h-4 text-[#7A9E8E] pointer-events-none" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          aria-label="Password"
                          placeholder="••••••••••••"
                          disabled={loading}
                          className="jiddah-auth-input w-full h-11 sm:h-12 pl-10 pr-11 rounded-xl text-sm font-normal text-[#FAF6EE] focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-1.5 w-9 h-9 flex items-center justify-center text-[#7A9E8E] hover:text-[#FAF6EE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA6A15] transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="mt-1.5 text-xs text-[#F87171] font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{passwordError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 sm:h-12 mt-2 rounded-xl font-bold text-sm text-[#FAF6EE] bg-gradient-to-r from-[#0D5C3A] via-[#107047] to-[#0D5C3A] hover:from-[#116F47] hover:to-[#148354] border border-[#2B8B5B]/60 shadow-lg shadow-black/30 hover:shadow-emerald-950/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#F27A24]" />
                          <span>Signing in to Jiddah Portal...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Jiddah Portal</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-[#F27A24]" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* SCREEN 2: FORGOT PASSWORD */}
              {screen === "forgot" && (
                <div data-testid="forgot-password-form">
                  <button
                    type="button"
                    onClick={() => goTo("login")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-[#EA6A15] mb-5 transition-colors focus:outline-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Sign In
                  </button>

                  <h2 className="text-lg font-bold text-[#FAF6EE] mb-1">
                    Reset Staff Password
                  </h2>
                  <p className="text-xs text-emerald-200/70 leading-relaxed mb-5">
                    Enter your official staff email address. If email delivery is offline, the School Administrator will assist with an instant temporary passcode.
                  </p>

                  {forgotSuccessMessage && (
                    <div
                      role="status"
                      data-testid="forgot-password-confirmation"
                      className="mb-4 p-3.5 rounded-xl bg-[#07361E] border border-[#1E6B43] text-emerald-100 text-xs leading-relaxed flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0 mt-0.5" />
                      <span>{forgotSuccessMessage}</span>
                    </div>
                  )}

                  {alertBanner}

                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      forgotForm.handleSubmit(handleForgot)(event);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="forgot-email"
                        className="block text-xs font-semibold text-[#FAF6EE] mb-1.5 tracking-wide"
                      >
                        Official Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 w-4 h-4 text-[#7A9E8E] pointer-events-none" />
                        <input
                          id="forgot-email"
                          type="email"
                          autoComplete="email"
                          aria-label="Staff email address"
                          placeholder="teacher@jiddahschool.ac.ug"
                          disabled={loading}
                          className="jiddah-auth-input w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl text-sm font-normal text-[#FAF6EE] focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          {...forgotForm.register("email")}
                        />
                      </div>
                      {forgotEmailError && (
                        <p className="mt-1.5 text-xs text-[#F87171] font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{forgotEmailError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 sm:h-12 rounded-xl font-bold text-sm text-[#FAF6EE] bg-gradient-to-r from-[#0D5C3A] via-[#107047] to-[#0D5C3A] hover:from-[#116F47] hover:to-[#148354] border border-[#2B8B5B]/60 shadow-lg shadow-black/30 flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#F27A24]" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset Instructions</span>
                          <ArrowRight className="w-4 h-4 text-[#F27A24]" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* SCREEN 3: RESET PASSWORD */}
              {screen === "reset" && (
                <div>
                  <h2 className="text-lg font-bold text-[#FAF6EE] mb-1">
                    Choose New Password
                  </h2>
                  <p className="text-xs text-emerald-200/70 leading-relaxed mb-5">
                    Please enter a strong new password for your institutional staff account.
                  </p>

                  {alertBanner}

                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      resetForm.handleSubmit(handleReset)(event);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="reset-password"
                        className="block text-xs font-semibold text-[#FAF6EE] mb-1.5 tracking-wide"
                      >
                        New Password
                      </label>
                      <div className="relative flex items-center">
                        <LockKeyhole className="absolute left-3.5 w-4 h-4 text-[#7A9E8E] pointer-events-none" />
                        <input
                          id="reset-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          aria-label="New password"
                          placeholder="Minimum 6 characters"
                          disabled={loading}
                          className="jiddah-auth-input w-full h-11 sm:h-12 pl-10 pr-11 rounded-xl text-sm font-normal text-[#FAF6EE] focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          {...resetForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-1.5 w-9 h-9 flex items-center justify-center text-[#7A9E8E] hover:text-[#FAF6EE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#EA6A15] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {resetPasswordError && (
                        <p className="mt-1.5 text-xs text-[#F87171] font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{resetPasswordError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 sm:h-12 rounded-xl font-bold text-sm text-[#FAF6EE] bg-gradient-to-r from-[#0D5C3A] via-[#107047] to-[#0D5C3A] hover:from-[#116F47] hover:to-[#148354] border border-[#2B8B5B]/60 shadow-lg shadow-black/30 flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#F27A24]" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save New Password</span>
                          <ArrowRight className="w-4 h-4 text-[#F27A24]" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Security & Role Badge */}
          <footer className="mt-6 pt-4 border-t border-[#134E35]/60 text-center text-xs text-emerald-200/60 flex flex-col items-center gap-1.5">
            <div className="inline-flex items-center gap-2 text-[11px] text-emerald-300/80 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Role-Based Access Control • Administrator, DOS &amp; Teachers Only</span>
            </div>
            <p className="text-[11px] text-emerald-400/50">
              Need credentials or account recovery? Contact School Administrator.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#072619]" />}>
      <LoginContent />
    </Suspense>
  );
}
