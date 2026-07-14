"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedButton } from "@/components/AnimatedButton";

export default function RegisterClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    phone: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/teachers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          phone: formData.phone
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to register.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <p className="text-emerald-600 font-semibold mb-4">Registration successful!</p>
        <p className="text-slate-600">Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm border border-rose-100">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address *</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
          placeholder="your.email@jiddah.edu"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Phone Number (Optional)</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
          placeholder="+256..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Password * (min. 8 characters)</label>
        <input
          type="password"
          required
          minLength={8}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password *</label>
        <input
          type="password"
          required
          minLength={8}
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#10B981]"
          placeholder="••••••••"
        />
      </div>

      <div className="pt-4">
        <AnimatedButton
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#10B981] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
        >
          {loading ? "Registering..." : "Complete Registration"}
        </AnimatedButton>
      </div>
    </form>
  );
}
