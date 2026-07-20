"use client";

export default function PendingSetup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Pending Setup</h1>
        <p className="text-slate-600 mb-6 max-w-sm">
          Your account has been created, but your role's dashboard is still being configured. Please contact your administrator.
        </p>
        <a 
          href="/login" 
          onClick={(e) => {
            // Need client-side to properly sign out
            e.preventDefault();
            window.location.href = '/login';
          }}
          className="text-[#10B981] hover:underline font-semibold"
        >
          Return to Login
        </a>
      </div>
    </div>
  );
}
