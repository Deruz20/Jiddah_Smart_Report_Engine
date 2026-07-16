import { RemarksClient } from "@/components/layout/remarks-client";

export const metadata = {
  title: "Smart Grading Remarks - Jiddah Engine",
};

export default function RemarksPage() {
  return (
    <div className="p-6 md:p-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Grading Remarks</h1>
        <p className="text-slate-500 mt-2">Configure the standard remarks that will auto-generate based on student scores on report cards.</p>
      </div>

      <RemarksClient />
    </div>
  );
}
