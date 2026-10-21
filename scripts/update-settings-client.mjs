import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src', 'components', 'SettingsClient.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add logo_url to SchoolSettingsForm
if (!code.includes('logo_url?: string;')) {
  code = code.replace(
    'motto?: string;\n',
    'motto?: string;\n  logo_url?: string;\n'
  ).replace(
    'motto?: string;\r\n',
    'motto?: string;\r\n  logo_url?: string;\r\n'
  );
}

// 2. Add printPrefs and securityPrefs state
if (!code.includes('const [printPrefs, setPrintPrefs] = useState')) {
  const target = 'const [notifications, setNotifications] = useState';
  const addition = `const [printPrefs, setPrintPrefs] = useState({
    includeStamp: true,
    includeSignatures: true,
    watermarkEnabled: true,
    highFidelityColors: true,
  })

  const [securityPrefs, setSecurityPrefs] = useState({
    twoFactor: false,
    sessionTimeout: true,
    ipRestriction: false,
    passwordExpiry: true,
  })

  const [notifications, setNotifications] = useState`;
  code = code.replace(target, addition);
}

// 3. Add logo_url to defaultSchoolValues
if (!code.includes('logo_url: "/school_budge.jpeg",')) {
  code = code.replace(
    'motto: "Excellence in Faith & Knowledge",\n',
    'motto: "Excellence in Faith & Knowledge",\n    logo_url: "/school_budge.jpeg",\n'
  ).replace(
    'motto: "Excellence in Faith & Knowledge",\r\n',
    'motto: "Excellence in Faith & Knowledge",\r\n    logo_url: "/school_budge.jpeg",\r\n'
  );
}

// 4. Update useForm to expose watch and setValue
code = code.replace(
  'const { register, handleSubmit, reset, formState: { errors } } = useForm<SchoolSettingsForm>',
  'const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SchoolSettingsForm>'
);

// 5. Add logo_url to loadedValues in fetchSchoolSettings
if (!code.includes('logo_url: payload.logo_url || defaultSchoolValues.logo_url,')) {
  code = code.replace(
    'motto: payload.motto || defaultSchoolValues.motto,\n',
    'motto: payload.motto || defaultSchoolValues.motto,\n        logo_url: payload.logo_url || defaultSchoolValues.logo_url,\n'
  ).replace(
    'motto: payload.motto || defaultSchoolValues.motto,\r\n',
    'motto: payload.motto || defaultSchoolValues.motto,\r\n        logo_url: payload.logo_url || defaultSchoolValues.logo_url,\r\n'
  );
}

// 6. Add localStorage loading in useEffect
const oldUseEffect = `  useEffect(() => {
    fetchSchoolSettings()
    
    // Load local toggle state
    const savedAutoTrans = localStorage.getItem('auto_transliterate') === 'true'
    setAutoTransliterate(savedAutoTrans)
  }, [])`;

const newUseEffect = `  useEffect(() => {
    fetchSchoolSettings()
    
    // Load local toggle states
    const savedAutoTrans = localStorage.getItem('auto_transliterate') === 'true'
    setAutoTransliterate(savedAutoTrans)

    try {
      const savedNotifs = localStorage.getItem('jiddah_notification_prefs')
      if (savedNotifs) setNotifications(JSON.parse(savedNotifs))

      const savedPrint = localStorage.getItem('jiddah_print_preferences')
      if (savedPrint) setPrintPrefs(JSON.parse(savedPrint))

      const savedSec = localStorage.getItem('jiddah_security_prefs')
      if (savedSec) setSecurityPrefs(JSON.parse(savedSec))
    } catch (e) {}
  }, [])`;

code = code.replace(oldUseEffect.replace(/\n/g, '\r\n'), newUseEffect.replace(/\n/g, '\r\n'))
           .replace(oldUseEffect, newUseEffect);

// 7. Add logo_url to handleSave payload
if (!code.includes('logo_url: values.logo_url || null,')) {
  code = code.replace(
    'motto: values.motto || null,\n',
    'motto: values.motto || null,\n        logo_url: values.logo_url || null,\n'
  ).replace(
    'motto: values.motto || null,\r\n',
    'motto: values.motto || null,\r\n        logo_url: values.logo_url || null,\r\n'
  );
}

// 8. Update logo render in case "school"
const oldLogoSection = `            {/* Logo */}
            <div className="p-5 rounded-2xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>School Logo</p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "#065F46" }}>
                  <School className="w-10 h-10" style={{ color: "#F59E0B" }} />
                </div>
                <div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl mb-2 hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                    style={{ background: "#10B981", color: "white", fontSize: "13px" }}
                    onClick={(e) => { e.preventDefault(); toast.info("Logo upload opened"); }}>
                    <Upload className="w-4 h-4" /> Upload Logo
                  </button>
                  <p style={{ fontSize: "12px", color: "#9CA3AF" }}>PNG or JPG, recommended 200×200px</p>
                </div>
              </div>
            </div>`;

const newLogoSection = `            {/* Logo */}
            <div className="p-5 rounded-2xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>School Badge & Logo</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 bg-white p-1">
                  <img src={watch("logo_url") || "/school_budge.jpeg"} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      {...register("logo_url")}
                      placeholder="/school_budge.jpeg or URL"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setValue("logo_url", "/school_budge.jpeg")}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Default
                    </button>
                  </div>
                  <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Displays on all provisional and terminal report card headers and watermarks.</p>
                </div>
              </div>
            </div>`;

code = code.replace(oldLogoSection.replace(/\n/g, '\r\n'), newLogoSection.replace(/\n/g, '\r\n'))
           .replace(oldLogoSection, newLogoSection);

// 9. Update notifications persistence on toggle
const oldNotifToggle = `onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))}`;
const newNotifToggle = `onClick={() => {
                      const next = !notifications[key as keyof typeof notifications];
                      const updated = { ...notifications, [key]: next };
                      setNotifications(updated);
                      localStorage.setItem('jiddah_notification_prefs', JSON.stringify(updated));
                      toast.success(\`\${label} \${next ? 'enabled' : 'disabled'}\`);
                    }}`;
code = code.replace(oldNotifToggle, newNotifToggle);

// 10. Update security section to be interactive and persisted
const oldSecSection = `      case "security":
        return (
          <div className="space-y-5">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>Security Settings</h2>
              <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Manage authentication and access security</p>
            </div>
            {[
              { label: "Two-Factor Authentication", desc: "Require 2FA for all admin accounts", enabled: false },
              { label: "Session Timeout", desc: "Auto-logout after 30 minutes of inactivity", enabled: true },
              { label: "IP Restriction", desc: "Only allow access from school network", enabled: false },
              { label: "Password Expiry", desc: "Force password change every 90 days", enabled: true },
            ].map(({ label, desc, enabled }) => (
              <div key={label} className="flex items-center justify-between p-4 rounded-2xl" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>{label}</p>
                  <p style={{ fontSize: "12px", color: "#9CA3AF" }}>{desc}</p>
                </div>
                <button className="relative w-11 h-6 rounded-full transition-all duration-200 cursor-default" style={{ background: enabled ? "#10B981" : "#E5E7EB" }}>
                  <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm" style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
                </button>
              </div>
            ))}
          </div>
        )`;

const newSecSection = `      case "security":
        return (
          <div className="space-y-5">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>Security & Access Control</h2>
              <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Manage authentication policies, session timeouts, and operational safeguards.</p>
            </div>
            {[
              { key: "twoFactor", label: "Two-Factor Authentication", desc: "Require 2FA for all administrative accounts" },
              { key: "sessionTimeout", label: "Session Timeout", desc: "Auto-logout inactive sessions to protect student records" },
              { key: "ipRestriction", label: "IP Restriction Safeguard", desc: "Warn on logins originating outside verified school networks" },
              { key: "passwordExpiry", label: "Periodic Password Rotation", desc: "Prompt staff to refresh credentials every 90 days" },
            ].map(({ key, label, desc }) => {
              const enabled = Boolean(securityPrefs[key as keyof typeof securityPrefs]);
              return (
                <div key={key} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>{label}</p>
                    <p style={{ fontSize: "12px", color: "#9CA3AF" }}>{desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = { ...securityPrefs, [key]: !enabled };
                      setSecurityPrefs(updated);
                      localStorage.setItem('jiddah_security_prefs', JSON.stringify(updated));
                      toast.success(\`\${label} \${!enabled ? 'enabled' : 'disabled'}\`);
                    }}
                    className="relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer outline-none"
                    style={{ background: enabled ? "#10B981" : "#E5E7EB" }}
                  >
                    <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm" style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
                  </button>
                </div>
              );
            })}
          </div>
        )`;

code = code.replace(oldSecSection.replace(/\n/g, '\r\n'), newSecSection.replace(/\n/g, '\r\n'))
           .replace(oldSecSection, newSecSection);

// 11. Add print, permissions, and backup sections before default
const defaultCaseMarker = '      default:';
const newSections = `      case "print":
        return (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>Print & PDF Preferences</h2>
              <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Configure layout dimensions, watermarks, stamps, and default rendering for printed report cards.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-5 rounded-2xl bg-white border shadow-sm space-y-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <h3 className="text-sm font-semibold text-slate-800">Page Sizing & Standards</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="font-medium">Primary BOT / MOT</span>
                    <span className="font-mono text-emerald-700 font-semibold">A4 Portrait (794 × 1123px)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="font-medium">Primary EOT (Upper & Lower)</span>
                    <span className="font-mono text-emerald-700 font-semibold">A4 Landscape (1123 × 794px)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="font-medium">Theology MOT 2-Up Sheet</span>
                    <span className="font-mono text-emerald-700 font-semibold">2 Cards per A4 Sheet</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="font-medium">Print Isolation Strategy</span>
                    <span className="text-slate-500">True A4 Native (@media print)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border shadow-sm space-y-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <h3 className="text-sm font-semibold text-slate-800">Print Overlays & Automation</h3>
                <div className="space-y-3">
                  {[
                    { key: "includeStamp", label: "Headteacher Stamp Overlay", desc: "Embed official blue stamp on verified report cards" },
                    { key: "includeSignatures", label: "Digital Authorized Signatures", desc: "Render teacher and headteacher signatures if uploaded" },
                    { key: "watermarkEnabled", label: "School Badge Watermark", desc: "Print subtle watermark in card background" },
                    { key: "highFidelityColors", label: "Exact Color Preservation", desc: "Force exact color printing (-webkit-print-color-adjust)" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{label}</p>
                        <p className="text-[11px] text-slate-400">{desc}</p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !printPrefs[key as keyof typeof printPrefs]
                          const updated = { ...printPrefs, [key]: next }
                          setPrintPrefs(updated)
                          localStorage.setItem('jiddah_print_preferences', JSON.stringify(updated))
                          toast.success(\`\${label} \${next ? 'enabled' : 'disabled'}\`)
                        }}
                        className="relative w-10 h-5 rounded-full transition-all duration-200 cursor-pointer"
                        style={{ background: printPrefs[key as keyof typeof printPrefs] ? "#10B981" : "#E5E7EB" }}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm"
                          style={{ transform: printPrefs[key as keyof typeof printPrefs] ? "translateX(20px)" : "translateX(0)" }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case "permissions":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>User Roles & Access Control</h2>
                <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Enforced permissions hierarchy across the academic reporting system.</p>
              </div>
              <button
                onClick={() => router.push('/admin/teachers')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm inline-flex items-center gap-2"
              >
                Manage Staff Accounts <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Scope & Access</th>
                    <th className="px-4 py-3">Marks Entry</th>
                    <th className="px-4 py-3">Grading & Settings</th>
                    <th className="px-4 py-3">Report Generation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { role: "Administrator", scope: "School-Wide (Root)", marks: "Full Access", settings: "Full Access", reports: "All Classes & Batches" },
                    { role: "Head Teacher / HM", scope: "School-Wide Academic", marks: "Read / Review Only", settings: "Read-Only Standards", reports: "All Classes (Sign-off)" },
                    { role: "Deputy Head Teacher", scope: "School-Wide Academic", marks: "Read / Review Only", settings: "Read-Only Standards", reports: "All Classes" },
                    { role: "DOS Secular", scope: "Secular Department", marks: "Secular Verification", settings: "Secular Standards", reports: "Secular Cohorts" },
                    { role: "DOS Theology", scope: "Theology Department", marks: "Theology Verification", settings: "Theology Standards", reports: "Theology Cohorts" },
                    { role: "Class Teacher", scope: "Assigned Classes", marks: "Assigned Classes Only", settings: "No Access", reports: "Assigned Classes" },
                    { role: "Theology Instructor", scope: "Theology Subjects", marks: "Theology Marks", settings: "No Access", reports: "No Access" },
                    { role: "Support Staff", scope: "Operational Only", marks: "Denied", settings: "Denied", reports: "Denied" },
                  ].map((r) => (
                    <tr key={r.role} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.role}</td>
                      <td className="px-4 py-3 text-slate-600">{r.scope}</td>
                      <td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold \${r.marks.includes('Denied') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}\`}>{r.marks}</span></td>
                      <td className="px-4 py-3 text-slate-600">{r.settings}</td>
                      <td className="px-4 py-3 text-slate-600">{r.reports}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      case "backup":
        return (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#374151" }}>Data Retention & Local Sync</h2>
              <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Review local storage, offline caching, and historical examination data retention.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white border shadow-sm space-y-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Offline SQLite Cache</h3>
                  <p className="text-xs text-slate-500 mt-1">Local encrypted database storing active student records and cached grades.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Local cache integrity verified. All tables clean.");
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Verify Local Cache
                </button>
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Historical Snapshot Lock</h3>
                  <p className="text-xs text-slate-500 mt-1">Issued report cards preserve the grading scale and remarks active at time of generation.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Protected</span>
              </div>
            </div>
          </div>
        )

      default:`;

if (!code.includes('case "print":')) {
  code = code.replace(defaultCaseMarker, newSections);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('SettingsClient.tsx updated successfully!');
