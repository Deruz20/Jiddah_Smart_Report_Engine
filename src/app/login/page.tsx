"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldAlert,
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
  "Unable to reach the authentication service. Please check your network connection and try again.";

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
        `Password reset instructions sent for ${values.email}. If email delivery is unavailable, contact your School Administrator for a temporary password.`;
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

  const compactAlert = authErrorMessage && (
    <div
      role="alert"
      className="mb-5 bg-[#FFF8F6] border border-[#F5C6CB] text-[#9F1D2C] rounded-lg px-3.5 py-2.5 text-xs flex items-center gap-2.5 leading-snug"
    >
      <ShieldAlert className="w-4 h-4 text-[#C92A2A] flex-shrink-0" />
      <span className="flex-1">{authErrorMessage}</span>
    </div>
  );

  return (
    <>
      <style jsx global>{`
        /* Explicit Browser Autofill Overrides: keeps crisp white surface without yellow/green tint */
        .clerk-input:-webkit-autofill,
        .clerk-input:-webkit-autofill:hover,
        .clerk-input:-webkit-autofill:focus,
        .clerk-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          -webkit-text-fill-color: #111827 !important;
          caret-color: #D97706 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .clerk-input:autofill {
          box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          filter: none !important;
          color: #111827 !important;
        }
      `}</style>

      {/* Page Canvas: Warm Cream/Alabaster (#FAF7F2) with subtle top warm-gold ambient wash */}
      <main
        className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF7F2] text-[#111827]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(217, 119, 6, 0.07), transparent 70%)",
        }}
      >
        {/* Single Centered Authentication Card */}
        <div className="w-full max-w-[400px] bg-[#FFFFFF] rounded-2xl border border-[#EAE4DC] p-8 relative overflow-hidden shadow-[0_12px_36px_-8px_rgba(15,41,30,0.07),0_2px_6px_-1px_rgba(15,41,30,0.03)]">
          {/* Delicate 3px Top Accent Bar */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, #0D5C3A 0%, #D97706 60%, #EA580C 100%)",
            }}
          />

          {/* Clean Header Lockup: School Badge + Heading + Subheading */}
          <header className="flex flex-col items-center text-center mb-6 pt-1">
            <div className="w-[68px] h-[68px] rounded-[14px] bg-[#FBF9F5] border border-[#E8DFCE] flex items-center justify-center shadow-xs">
              <JiddahLogo width={48} height={52} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[#111827] mt-4">
              {screen === "login" && "Staff Sign In"}
              {screen === "forgot" && "Reset Password"}
              {screen === "reset" && "Choose New Password"}
            </h1>
            <p className="text-xs font-medium text-[#6B7280] mt-1">
              Jiddah Islamic Nursery &amp; Primary School
            </p>
          </header>

          {/* SCREEN 1: LOGIN */}
          {screen === "login" && (
            <>
              {compactAlert}

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
                    className="block text-[13px] font-medium text-[#374151] mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center group">
                    <Mail className="absolute left-3.5 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#D97706] transition-colors pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      aria-label="Email address"
                      placeholder="name@jiddahschool.ac.ug"
                      disabled={loading}
                      className="clerk-input w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#DCD6CC] bg-[#FFFFFF] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#D97706] focus:ring-3 focus:ring-[#D97706]/15 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      {...loginForm.register("email")}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1.5 text-xs text-[#DC2626] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-[13px] font-medium text-[#374151]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      data-testid="forgot-password-trigger"
                      onClick={() => goTo("forgot")}
                      className="text-xs font-medium text-[#C25E00] hover:text-[#9A4A00] hover:underline focus:outline-none transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center group">
                    <LockKeyhole className="absolute left-3.5 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#D97706] transition-colors pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      aria-label="Password"
                      placeholder="••••••••••••"
                      disabled={loading}
                      className="clerk-input w-full h-11 pl-10 pr-10 rounded-lg border border-[#DCD6CC] bg-[#FFFFFF] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#D97706] focus:ring-3 focus:ring-[#D97706]/15 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 w-7 h-7 flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] rounded focus:outline-none focus:ring-1 focus:ring-[#D97706] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1.5 text-xs text-[#DC2626] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded-lg font-medium text-sm text-[#FFFFFF] bg-[#0D5C3A] hover:bg-[#09472C] active:bg-[#073822] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFFFF]" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
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
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#111827] mb-4 transition-colors focus:outline-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>

              <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
                Enter your staff email address and we will provide instructions to reset your password.
              </p>

              {forgotSuccessMessage && (
                <div
                  role="status"
                  data-testid="forgot-password-confirmation"
                  className="mb-4 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded-lg px-3.5 py-2.5 text-xs flex items-center gap-2.5 leading-snug"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                  <span>{forgotSuccessMessage}</span>
                </div>
              )}

              {compactAlert}

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
                    className="block text-[13px] font-medium text-[#374151] mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center group">
                    <Mail className="absolute left-3.5 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#D97706] transition-colors pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      aria-label="Staff email address"
                      placeholder="name@jiddahschool.ac.ug"
                      disabled={loading}
                      className="clerk-input w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#DCD6CC] bg-[#FFFFFF] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#D97706] focus:ring-3 focus:ring-[#D97706]/15 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      {...forgotForm.register("email")}
                    />
                  </div>
                  {forgotEmailError && (
                    <p className="mt-1.5 text-xs text-[#DC2626] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{forgotEmailError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg font-medium text-sm text-[#FFFFFF] bg-[#0D5C3A] hover:bg-[#09472C] active:bg-[#073822] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFFFF]" />
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    <span>Send reset instructions</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 3: RESET PASSWORD */}
          {screen === "reset" && (
            <div>
              <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
                Please enter a new password for your staff account.
              </p>

              {compactAlert}

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
                    className="block text-[13px] font-medium text-[#374151] mb-1.5"
                  >
                    New password
                  </label>
                  <div className="relative flex items-center group">
                    <LockKeyhole className="absolute left-3.5 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#D97706] transition-colors pointer-events-none" />
                    <input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      aria-label="New password"
                      placeholder="Minimum 6 characters"
                      disabled={loading}
                      className="clerk-input w-full h-11 pl-10 pr-10 rounded-lg border border-[#DCD6CC] bg-[#FFFFFF] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#D97706] focus:ring-3 focus:ring-[#D97706]/15 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      {...resetForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 w-7 h-7 flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] rounded focus:outline-none focus:ring-1 focus:ring-[#D97706] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {resetPasswordError && (
                    <p className="mt-1.5 text-xs text-[#DC2626] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{resetPasswordError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg font-medium text-sm text-[#FFFFFF] bg-[#0D5C3A] hover:bg-[#09472C] active:bg-[#073822] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFFFF]" />
                      <span>Saving password...</span>
                    </>
                  ) : (
                    <span>Save new password</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Minimal Footer Below Card */}
        <footer className="mt-6 text-xs text-[#8C857B] text-center font-normal">
          © 2026 Jiddah Islamic Nursery &amp; Primary School
        </footer>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2]" />}>
      <LoginContent />
    </Suspense>
  );
}
