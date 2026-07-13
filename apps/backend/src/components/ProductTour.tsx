"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Play, BookOpen, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
}

export function ProductTour({ isOpen, onClose, role }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // We customize steps based on role
  const getSteps = () => {
    const baseSteps = [
      {
        title: "Welcome to Jiddah Smart Report Engine!",
        content: "A centralized hub designed to make your academic tasks seamless, fast, and secure. Let's take a quick tour.",
        icon: <Play className="w-6 h-6 text-emerald-600" />
      },
      {
        title: "Dashboard Overview",
        content: "Your dashboard gives you a quick snapshot of the school's performance, recent activities, and quick access to your most used modules.",
        icon: <BookOpen className="w-6 h-6 text-emerald-600" />
      }
    ];

    if (role.toLowerCase().includes("admin") || role.toLowerCase().includes("dos")) {
      baseSteps.push({
        title: "Student & Staff Management",
        content: "Easily enroll new students, manage staff accounts, and configure academic terms directly from the sidebar.",
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />
      });
    }

    baseSteps.push({
      title: "Marks Entry & Reporting",
      content: "Navigate to Marks Entry to record scores. The system automatically calculates totals, grades, and aggregates for the Report Center.",
      icon: <BookOpen className="w-6 h-6 text-emerald-600" />
    });

    baseSteps.push({
      title: "You're All Set!",
      content: "You can replay this tour anytime from your Settings or Account menu. Enjoy your streamlined workflow!",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />
    });

    return baseSteps;
  };

  const steps = getSteps();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-[#111827] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                {steps[currentStep].icon}
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Product Tour
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 min-h-[200px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400 mb-3">
                  {steps[currentStep].title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {steps[currentStep].content}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-6 bg-emerald-500"
                      : "w-2 bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="size-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
