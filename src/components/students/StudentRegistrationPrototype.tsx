'use client';

import React, { useState, useMemo } from 'react';
import {
  User,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Phone,
  Home,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Award,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface SiblingRecord {
  name: string;
  class_name: string;
  admission_number: string;
  guardian_name: string;
  guardian_phone: string;
  residence_address: string;
}

const MOCK_EXISTING_SIBLINGS: Record<string, SiblingRecord> = {
  '+256752123456': {
    name: 'Amina Nakato',
    class_name: 'P.4 Blue',
    admission_number: 'JIS/2024/0512',
    guardian_name: 'Al-Hajj Sulaiman Ssemakula',
    guardian_phone: '+256752123456',
    residence_address: 'Nsaggu Village, Nakawuka Road, Wakiso',
  },
  '0752123456': {
    name: 'Amina Nakato',
    class_name: 'P.4 Blue',
    admission_number: 'JIS/2024/0512',
    guardian_name: 'Al-Hajj Sulaiman Ssemakula',
    guardian_phone: '+256752123456',
    residence_address: 'Nsaggu Village, Nakawuka Road, Wakiso',
  },
};

export function StudentRegistrationPrototype() {
  const [step, setStep] = useState<number>(1);
  const [isSimulatedSubmitted, setIsSimulatedSubmitted] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Core Identity
    firstName: 'Farouk',
    lastName: 'Ssemakula',
    otherNames: '',
    arabicName: 'فاروق سماكولا',
    gender: 'Male',
    religion: 'Muslim',
    dob: '2017-04-15',
    admissionNumber: 'JIS/2026/0142',
    // Step 2: Guardian & Sibling
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'Father',
    guardianEmail: '',
    residenceAddress: '',
    linkedSiblingId: null as string | null,
    // Step 3: Dual-Curriculum
    secularSection: 'Upper Primary',
    secularClass: 'P.4',
    secularStream: 'Blue',
    theologyEnrolled: true,
    theologyClass: 'الفصل الثالث (Level 3)',
    // Step 4: Status Lifecycle
    lifecycleStatus: 'active',
  });

  // Auto-calculated age and suggested class from DOB
  const ageCalculation = useMemo(() => {
    if (!formData.dob) return null;
    const birthDate = new Date(formData.dob);
    const today = new Date('2026-05-01'); // Fixed relative to term 1 2026
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }

    let suggestedClass = 'Primary 1';
    if (years <= 3) suggestedClass = 'Baby Class';
    else if (years === 4) suggestedClass = 'Middle Class';
    else if (years === 5) suggestedClass = 'Top Class';
    else if (years === 6) suggestedClass = 'Primary 1 (P.1)';
    else if (years === 7) suggestedClass = 'Primary 2 (P.2)';
    else if (years === 8) suggestedClass = 'Primary 3 (P.3)';
    else if (years === 9) suggestedClass = 'Primary 4 (P.4)';
    else if (years === 10) suggestedClass = 'Primary 5 (P.5)';
    else if (years === 11) suggestedClass = 'Primary 6 (P.6)';
    else if (years >= 12) suggestedClass = 'Primary 7 (P.7 PLE)';

    return { years, months, suggestedClass };
  }, [formData.dob]);

  // Sibling auto-detection
  const detectedSibling = useMemo(() => {
    const cleanPhone = formData.guardianPhone.replace(/\s+/g, '');
    return MOCK_EXISTING_SIBLINGS[cleanPhone] || null;
  }, [formData.guardianPhone]);

  const handleLinkSibling = () => {
    if (detectedSibling) {
      setFormData((prev) => ({
        ...prev,
        guardianName: detectedSibling.guardian_name,
        residenceAddress: detectedSibling.residence_address,
        linkedSiblingId: detectedSibling.admission_number,
      }));
      toast.success(`Linked family record with sibling ${detectedSibling.name}!`);
    }
  };

  const handleSimulateSubmit = () => {
    setIsSimulatedSubmitted(true);
    toast.success('Simulation: Student registered with dual-curriculum enrollment & guardian profile!');
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-stone-200 shadow-xl rounded-2xl p-6 relative overflow-hidden flex flex-col h-full text-stone-800">
      {/* Top Banner: Prototype Badge */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h3 className="text-base font-bold text-stone-900">Student Registration Overhaul (V2 Prototype)</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Clickable Prototype
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Unified Core Profile + Dual-Curriculum Enrollment + Sibling Detection + True Lifecycle.
          </p>
        </div>

        {!isSimulatedSubmitted && (
          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Step {step} of 4
          </div>
        )}
      </div>

      {/* Stepper Tabs */}
      {!isSimulatedSubmitted && (
        <div className="grid grid-cols-4 gap-2 mb-6 text-xs font-semibold">
          {[
            { s: 1, label: '1. Core Identity' },
            { s: 2, label: '2. Guardian & Sibling' },
            { s: 3, label: '3. Dual Curriculum' },
            { s: 4, label: '4. Status & Review' },
          ].map(({ s, label }) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`py-2 px-3 rounded-xl border text-center transition ${
                step === s
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                  : step > s
                  ? 'border-stone-200 bg-stone-50 text-stone-700'
                  : 'border-stone-200 text-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Main Step Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isSimulatedSubmitted ? (
          <div className="p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Registration Complete (Simulation)</h4>
            <p className="text-xs text-stone-600">
              Student <strong>{formData.firstName} {formData.lastName}</strong> ({formData.arabicName}) successfully enrolled.
            </p>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs space-y-1.5 font-mono">
              <div>• Admission No: <strong>{formData.admissionNumber}</strong></div>
              <div>• Secular Enrollment: <strong>{formData.secularClass} ({formData.secularStream})</strong></div>
              <div>• Theology Enrollment: <strong>{formData.theologyClass}</strong></div>
              <div>• Guardian: <strong>{formData.guardianName || 'Al-Hajj Sulaiman Ssemakula'}</strong></div>
              <div>• Lifecycle Status: <strong>{formData.lifecycleStatus.toUpperCase()}</strong></div>
            </div>
            <button
              onClick={() => {
                setIsSimulatedSubmitted(false);
                setStep(1);
              }}
              className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
            >
              Reset Simulation
            </button>
          </div>
        ) : step === 1 ? (
          /* ─── STEP 1: Core Identity & Auto-Calculations ─── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 px-3 py-2 text-stone-800 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Last Name / Surname *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 px-3 py-2 text-stone-800 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Arabic Name (RTL) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Arabic Name (الاسم باللغة العربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.arabicName}
                onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                className="w-full text-xs rounded-xl border border-stone-200 px-3 py-2 text-right font-arabic outline-none focus:border-emerald-600"
              />
            </div>

            {/* Gender & Religion */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Male', 'Female'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        formData.gender === g
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Religion</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Muslim', 'Non-Muslim'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          religion: r,
                          theologyEnrolled: r === 'Muslim',
                        })
                      }
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        formData.religion === r
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date of Birth & Live Age Engine */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <label className="block text-xs font-semibold text-stone-700">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full text-xs rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:border-emerald-600"
              />
              {ageCalculation && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200 text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Calculated Age: <strong>{ageCalculation.years} yrs, {ageCalculation.months} mos</strong></span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Suggested: {ageCalculation.suggestedClass}
                  </span>
                </div>
              )}
            </div>

            {/* Admission Number */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Deterministic Admission Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.admissionNumber}
                  readOnly
                  className="w-full text-xs font-mono font-bold bg-stone-100 rounded-xl border border-stone-200 px-3 py-2 text-stone-800"
                />
                <span className="text-[10px] text-stone-400 whitespace-nowrap">Sequential format</span>
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          /* ─── STEP 2: Guardian & Sibling Auto-Detection ─── */
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Guardian Phone Number * (Type +256 752 123456 to test sibling detection)
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, guardianPhone: '+256 752 123456' })}
                  className="text-[10px] text-emerald-700 underline font-semibold"
                >
                  Fill Sample Phone
                </button>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="+256 7XX XXXXXX"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 pl-9 pr-3 py-2 text-stone-800 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Sibling Detection Alert */}
            {detectedSibling && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span>Existing Enrolled Sibling Detected!</span>
                </div>
                <p className="text-amber-800 text-[11px]">
                  Phone matches registered family record for <strong>{detectedSibling.name}</strong> ({detectedSibling.class_name}, {detectedSibling.admission_number}).
                </p>
                <button
                  type="button"
                  onClick={handleLinkSibling}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Family & Auto-Fill Details</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Guardian Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Al-Hajj Sulaiman Ssemakula"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 px-3 py-2 text-stone-800 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Relationship</label>
                <select
                  value={formData.guardianRelationship}
                  onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Residential Address / Village</label>
              <div className="relative">
                <Home className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Nsaggu Village, Nakawuka Road, Wakiso"
                  value={formData.residenceAddress}
                  onChange={(e) => setFormData({ ...formData, residenceAddress: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 pl-9 pr-3 py-2 text-stone-800 outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        ) : step === 3 ? (
          /* ─── STEP 3: Dual-Curriculum Enrollment ─── */
          <div className="space-y-5">
            {/* Secular Department */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                  1. Secular Department Enrollment (UNEB)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Class Level</label>
                  <select
                    value={formData.secularClass}
                    onChange={(e) => setFormData({ ...formData, secularClass: e.target.value })}
                    className="w-full text-xs rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 outline-none"
                  >
                    <option value="P.1">Primary 1 (P.1)</option>
                    <option value="P.2">Primary 2 (P.2)</option>
                    <option value="P.3">Primary 3 (P.3)</option>
                    <option value="P.4">Primary 4 (P.4)</option>
                    <option value="P.5">Primary 5 (P.5)</option>
                    <option value="P.6">Primary 6 (P.6)</option>
                    <option value="P.7">Primary 7 (P.7 PLE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Stream / Cohort</label>
                  <select
                    value={formData.secularStream}
                    onChange={(e) => setFormData({ ...formData, secularStream: e.target.value })}
                    className="w-full text-xs rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 outline-none"
                  >
                    <option value="Blue">Blue (Stream A)</option>
                    <option value="Red">Red (Stream B)</option>
                    <option value="Green">Green (Stream C)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Theology Department */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    2. Theology Department Enrollment (Arabic IPLE)
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.theologyEnrolled}
                    onChange={(e) => setFormData({ ...formData, theologyEnrolled: e.target.checked })}
                    className="rounded border-emerald-300 text-emerald-700"
                  />
                  <span>Enrolled</span>
                </label>
              </div>

              {formData.theologyEnrolled ? (
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Arabic Theology Class (Independent Placement)
                  </label>
                  <select
                    dir="rtl"
                    value={formData.theologyClass}
                    onChange={(e) => setFormData({ ...formData, theologyClass: e.target.value })}
                    className="w-full text-xs rounded-xl border border-emerald-200 bg-white px-3 py-2 text-stone-800 font-arabic text-right outline-none"
                  >
                    <option value="الصف الأول (Level 1)">الصف الأول (Primary Level 1)</option>
                    <option value="الصف الثاني (Level 2)">الصف الثاني (Primary Level 2)</option>
                    <option value="الفصل الثالث (Level 3)">الفصل الثالث (Primary Level 3)</option>
                    <option value="الصف الرابع (Level 4)">الصف الرابع (Primary Level 4)</option>
                    <option value="الصف الخامس (Level 5)">الصف الخامس (Primary Level 5)</option>
                  </select>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Notice: Theology class level is decoupled from secular class level to match student Arabic proficiency.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-stone-500 italic">
                  Student is marked exempt from Arabic theology subjects (Non-Muslim / Secular Only).
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── STEP 4: Status Lifecycle & Review ─── */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Student Enrollment Lifecycle Status
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'active', label: 'Active', desc: 'Currently attending' },
                  { id: 'transferred', label: 'Transferred', desc: 'Moved school' },
                  { id: 'withdrawn', label: 'Withdrawn', desc: 'Left school' },
                  { id: 'graduated', label: 'Graduated', desc: 'Completed P.7' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, lifecycleStatus: s.id })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      formData.lifecycleStatus === s.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-600'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Review Card */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="font-bold text-stone-800 border-b border-stone-200 pb-1 flex items-center justify-between">
                <span>Summary Registration Card</span>
                <span className="font-mono text-emerald-700">{formData.admissionNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Full Name: <strong>{formData.firstName} {formData.lastName}</strong></div>
                <div>Arabic Name: <strong className="font-arabic">{formData.arabicName}</strong></div>
                <div>DOB / Age: <strong>{formData.dob} ({ageCalculation?.years}y {ageCalculation?.months}m)</strong></div>
                <div>Gender: <strong>{formData.gender}</strong></div>
                <div>Secular Class: <strong>{formData.secularClass} ({formData.secularStream})</strong></div>
                <div>Theology Class: <strong>{formData.theologyEnrolled ? formData.theologyClass : 'Exempt'}</strong></div>
                <div>Guardian: <strong>{formData.guardianName || 'Al-Hajj Sulaiman Ssemakula'}</strong></div>
                <div>Phone: <strong>{formData.guardianPhone || '+256 752 123456'}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Navigation */}
      {!isSimulatedSubmitted && (
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 mt-4">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition flex items-center gap-1 shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSimulateSubmit}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Simulate Student Registration</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
