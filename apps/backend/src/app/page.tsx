"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, BookOpen, ArrowRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

function RoleCard({
  title,
  description,
  icon: Icon,
  onClick,
  delay,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  delay: number;
  accent: "emerald" | "orange";
}) {
  const isEmerald = accent === "emerald";
  
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative group w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between min-h-[200px]"
    >
      <div
        className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10 ${
          isEmerald ? "bg-emerald-500/20" : "bg-orange-500/20"
        }`}
      />
      
      <div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
          isEmerald ? "bg-emerald-500/20 text-emerald-300" : "bg-orange-500/20 text-orange-300"
        }`}>
          <Icon className="w-7 h-7" strokeWidth={2} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-300 font-medium leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 flex items-center text-sm font-bold text-white/70 group-hover:text-white transition-colors">
        Enter Portal <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
      </div>
    </motion.button>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Dynamic Background Mesh & Image Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Image 
          src="/images/jiddah_islamic_school.jpg"
          alt="Jiddah Islamic School"
          fill
          className="object-cover opacity-20 object-center grayscale mix-blend-overlay"
          priority
        />
        
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-600/40 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-orange-600/30 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-1/4 right-1/4 w-1/3 h-1/3 bg-emerald-900/50 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <main className="relative z-10 w-full max-w-5xl px-6 py-12 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-16 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">System Online</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 tracking-tight mb-6"
          >
            Jiddah Smart <br className="hidden md:block" /> Report Engine
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
            className="text-base md:text-lg text-slate-400 font-medium leading-relaxed"
          >
            A powerful, intelligent academic management suite. Select your designated role portal to access your dashboard.
          </motion.p>
        </div>

        {/* Roles Grid */}
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          <RoleCard
            title="Administrator"
            description="Complete access to system settings, student records, staff management, and comprehensive analytics."
            icon={ShieldCheck}
            accent="emerald"
            delay={0.3}
            onClick={() => router.push("/login?role=admin")}
          />
          <RoleCard
            title="Teacher / Staff"
            description="Manage your assigned classes, input academic marks, handle reports, and track student attendance."
            icon={BookOpen}
            accent="orange"
            delay={0.4}
            onClick={() => router.push("/login?role=teacher")}
          />
        </div>
      </main>
    </div>
  );
}
