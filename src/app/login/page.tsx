"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  Lock,
  Mail,
  ChevronLeft,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import JiddahLogo from "@/components/brand/JiddahLogo";

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
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string>("#0F4D25");
  const [schoolName, setSchoolName] = useState<string>("Jiddah Islamic Schools");

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

    // Dynamically load school branding if cached or available
    try {
      const cached = localStorage.getItem("jiddah_school_branding");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.theme_color) setAccentColor(parsed.theme_color);
        if (parsed.school_name) setSchoolName(parsed.school_name);
      }
    } catch {}
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
    console.log("[handleLogin called with]:", values.email);
    setLoading(true);
    setAuthErrorMessage(null);
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      console.log("[handleLogin success]: redirecting to", redirectTo);
      if (
        data.user?.user_metadata?.role?.toLowerCase().includes("teacher") &&
        !data.user?.user_metadata?.onboarding_completed
      ) {
        window.location.href = "/onboarding";
      } else {
        window.location.href = redirectTo;
      }
    } catch (error: any) {
      console.log("[handleLogin error]:", error?.message);
      try {
        await supabase.auth.signOut();
      } catch {}
      const msg = error.message || "Invalid email or password. Please verify your credentials.";
      setAuthErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInvalid = (errors: FieldErrors<LoginForm>) => {
    console.log("[handleLoginInvalid errors]:", JSON.stringify(errors));
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
      const msg = error.message || "Unable to process password reset request.";
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
      const msg = error.message || "Error resetting password.";
      setAuthErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FDFBF7] text-stone-900 overflow-x-hidden overflow-y-auto font-sans">
      {/* Left Panel — Editorial Paper & School Identity (Desktop) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-[#FAF7F2] border-r border-stone-200 flex-col justify-between p-12">
        <div className="flex items-center gap-3.5">
          <JiddahLogo height={44} className="w-auto drop-shadow-sm shrink-0" />
          <div>
            <p className="text-sm font-bold text-stone-900 tracking-tight">{schoolName}</p>
            <p className="text-xs text-stone-500 font-medium">Academic Assessment & Reporting System</p>
          </div>
        </div>

        <div className="max-w-md space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#0F4D25]">
            <span>Reporting-Cycle Control Room</span>
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Fast, accurate mark entry &amp; official terminal reports.
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Built for Class Teachers, Heads of Department, and School Administrators to record secular and theology assessments and print verified A4 report cards.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2 tabular-nums">
            {[
              ["BOT / MOT / EOT", "Assessments"],
              ["1, 2, 2, 4", "UNEB Tie Rank"],
              ["A4 Ready", "Print Studio"],
            ].map(([val, label]) => (
              <div
                key={label}
                className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs"
              >
                <p className="text-xs font-bold text-stone-900">{val}</p>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 border-t border-stone-200/80 pt-4 tabular-nums">
          <span>{schoolName}</span>
          <span>Authorized Staff Portal</span>
        </div>
      </div>

      {/* Right Panel — Instant Auth Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-[420px] bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Mobile School Header */}
          <div className="lg:hidden flex items-center gap-3 pb-6 mb-6 border-b border-stone-100">
            <JiddahLogo height={38} className="w-auto drop-shadow-sm shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-stone-900 text-sm truncate">{schoolName}</p>
              <p className="text-xs text-stone-500 font-medium truncate">Staff Assessment Portal</p>
            </div>
          </div>

          {/* LOGIN SCREEN */}
          {screen === "login" && (
            <form
              noValidate
              action="javascript:void(0)"
              onSubmit={(e) => {
                e.preventDefault();
                loginForm.handleSubmit(handleLogin, handleLoginInvalid)(e);
              }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Staff Sign In</h2>
                <p className="text-xs text-stone-600 mt-1">
                  Enter your school email and password to access your assigned classes.
                </p>
              </div>

              {authErrorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authErrorMessage}</span>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="teacher@jiddahschool.ug"
                    {...loginForm.register("email")}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl outline-none transition-colors bg-[#FAF7F2] border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#0F4D25]"
                  />
                </div>
                {visibleFieldError(loginForm, "email") && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {visibleFieldError(loginForm, "email")}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-bold text-stone-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...loginForm.register("password")}
                    className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl outline-none transition-colors bg-[#FAF7F2] border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#0F4D25]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-stone-800 rounded-lg cursor-pointer"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {visibleFieldError(loginForm, "password") && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {visibleFieldError(loginForm, "password")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="min-h-[44px] flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-[#0F4D25] focus:ring-[#0F4D25] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-stone-700">Keep me signed in</span>
                </label>

                <button
                  type="button"
                  data-testid="forgot-password-trigger"
                  onClick={() => {
                    setAuthErrorMessage(null);
                    setForgotSuccessMessage(null);
                    setScreen("forgot");
                  }}
                  className="min-h-[44px] px-2 text-xs font-bold text-[#0F4D25] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  loginForm.handleSubmit(handleLogin, handleLoginInvalid)(e);
                }}
                style={{ backgroundColor: accentColor }}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-60 transition cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD SCREEN (Working Reset + Admin Fallback) */}
          {screen === "forgot" && (
            <form
              noValidate
              action="javascript:void(0)"
              onSubmit={(e) => {
                e.preventDefault();
                forgotForm.handleSubmit(handleForgot)(e);
              }}
              className="space-y-5"
              data-testid="forgot-password-form"
            >
              <button
                type="button"
                onClick={() => {
                  setAuthErrorMessage(null);
                  setForgotSuccessMessage(null);
                  setScreen("login");
                }}
                className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to sign in</span>
              </button>

              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Password Recovery</h2>
                <p className="text-xs text-stone-600 mt-1">
                  Enter your staff email to receive a reset link or notify the School Administrator for an immediate credential reset.
                </p>
              </div>

              {authErrorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authErrorMessage}</span>
                </div>
              )}

              {forgotSuccessMessage && (
                <div
                  role="status"
                  data-testid="forgot-password-confirmation"
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2"
                >
                  <div className="flex items-center gap-2 font-bold text-[#0F4D25]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Reset Request Logged</span>
                  </div>
                  <p className="leading-relaxed">{forgotSuccessMessage}</p>
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="teacher@jiddahschool.ug"
                    {...forgotForm.register("email")}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl outline-none transition-colors bg-[#FAF7F2] border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#0F4D25]"
                  />
                </div>
                {visibleFieldError(forgotForm, "email") && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {visibleFieldError(forgotForm, "email")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  forgotForm.handleSubmit(handleForgot)(e);
                }}
                style={{ backgroundColor: accentColor }}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-60 transition cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Request Password Reset</span>}
              </button>

              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-stone-200 text-[11px] text-stone-600 leading-relaxed">
                <strong className="text-stone-800">Admin-Assisted Fallback:</strong> Class Teachers and DOS accounts can also have their password reset directly by the School Administrator under{" "}
                <span className="font-semibold text-stone-800">Staff Accounts</span>.
              </div>
            </form>
          )}

          {/* RESET PASSWORD SCREEN */}
          {screen === "reset" && (
            <form
              noValidate
              action="javascript:void(0)"
              onSubmit={(e) => {
                e.preventDefault();
                resetForm.handleSubmit(handleReset)(e);
              }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Choose New Password</h2>
                <p className="text-xs text-stone-600 mt-1">Enter a strong new password for your staff account.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  {...resetForm.register("password")}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl outline-none transition-colors bg-[#FAF7F2] border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#0F4D25]"
                />
                {visibleFieldError(resetForm, "password") && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {visibleFieldError(resetForm, "password")}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  resetForm.handleSubmit(handleReset)(e);
                }}
                style={{ backgroundColor: accentColor }}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-60 transition cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Save New Password</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7]" />}>
      <LoginContent />
    </Suspense>
  );
}
