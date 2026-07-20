import { Metadata } from "next";
import RegisterClient from "./register-client";

export const metadata: Metadata = {
  title: "Teacher Registration | Jiddah Smart Report Engine",
  description: "Register your teacher account",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center sm:justify-center pt-8 pb-8 px-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-[#10B981] p-6 text-center text-white">
          <h1 className="text-2xl font-bold">Welcome to Jiddah</h1>
          <p className="mt-2 text-emerald-100">Complete your teacher registration</p>
        </div>
        <div className="p-8">
          <RegisterClient />
        </div>
      </div>
    </div>
  );
}
