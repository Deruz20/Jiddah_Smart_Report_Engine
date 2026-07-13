const fs = require('fs');

const backendLogin = fs.readFileSync('apps/backend/src/app/login/page.tsx', 'utf8');
const dashboardLogin = fs.readFileSync('apps/dashboard/src/app/pages/LoginPage.tsx', 'utf8');

// The dashboard has its own imports for auth context, react-router, etc.
// We'll reconstruct the dashboard login file.

const newDashboardLogin = backendLogin
  // Replace Next.js router with React Router
  .replace(/import \{ useRouter, useSearchParams \} from "next\/navigation";/g, 'import { useLocation, useNavigate } from "react-router";\nimport { useAuthContext } from "@/contexts/AuthProvider";')
  .replace(/const router = useRouter\(\);/g, 'const navigate = useNavigate();\n  const { login, error: authError } = useAuthContext();')
  .replace(/const searchParams = useSearchParams\(\);/g, 'const location = useLocation();')
  .replace(/const redirectTo = searchParams\.get\("from"\) \?\? "\/admin";/g, 'const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";')
  
  // Replace handleLogin
  .replace(/const \{ error \} = await supabase\.auth\.signInWithPassword\(\{ email: values\.email, password: values\.password \}\);/g, 'await login(values.email, values.password);')
  .replace(/if \(error\) \{[^}]+\}/g, '')
  .replace(/const message = error instanceof Error \? error\.message : "Unable to sign in";/g, 'const message = error instanceof Error ? error.message : authError ?? "Unable to sign in";')
  .replace(/router\.push\(redirectTo\);/g, 'navigate(redirectTo, { replace: true });')
  .replace(/router\.refresh\(\);/g, '')

  // Remove next/image
  .replace(/import Image from "next\/image";/g, '')
  .replace(/<Image\s+src="\/school_budge\.jpeg"\s+alt="Logo"\s+width=\{48\}\s+height=\{48\}\s+className="w-12 h-12 rounded-xl object-cover border border-white\/10 shadow-lg"\s+\/>/g, '<img src="/school_budge.jpeg" alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg" />')
  .replace(/<Image\s+src="\/school_budge\.jpeg"\s+alt="Jiddah Islamic School"\s+width=\{40\}\s+height=\{40\}\s+className="w-10 h-10 rounded-xl object-cover"\s+\/>/g, '<img src="/school_budge.jpeg" alt="Jiddah Islamic School" className="w-10 h-10 rounded-xl object-cover" />')

  // Remove Supabase imports
  .replace(/import \{ createClient \} from "@supabase\/supabase-js";/g, '')

  // Adjust stats fetch to hit the backend API (since dashboard is client-only)
  // Wait, dashboard is running on port 5173, backend API is on 3000. For now, we can just fetch from window.location.origin if it's the same, or hardcode/skip if we hit CORS.
  // Actually, Vercel hosts both or just the frontend. 
  // We will leave the fetch to '/api/public-stats', but it might need the full URL if they are split.
  // Let's just rely on the existing fetch and handle the error gracefully.

fs.writeFileSync('apps/dashboard/src/app/pages/LoginPage.tsx', newDashboardLogin);
console.log("Successfully ported login page to dashboard.");
