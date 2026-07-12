"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap, ArrowRight, RefreshCw, Lock, Mail, ChevronLeft } from "lucide-react";
// We'll use window.alert for toast for simplicity unless sonner is fully configured
// import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import {
  forgotPasswordSchema,
  loginFormSchema,
  resetPasswordSchema,
  signUpFormSchema,
  type ForgotPasswordForm,
  type LoginForm,
  type ResetPasswordForm,
  type SignUpForm,
} from "@/lib/validation";

type Screen = "login" | "signup" | "forgot" | "otp" | "reset" | "welcome";

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
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") ?? "/admin";
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(redirectTo);
      }
    });
  }, [router, redirectTo, supabase]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    ...authFormOptions,
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpFormSchema),
    ...authFormOptions,
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
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
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      router.replace(redirectTo);
    } catch (error: any) {
      alert(error.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInvalid = (errors: FieldErrors<LoginForm>) => {
    const message = firstFieldError(errors) ?? "Please check your email and password";
    alert(message);
  };

  const handleSignUpInvalid = (errors: FieldErrors<SignUpForm>) => {
    const message = firstFieldError(errors) ?? "Please complete all required fields";
    alert(message);
  };

  const handleSignUp = async (values: SignUpForm) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          }
        }
      });
      if (error) throw error;
      if (data.session) {
        router.replace(redirectTo);
      } else {
        alert("Account created! Please check your email to verify your account.");
        setScreen("login");
      }
    } catch (error: any) {
      alert(error.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (values: ForgotPasswordForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email);
      if (error) throw error;
      alert("Password reset email sent (check your inbox or spam)");
      setCurrentEmail(values.email);
      setScreen("login"); // OTP UI not fully wired to supabase magic links here to keep it simple, so redirect to login
    } catch (error: any) {
      alert(error.message || "Error sending reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async () => {
    if (otp.join("").length < 6) {
      alert("Enter complete OTP");
      return;
    }
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setScreen("reset");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values: ResetPasswordForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });
      if (error) throw error;
      alert("Password reset successful");
      setScreen("login");
    } catch (error: any) {
      alert(error.message || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i: number, v: string) => {
    if (v.length > 1) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) {
      (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const IslamicPattern = () => (
    <svg width="100%" height="100%" viewBox="0 0 600 600" className="absolute inset-0 w-full h-full opacity-10">
      <defs>
        <pattern id="islamic" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <polygon points="30,0 60,15 60,45 30,60 0,45 0,15" fill="none" stroke="white" strokeWidth="0.8" />
          <polygon points="30,10 50,20 50,40 30,50 10,40 10,20" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="30" cy="30" r="4" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamic)" />
    </svg>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "#FEFDF8" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #065F46 0%, #047857 40%, #10B981 100%)" }}>
        <IslamicPattern />
        <div className="relative z-10 text-center max-w-md">
          <img
            src="/school_budge.jpeg"
            alt="Jiddah Islamic School"
            className="w-24 h-24 rounded-3xl object-cover mx-auto mb-8"
            style={{ border: "2px solid rgba(245,158,11,0.4)" }}
          />
          <h1 className="text-white mb-3" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
            Jiddah Islamic Nursery & Primary School
          </h1>
          <p className="mb-8" style={{ color: "rgba(255,255,255,0.75)", fontSize: "16px", lineHeight: "1.7" }}>
            Smart Report Engine — Enterprise Academic Management Platform
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[["240+", "Students"], ["22", "Teachers"], ["8", "Classes"]].map(([num, label]) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
                <p className="text-white text-2xl font-bold">{num}</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-12" style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            بسم الله الرحمن الرحيم
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/school_budge.jpeg" alt="Jiddah Islamic School" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <p className="font-bold" style={{ color: "#065F46", fontSize: "14px" }}>Jiddah Islamic School</p>
              <p style={{ color: "#6B7280", fontSize: "12px" }}>Smart Report Engine</p>
            </div>
          </div>

          {/* LOGIN */}
          {screen === "login" && (
            <form noValidate onSubmit={loginForm.handleSubmit(handleLogin, handleLoginInvalid)}>
              <h2 className="mb-1" style={{ color: "#065F46", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700 }}>Welcome Back</h2>
              <p className="mb-8" style={{ color: "#6B7280", fontSize: "14px" }}>Sign in to your account to continue</p>

              <div className="space-y-5">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
                    <input
                      type="email"
                      placeholder="you@jiddahschool.edu.ng"
                      {...loginForm.register("email")}
                      aria-invalid={!!visibleFieldError(loginForm, "email")}
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all"
                      style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px", color: "#374151" }}
                    />
                  </div>
                  {visibleFieldError(loginForm, "email") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(loginForm, "email")}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      {...loginForm.register("password")}
                      aria-invalid={!!visibleFieldError(loginForm, "password")}
                      className="w-full pl-10 pr-10 py-3 rounded-xl outline-none transition-all"
                      style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px", color: "#374151" }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPass ? <EyeOff className="w-4 h-4" style={{ color: "#9CA3AF" }} /> : <Eye className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
                    </button>
                  </div>
                  {visibleFieldError(loginForm, "password") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(loginForm, "password")}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>Remember me</span>
                  </label>
                  <button type="button" onClick={() => setScreen("forgot")} style={{ fontSize: "13px", color: "#10B981", fontWeight: 600 }}>
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "15px" }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <p className="mt-6 text-center" style={{ fontSize: "13px", color: "#6B7280" }}>
                No account?{" "}
                <button type="button" onClick={() => setScreen("signup")} style={{ color: "#10B981", fontWeight: 600 }}>
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP */}
          {screen === "signup" && (
            <form noValidate onSubmit={signUpForm.handleSubmit(handleSignUp, handleSignUpInvalid)}>
              <h2 className="mb-1" style={{ color: "#065F46", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700 }}>Create Account</h2>
              <p className="mb-8" style={{ color: "#6B7280", fontSize: "14px" }}>Register to access the admin dashboard</p>

              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    {...signUpForm.register("fullName")}
                    aria-invalid={!!visibleFieldError(signUpForm, "fullName")}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                  />
                  {visibleFieldError(signUpForm, "fullName") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(signUpForm, "fullName")}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
                    <input
                      type="email"
                      placeholder="you@jiddahschool.edu.ng"
                      {...signUpForm.register("email")}
                      aria-invalid={!!visibleFieldError(signUpForm, "email")}
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                      style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                    />
                  </div>
                  {visibleFieldError(signUpForm, "email") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(signUpForm, "email")}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    {...signUpForm.register("password")}
                    aria-invalid={!!visibleFieldError(signUpForm, "password")}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                  />
                  {visibleFieldError(signUpForm, "password") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(signUpForm, "password")}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    {...signUpForm.register("confirmPassword")}
                    aria-invalid={!!visibleFieldError(signUpForm, "confirmPassword")}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px" }}
                  />
                  {visibleFieldError(signUpForm, "confirmPassword") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(signUpForm, "confirmPassword")}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "15px" }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Create Account"}
                </button>
              </div>

              <p className="mt-6 text-center" style={{ fontSize: "13px", color: "#6B7280" }}>
                Already have an account?{" "}
                <button type="button" onClick={() => setScreen("login")} style={{ color: "#10B981", fontWeight: 600 }}>
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {screen === "forgot" && (
            <form noValidate onSubmit={forgotForm.handleSubmit(handleForgot)}>
              <button type="button" onClick={() => setScreen("login")} className="flex items-center gap-1 mb-6 hover:opacity-70 transition-all">
                <ChevronLeft className="w-4 h-4" style={{ color: "#6B7280" }} />
                <span style={{ fontSize: "13px", color: "#6B7280" }}>Back to login</span>
              </button>
              <h2 className="mb-1" style={{ color: "#065F46", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700 }}>Forgot Password</h2>
              <p className="mb-8" style={{ color: "#6B7280", fontSize: "14px" }}>Enter your email to receive an OTP reset code</p>
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>Email Address</label>
                <div className="relative mb-5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
                  <input
                    type="email"
                    placeholder="you@jiddahschool.edu.ng"
                    {...forgotForm.register("email")}
                    aria-invalid={!!visibleFieldError(forgotForm, "email")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px", color: "#374151" }}
                  />
                </div>
                {visibleFieldError(forgotForm, "email") && (
                  <p className="mt-2 text-sm text-red-600">{visibleFieldError(forgotForm, "email")}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "15px" }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
                </button>
              </div>
            </form>
          )}

          {/* OTP */}
          {screen === "otp" && (
            <div>
              <button onClick={() => setScreen("forgot")} className="flex items-center gap-1 mb-6 hover:opacity-70">
                <ChevronLeft className="w-4 h-4" style={{ color: "#6B7280" }} />
                <span style={{ fontSize: "13px", color: "#6B7280" }}>Back</span>
              </button>
              <h2 className="mb-1" style={{ color: "#065F46", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700 }}>Enter OTP</h2>
              <p className="mb-8" style={{ color: "#6B7280", fontSize: "14px" }}>We sent a 6-digit code to <strong>{currentEmail || 'your email'}</strong></p>
              <div className="flex gap-3 mb-6">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={v}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    className="w-12 h-14 text-center rounded-xl outline-none text-xl font-bold"
                    style={{ border: v ? "2px solid #10B981" : "1.5px solid #E5E7EB", background: v ? "rgba(16,185,129,0.05)" : "white", color: "#374151" }}
                  />
                ))}
              </div>
              <button
                onClick={handleOtp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "15px" }}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Verify Code"}
              </button>
              <button onClick={forgotForm.handleSubmit(handleForgot)} className="w-full mt-3 py-2 text-center" style={{ fontSize: "13px", color: "#10B981" }}>
                Resend code
              </button>
            </div>
          )}

          {/* RESET PASSWORD */}
          {screen === "reset" && (
            <form noValidate onSubmit={resetForm.handleSubmit(handleReset)}>
              <h2 className="mb-1" style={{ color: "#065F46", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700 }}>New Password</h2>
              <p className="mb-8" style={{ color: "#6B7280", fontSize: "14px" }}>Choose a strong new password for your account</p>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>New Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    {...resetForm.register("password")}
                    aria-invalid={!!visibleFieldError(resetForm, "password")}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ border: "1.5px solid #E5E7EB", background: "white", fontSize: "14px", color: "#374151" }}
                  />
                  {visibleFieldError(resetForm, "password") && (
                    <p className="mt-2 text-sm text-red-600">{visibleFieldError(resetForm, "password")}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "15px" }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          {/* WELCOME */}
          {screen === "welcome" && (
            <div className="text-center">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(16,185,129,0.1)" }}>
                <GraduationCap className="w-14 h-14" style={{ color: "#10B981" }} />
              </div>
              <h2 className="mb-2" style={{ color: "#065F46", fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700 }}>
                Assalamu Alaikum
              </h2>
              <p className="mb-2" style={{ color: "#374151", fontSize: "16px" }}>Welcome back, Ustazah Maryam Aliyu</p>
              <p className="mb-8" style={{ color: "#6B7280", fontSize: "14px" }}>Head Teacher · Jiddah Islamic Nursery & Primary School</p>
              <div className="rounded-2xl p-4 mb-8 text-left" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>📋 Today's Summary</p>
                <ul className="mt-2 space-y-1" style={{ fontSize: "13px", color: "#6B7280" }}>
                  <li>• 3 teachers have pending marks to submit</li>
                  <li>• Term 3 deadline is Friday, May 16th</li>
                  <li>• 22 Primary 6 reports are ready for download</li>
                </ul>
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10B981, #065F46)", color: "white", fontSize: "15px" }}
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
