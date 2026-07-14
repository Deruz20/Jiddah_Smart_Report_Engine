"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap, ArrowRight, RefreshCw, Lock, Mail, ChevronLeft } from "lucide-react";
// We'll use window.alert for toast for simplicity unless sonner is fully configured
// import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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
  }, [router, redirectTo, supabase]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    ...authFormOptions,
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpFormSchema),
    ...authFormOptions,
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", role: "Admin" },
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
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      
      if (
        data.user?.user_metadata?.role?.toLowerCase().includes("teacher") &&
        !data.user?.user_metadata?.onboarding_completed
      ) {
        router.replace("/onboarding");
      } else {
        router.replace(redirectTo);
      }
    } catch (error: any) {
      // Clear corrupt session cache if login fails
      try {
        await supabase.auth.signOut();
        localStorage.clear();
      } catch (e) {}
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.fullName,
          email: values.email,
          password: values.password,
          role: values.role,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      alert("Account created! Please check your email to verify your account or sign in.");
      setScreen("login");
    } catch (error: any) {
      alert(error.message || "Error creating account");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (values: ForgotPasswordForm) => {
    setLoading(true);
    const supabase = createClient();
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
    const supabase = createClient();
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
    <div className="min-h-screen flex bg-[#0B1120] text-slate-200 overflow-hidden relative font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/jiddah_islamic_school.jpg"
          alt="School Background"
          fill
          className="object-cover opacity-[0.08] mix-blend-screen grayscale"
          priority
        />
        <div className="absolute top-0 left-0 w-full h-full bg-[#0B1120]/80" />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.08, 0.12, 0.08] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="hidden lg:block absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-emerald-700/20 rounded-full blur-[100px] will-change-transform" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.08, 0.05] }} 
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="hidden lg:block absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[100px] will-change-transform" 
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col items-center justify-center p-12">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="text-center max-w-lg"
        >
          <div className="relative inline-block mb-10">
            <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full" />
            <img
              src="/school_budge.jpeg"
              alt="Jiddah Islamic School"
              className="relative w-32 h-32 rounded-[2rem] object-cover border border-white/10 shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 mb-6 tracking-tight leading-tight">
            Jiddah Islamic <br /> Nursery & Primary
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-12">
            Smart Report Engine — Enterprise Academic Management Platform
          </p>

          <div className="grid grid-cols-3 gap-4">
            {[
              ["100%", "Secure"], 
              ["Smart", "Analytics"], 
              ["Auto", "Reports"]
            ].map(([val, label], i) => (
              <motion.div 
                key={label as string}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                className="bg-[#0f172a]/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg transition-all hover:bg-[#0f172a]/60"
              >
                <p className="text-xl sm:text-2xl font-bold text-slate-100 mb-1">{val}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-16 text-sm text-slate-500 font-arabic tracking-wider" dir="rtl">
            بسم الله الرحمن الرحيم
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="w-full max-w-[440px] bg-white/5 backdrop-blur-2xl border border-white/10 p-6 sm:p-10 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.3)] relative overflow-hidden"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-4 mb-8">
            <img src="/school_budge.jpeg" alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg" />
            <div className="text-left">
              <p className="font-bold text-white text-lg leading-tight">Jiddah Islamic</p>
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Smart Report Engine</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* LOGIN */}
            {screen === "login" && (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                noValidate onSubmit={loginForm.handleSubmit(handleLogin, handleLoginInvalid)}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h2>
                  <p className="text-sm text-slate-400">Sign in to your account to continue</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type="email"
                        placeholder="you@jiddahschool.edu.ug"
                        {...loginForm.register("email")}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:bg-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    {visibleFieldError(loginForm, "email") && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-400" />{visibleFieldError(loginForm, "email")}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="Enter your password"
                        {...loginForm.register("password")}
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl outline-none transition-all bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:bg-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                        {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {visibleFieldError(loginForm, "password") && (
                      <p className="mt-2 text-sm text-red-400 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-400" />{visibleFieldError(loginForm, "password")}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" className="peer appearance-none w-4 h-4 rounded border border-slate-600 bg-white/5 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer" />
                        <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setScreen("forgot")} className="text-sm text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white overflow-hidden group disabled:opacity-70 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-transform group-hover:scale-105" />
                    <div className="relative flex items-center gap-2">
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </div>
                  </button>
                </div>
              </motion.form>
            )}



            {/* FORGOT PASSWORD */}
            {screen === "forgot" && (
              <motion.form 
                key="forgot"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                noValidate onSubmit={forgotForm.handleSubmit(handleForgot)}
              >
                <button type="button" onClick={() => setScreen("login")} className="flex items-center gap-1.5 mb-6 text-sm text-slate-400 hover:text-white transition-colors group">
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Back to login</span>
                </button>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Forgot Password</h2>
                  <p className="text-sm text-slate-400">Enter your email to receive a reset code</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                  <div className="relative mb-6 group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="email"
                      placeholder="you@jiddahschool.edu.ug"
                      {...forgotForm.register("email")}
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:bg-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {visibleFieldError(forgotForm, "email") && (
                    <p className="mt-2 text-sm text-red-400">{visibleFieldError(forgotForm, "email")}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white overflow-hidden group disabled:opacity-70 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-transform group-hover:scale-105" />
                    <div className="relative flex items-center gap-2">
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
                    </div>
                  </button>
                </div>
              </motion.form>
            )}

            {/* OTP */}
            {screen === "otp" && (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
              >
                <button onClick={() => setScreen("forgot")} className="flex items-center gap-1.5 mb-6 text-sm text-slate-400 hover:text-white transition-colors group">
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Back</span>
                </button>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Enter OTP</h2>
                  <p className="text-sm text-slate-400">We sent a 6-digit code to <strong className="text-white">{currentEmail || 'your email'}</strong></p>
                </div>
                <div className="flex gap-3 mb-8 justify-center">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength={1}
                      value={v}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      className="w-12 h-14 text-center rounded-xl outline-none text-xl font-bold transition-all bg-white/5 text-white"
                      style={{ 
                        border: v ? "2px solid #10B981" : "1.5px solid rgba(255,255,255,0.1)",
                        boxShadow: v ? "0 0 10px rgba(16,185,129,0.2)" : "none" 
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleOtp}
                  disabled={loading}
                  className="relative w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white overflow-hidden group disabled:opacity-70 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-transform group-hover:scale-105" />
                  <div className="relative flex items-center gap-2">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Verify Code"}
                  </div>
                </button>
                <button onClick={forgotForm.handleSubmit(handleForgot)} className="w-full mt-4 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                  Resend code
                </button>
              </motion.div>
            )}

            {/* RESET PASSWORD */}
            {screen === "reset" && (
              <motion.form 
                key="reset"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                noValidate onSubmit={resetForm.handleSubmit(handleReset)}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">New Password</h2>
                  <p className="text-sm text-slate-400">Choose a strong new password for your account</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      {...resetForm.register("password")}
                      className="w-full px-4 py-3.5 rounded-xl outline-none transition-all bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:bg-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {visibleFieldError(resetForm, "password") && (
                      <p className="mt-2 text-sm text-red-400">{visibleFieldError(resetForm, "password")}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white overflow-hidden group disabled:opacity-70 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-transform group-hover:scale-105" />
                    <div className="relative flex items-center gap-2">
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Reset Password"}
                    </div>
                  </button>
                </div>
              </motion.form>
            )}

            {/* WELCOME */}
            {screen === "welcome" && (
              <motion.div 
                key="welcome"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <GraduationCap className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Assalamu Alaikum</h2>
                <p className="text-lg text-slate-200 mb-1">Welcome back, verified user</p>
                <p className="text-sm text-slate-400 mb-8">Jiddah Islamic Nursery & Primary School</p>
                
                <button
                  onClick={() => router.push("/admin")}
                  className="relative w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-white overflow-hidden group transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-transform group-hover:scale-105" />
                  <div className="relative flex items-center gap-2">
                    <span>Go to Dashboard</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
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
