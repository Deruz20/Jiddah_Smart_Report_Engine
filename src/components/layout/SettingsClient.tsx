"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Switch from "@radix-ui/react-switch";
import { toast } from "sonner";
import {
  Building2,
  CalendarRange,
  Award,
  Stamp,
  Printer,
  ShieldCheck,
  UserCheck,
  Search,
  X,
  Check,
  RefreshCw,
  Upload,
  RotateCcw,
  Lock,
  Unlock,
  AlertCircle,
  ExternalLink,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import {
  DEFAULT_GRADING_SCALE,
  DEFAULT_THEOLOGY_GRADING_SCALE,
  DEFAULT_THEOLOGY_REMARKS,
  DEFAULT_DIVISION_BOUNDARIES,
  DEFAULT_THEOLOGY_DIVISION_BOUNDARIES,
  DEFAULT_PROMOTION_COMMENTS,
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_MARKS_LOCKS,
  DEFAULT_PRINT_PREFERENCES,
  normalizeSchoolLogoUrl,
  validateGradingBands,
  validateDivisionBoundaries,
  type GradingBandItem,
  type TheologyRemarkItem,
  type DivisionBoundaryItem,
  type TheologyDivisionBoundaryItem,
  type PromotionCommentsConfig,
  type FeeStructureConfig,
  type MarksLocksConfig,
  type PrintPreferencesConfig,
  type MergedSchoolSettings,
} from "@/lib/school-settings-helper";
import { invalidateClientCache } from "@/lib/client-cache";
import { broadcastGlobalSchoolSettingsUpdate } from "@/lib/studio-config-store";
import { getLiveStampDateString } from "@/lib/stamp-date";
import { ConfirmDestructiveDialog } from "@/components/ConfirmDestructiveDialog";
import TermsClient, { type AcademicTerm } from "@/components/layout/terms-client";
import SignaturesClient, { type SignatureSlot } from "@/components/layout/signatures-client";
import AccountClient, { type UserProfileData } from "@/components/layout/account-client";

export type SettingsCategoryKey =
  | "identity"
  | "secular_grading"
  | "theology_grading"
  | "comments"
  | "locks"
  | "terms"
  | "grading"
  | "signatures"
  | "print"
  | "account";

interface CategoryDef {
  id: SettingsCategoryKey;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  keywords: string[];
}

const SETTINGS_CATEGORIES: CategoryDef[] = [
  {
    id: "identity",
    label: "School Identity & Print Defaults",
    shortLabel: "Identity & Print",
    subtitle: "School Name, Motto, Active Term & Global Print/Stamp Defaults",
    icon: Building2,
    keywords: [
      "school",
      "identity",
      "profile",
      "name",
      "arabic",
      "motto",
      "registration",
      "center",
      "box",
      "address",
      "phone",
      "email",
      "website",
      "logo",
      "crest",
      "academic",
      "term",
      "terms",
      "calendar",
      "active term",
      "next term",
      "begins",
      "end date",
      "fees",
      "fee structure",
      "tuition",
      "boarding",
      "nursery",
      "primary",
      "stamp",
      "stamp date",
      "headteacher",
      "signature",
      "print defaults",
    ],
  },
  {
    id: "secular_grading",
    label: "Secular Grading (PLE)",
    shortLabel: "Secular (PLE)",
    subtitle: "D1–F9 score scale & 4–36 PLE aggregate divisions",
    icon: Award,
    keywords: [
      "secular",
      "ple",
      "grading",
      "grade",
      "scale",
      "d1",
      "d2",
      "c3",
      "f9",
      "division",
      "aggregate",
      "boundaries",
      "uneb",
    ],
  },
  {
    id: "theology_grading",
    label: "Theology Grading (IPLE)",
    shortLabel: "Theology (IPLE)",
    subtitle: "1–9 point weights & 4–36 IPLE Arabic divisions",
    icon: Sliders,
    keywords: [
      "theology",
      "iple",
      "arabic",
      "mamtaz",
      "ممتاز",
      "جيد",
      "راسب",
      "division",
      "aggregate",
      "boundaries",
    ],
  },
  {
    id: "comments",
    label: "Remarks Engine",
    shortLabel: "Remarks Engine",
    subtitle: "Grading & Remarks Engine — Teacher, Headteacher & Promotion templates",
    icon: CalendarRange,
    keywords: [
      "grading & remarks engine",
      "comments",
      "conduct",
      "remarks",
      "promotion",
      "probation",
      "repeat",
      "headteacher",
      "class teacher",
      "boys",
      "girls",
    ],
  },
  {
    id: "locks",
    label: "Exam Locks & Access Safeguards",
    shortLabel: "Locks & Safeguards",
    subtitle: "BOT/MOT/EOT exam locks, print layout, signatures & account security",
    icon: ShieldCheck,
    keywords: [
      "marks",
      "lock",
      "locks",
      "freeze",
      "access",
      "bot",
      "mot",
      "eot",
      "exam set",
      "security",
      "override",
      "stamp",
      "stamps",
      "signature",
      "signatures",
      "report",
      "print",
      "layout",
      "watermark",
      "account",
      "password",
    ],
  },
];

function normalizeTermsInput(rawTerms: any[]): AcademicTerm[] {
  if (!Array.isArray(rawTerms)) return [];
  return rawTerms.map((t) => ({
    id: String(t.id || ""),
    label: String(t.name || t.label || `Term ${t.term_number || 1}`),
    term: String(t.name || t.term || t.label || `Term ${t.term_number || 1}`),
    academic_year: Number(t.academic_year || t.year || new Date().getFullYear()),
    year: Number(t.academic_year || t.year || new Date().getFullYear()),
    start_date: t.start_date || null,
    end_date: t.end_date || null,
    next_term_start: t.next_term_begins || t.next_term_start || null,
    is_current: Boolean(t.is_active ?? t.is_current),
  }));
}

export interface SettingsClientProps {
  terms?: any[];
  initialSettings?: Partial<MergedSchoolSettings>;
  initialSlots?: SignatureSlot[];
  initialProfile?: UserProfileData | null;
  userEmail?: string;
  initialCategory?: SettingsCategoryKey;
}

export default function SettingsClient({
  terms = [],
  initialSettings,
  initialSlots = [],
  initialProfile = null,
  userEmail = "",
  initialCategory = "identity",
}: SettingsClientProps) {
  const router = useRouter();
  const normalizeTabKey = (cat?: SettingsCategoryKey): SettingsCategoryKey => {
    if (!cat || cat === "terms") return "identity";
    if (cat === "grading") return "comments";
    if (cat === "signatures" || cat === "print" || cat === "account") return "locks";
    return cat;
  };
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryKey>(() =>
    normalizeTabKey(initialCategory)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(!initialSettings);

  // 1. School Identity State
  const [identity, setIdentity] = useState({
    school_name: initialSettings?.school_name || "Jiddah Islamic Nursery and Primary School",
    arabic_name: initialSettings?.arabic_name || "مدرسة جدة الإسلامية للحضانة والابتدائية",
    motto: initialSettings?.motto || "Strive for Life & Hereafter",
    registration_number: initialSettings?.registration_number || "",
    po_box: initialSettings?.po_box || "",
    address: initialSettings?.address || "Nakiwogo, Entebbe, Uganda",
    phone: initialSettings?.phone || "+256 700 000000",
    email: initialSettings?.email || "info@jiddahislamic.ac.ug",
    website_url: initialSettings?.website_url || "",
    logo_url: normalizeSchoolLogoUrl(initialSettings?.logo_url),
  });
  const [savedIdentity, setSavedIdentity] = useState(identity);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 2. Terms & Fee Structure State
  const normalizedTerms = useMemo(() => normalizeTermsInput(terms), [terms]);
  const [feeStructure, setFeeStructure] = useState<FeeStructureConfig>(
    initialSettings?.fee_structure || DEFAULT_FEE_STRUCTURE
  );

  // 3. Grading & Remarks State
  const [secularScale, setSecularScale] = useState<GradingBandItem[]>(
    initialSettings?.grading_scale || DEFAULT_GRADING_SCALE
  );
  const [savedSecularScale, setSavedSecularScale] = useState<GradingBandItem[]>(
    initialSettings?.grading_scale || DEFAULT_GRADING_SCALE
  );
  const [savingSecularScale, setSavingSecularScale] = useState(false);

  const [theologyScale, setTheologyScale] = useState<GradingBandItem[]>(
    initialSettings?.theology_grading_scale || DEFAULT_THEOLOGY_GRADING_SCALE
  );
  const [savedTheologyScale, setSavedTheologyScale] = useState<GradingBandItem[]>(
    initialSettings?.theology_grading_scale || DEFAULT_THEOLOGY_GRADING_SCALE
  );
  const [theologyRemarks, setTheologyRemarks] = useState<TheologyRemarkItem[]>(
    initialSettings?.theology_remarks || DEFAULT_THEOLOGY_REMARKS
  );
  const [savedTheologyRemarks, setSavedTheologyRemarks] = useState<TheologyRemarkItem[]>(
    initialSettings?.theology_remarks || DEFAULT_THEOLOGY_REMARKS
  );
  const [savingTheologyScale, setSavingTheologyScale] = useState(false);

  const [divisionBoundaries, setDivisionBoundaries] = useState<DivisionBoundaryItem[]>(
    initialSettings?.division_boundaries || DEFAULT_DIVISION_BOUNDARIES
  );
  const [savedDivisionBoundaries, setSavedDivisionBoundaries] = useState<DivisionBoundaryItem[]>(
    initialSettings?.division_boundaries || DEFAULT_DIVISION_BOUNDARIES
  );
  const [savingDivisionBoundaries, setSavingDivisionBoundaries] = useState(false);

  const [theologyDivisionBoundaries, setTheologyDivisionBoundaries] = useState<TheologyDivisionBoundaryItem[]>(
    (initialSettings as any)?.theology_division_boundaries || DEFAULT_THEOLOGY_DIVISION_BOUNDARIES
  );
  const [savedTheologyDivisionBoundaries, setSavedTheologyDivisionBoundaries] = useState<TheologyDivisionBoundaryItem[]>(
    (initialSettings as any)?.theology_division_boundaries || DEFAULT_THEOLOGY_DIVISION_BOUNDARIES
  );
  const [savingTheologyDivisionBoundaries, setSavingTheologyDivisionBoundaries] = useState(false);

  // 4. Term 3 Promotion & Conduct Remarks State
  const [promotionComments, setPromotionComments] = useState<PromotionCommentsConfig>(
    initialSettings?.promotion_comments || DEFAULT_PROMOTION_COMMENTS
  );
  const [savedPromotionComments, setSavedPromotionComments] = useState<PromotionCommentsConfig>(
    initialSettings?.promotion_comments || DEFAULT_PROMOTION_COMMENTS
  );
  const [savingPromotionComments, setSavingPromotionComments] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingDefaults, setResettingDefaults] = useState(false);

  // 5. Print Preferences & Global Print/Stamp Defaults State
  const initialPrintPrefs: PrintPreferencesConfig = {
    ...DEFAULT_PRINT_PREFERENCES,
    ...(initialSettings?.print_preferences || {}),
    stamp_date:
      (initialSettings as any)?.stamp_date ||
      initialSettings?.print_preferences?.stamp_date ||
      "",
    default_headteacher_name:
      initialSettings?.print_preferences?.default_headteacher_name || "",
    default_signature_url:
      initialSettings?.print_preferences?.default_signature_url || "",
  };
  const [printPrefs, setPrintPrefs] = useState<PrintPreferencesConfig>(initialPrintPrefs);
  const [savedPrintPrefs, setSavedPrintPrefs] = useState<PrintPreferencesConfig>(initialPrintPrefs);
  const [savingGlobalPrintDefaults, setSavingGlobalPrintDefaults] = useState(false);
  const [uploadingDefaultSig, setUploadingDefaultSig] = useState(false);
  const [savingPrintPrefKey, setSavingPrintPrefKey] = useState<string | null>(null);

  // 6. Marks Entry & Access Locks State (Optimistic Auto-Saving Switches)
  const [marksLocks, setMarksLocks] = useState<MarksLocksConfig>({
    ...DEFAULT_MARKS_LOCKS,
    ...(initialSettings?.marks_locks || {}),
  });
  const [savingLockKey, setSavingLockKey] = useState<string | null>(null);

  // Hydrate from /api/settings/school on mount so all fields are fresh
  useEffect(() => {
    const loadSchoolSettings = async () => {
      try {
        const res = await fetch("/api/settings/school", { cache: "no-store" });
        const payload = await res.json();
        if (res.ok && payload?.data) {
          const d: MergedSchoolSettings = payload.data;
          const nextIdentity = {
            school_name: d.school_name || "Jiddah Islamic Nursery and Primary School",
            arabic_name: d.arabic_name || "مدرسة جدة الإسلامية للحضانة والابتدائية",
            motto: d.motto || "Strive for Life & Hereafter",
            registration_number: d.registration_number || "",
            po_box: d.po_box || "",
            address: d.address || "",
            phone: d.phone || "",
            email: d.email || "",
            website_url: d.website_url || "",
            logo_url: normalizeSchoolLogoUrl(d.logo_url),
          };
          setIdentity(nextIdentity);
          setSavedIdentity(nextIdentity);

          if (d.fee_structure) setFeeStructure(d.fee_structure);
          if (Array.isArray(d.grading_scale) && d.grading_scale.length > 0) {
            setSecularScale(d.grading_scale);
            setSavedSecularScale(d.grading_scale);
          }
          if (Array.isArray(d.theology_grading_scale) && d.theology_grading_scale.length > 0) {
            setTheologyScale(d.theology_grading_scale);
            setSavedTheologyScale(d.theology_grading_scale);
          }
          if (Array.isArray(d.theology_remarks) && d.theology_remarks.length > 0) {
            setTheologyRemarks(d.theology_remarks);
            setSavedTheologyRemarks(d.theology_remarks);
          }
          if (Array.isArray(d.division_boundaries) && d.division_boundaries.length > 0) {
            setDivisionBoundaries(d.division_boundaries);
            setSavedDivisionBoundaries(d.division_boundaries);
          }
          if (Array.isArray((d as any).theology_division_boundaries) && (d as any).theology_division_boundaries.length > 0) {
            setTheologyDivisionBoundaries((d as any).theology_division_boundaries);
            setSavedTheologyDivisionBoundaries((d as any).theology_division_boundaries);
          }
          if (d.promotion_comments) {
            setPromotionComments({ ...DEFAULT_PROMOTION_COMMENTS, ...d.promotion_comments });
            setSavedPromotionComments({ ...DEFAULT_PROMOTION_COMMENTS, ...d.promotion_comments });
          }
          if (d.print_preferences || (d as any).stamp_date !== undefined) {
            const nextPrintPrefs: PrintPreferencesConfig = {
              ...DEFAULT_PRINT_PREFERENCES,
              ...(d.print_preferences || {}),
              stamp_date:
                (d as any).stamp_date || d.print_preferences?.stamp_date || "",
              default_headteacher_name:
                d.print_preferences?.default_headteacher_name || "",
              default_signature_url:
                d.print_preferences?.default_signature_url || "",
            };
            setPrintPrefs(nextPrintPrefs);
            setSavedPrintPrefs(nextPrintPrefs);
            broadcastGlobalSchoolSettingsUpdate(d as any);
          }
          if (d.marks_locks) {
            setMarksLocks({ ...DEFAULT_MARKS_LOCKS, ...d.marks_locks });
          }
        }
      } catch (err) {
        console.error("Failed to fetch school settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSchoolSettings();
  }, []);

  // Dirty-state checks
  const isIdentityDirty = JSON.stringify(identity) !== JSON.stringify(savedIdentity);
  const isGlobalPrintDefaultsDirty =
    (printPrefs.stamp_date || "") !== (savedPrintPrefs.stamp_date || "") ||
    (printPrefs.default_headteacher_name || "") !== (savedPrintPrefs.default_headteacher_name || "") ||
    (printPrefs.default_signature_url || "") !== (savedPrintPrefs.default_signature_url || "") ||
    Boolean(printPrefs.includeStamp) !== Boolean(savedPrintPrefs.includeStamp) ||
    Boolean(printPrefs.includeSignatures) !== Boolean(savedPrintPrefs.includeSignatures);
  const isSecularScaleDirty = JSON.stringify(secularScale) !== JSON.stringify(savedSecularScale);
  const isTheologyDirty =
    JSON.stringify(theologyScale) !== JSON.stringify(savedTheologyScale) ||
    JSON.stringify(theologyRemarks) !== JSON.stringify(savedTheologyRemarks);
  const isDivisionDirty =
    JSON.stringify(divisionBoundaries) !== JSON.stringify(savedDivisionBoundaries);
  const isTheologyDivisionDirty =
    JSON.stringify(theologyDivisionBoundaries) !== JSON.stringify(savedTheologyDivisionBoundaries);
  const isPromotionCommentsDirty =
    JSON.stringify(promotionComments) !== JSON.stringify(savedPromotionComments);

  // Live Grading Validation
  const secularValidation = useMemo(
    () => validateGradingBands(secularScale),
    [secularScale]
  );
  const theologyValidation = useMemo(
    () => validateGradingBands(theologyScale),
    [theologyScale]
  );
  const secularDivisionValidation = useMemo(
    () => validateDivisionBoundaries(divisionBoundaries),
    [divisionBoundaries]
  );
  const theologyDivisionValidation = useMemo(
    () => validateDivisionBoundaries(theologyDivisionBoundaries),
    [theologyDivisionBoundaries]
  );

  const saveAndVerifySettingsPatch = async (
    patchPayload: Record<string, any>,
    fallbackError: string
  ): Promise<MergedSchoolSettings> => {
    const res = await fetch("/api/settings/school", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(patchPayload),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || `${fallbackError} (HTTP ${res.status})`);
    }

    const verifyRes = await fetch(`/api/settings/school?verify=${Date.now()}`, {
      cache: "no-store",
    });
    const verifyPayload = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !verifyPayload?.data) {
      throw new Error(
        verifyPayload?.error ||
          "Settings write completed but read-back verification failed."
      );
    }

    invalidateClientCache();
    broadcastGlobalSchoolSettingsUpdate(verifyPayload.data);
    return verifyPayload.data as MergedSchoolSettings;
  };

  // Save Global Print & Stamp Defaults (Source of Truth for Hubs & Reports)
  const handleSaveGlobalPrintDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobalPrintDefaults(true);
    try {
      const normalizedStampDate = (printPrefs.stamp_date || "").trim().toUpperCase();
      const nextPrintPayload: PrintPreferencesConfig = {
        ...printPrefs,
        stamp_date: normalizedStampDate,
        default_headteacher_name: (printPrefs.default_headteacher_name || "").trim(),
        default_signature_url: (printPrefs.default_signature_url || "").trim(),
      };
      const confirmed = await saveAndVerifySettingsPatch(
        {
          stamp_date: normalizedStampDate,
          print_preferences: nextPrintPayload,
        },
        "Failed to save global print and stamp defaults"
      );
      const verifiedPrint: PrintPreferencesConfig = {
        ...DEFAULT_PRINT_PREFERENCES,
        ...(confirmed.print_preferences || nextPrintPayload),
        stamp_date:
          (confirmed as any).stamp_date ||
          confirmed.print_preferences?.stamp_date ||
          normalizedStampDate,
      };
      setPrintPrefs(verifiedPrint);
      setSavedPrintPrefs(verifiedPrint);
      toast.success("Global Print & Stamp defaults saved and synced to all Hubs & Reports.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save global print defaults");
    } finally {
      setSavingGlobalPrintDefaults(false);
    }
  };

  // Upload Default Headteacher Signature
  const handleUploadDefaultSignature = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP signature image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Signature image must be smaller than 5MB.");
      return;
    }
    setUploadingDefaultSig(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot_key", "head-teacher");
      const res = await fetch("/api/signatures/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Signature upload failed");
      }
      const publicUrl = payload?.data?.public_url;
      if (publicUrl) {
        const nextUrl = `${publicUrl}?t=${Date.now()}`;
        setPrintPrefs((prev) => ({ ...prev, default_signature_url: nextUrl }));
        toast.success("Default Headteacher signature uploaded. Click Save Print Defaults to publish.");
      }
    } catch (err: any) {
      toast.error(err.message || "Signature upload failed");
    } finally {
      setUploadingDefaultSig(false);
    }
  };

  // Save Identity Handler
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.school_name.trim()) {
      toast.error("Official School Name (English) is required.");
      return;
    }

    setSavingIdentity(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        identity,
        "Failed to save school identity"
      );
      const verifiedIdentity = {
        school_name: confirmed.school_name || identity.school_name,
        arabic_name: confirmed.arabic_name || "",
        motto: confirmed.motto || "",
        registration_number: confirmed.registration_number || "",
        po_box: confirmed.po_box || "",
        address: confirmed.address || "",
        phone: confirmed.phone || confirmed.phone_1 || "",
        email: confirmed.email || "",
        website_url: confirmed.website_url || "",
        logo_url: normalizeSchoolLogoUrl(confirmed.logo_url),
      };
      setIdentity(verifiedIdentity);
      setSavedIdentity(verifiedIdentity);
      toast.success("School identity and profile saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save school profile");
    } finally {
      setSavingIdentity(false);
    }
  };

  // Upload School Logo Handler
  const handleLogoUpload = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP logo image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo image must be smaller than 5MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot_key", "school-logo");

      const res = await fetch("/api/signatures/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Logo upload failed");
      }

      const publicUrl = payload?.data?.public_url;
      if (publicUrl) {
        const nextUrl = `${publicUrl}?t=${Date.now()}`;
        setIdentity((prev) => ({ ...prev, logo_url: nextUrl }));
        toast.success("Logo uploaded. Click Save Changes to apply across reports.");
      }
    } catch (err: any) {
      toast.error(err.message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save Secular Grading Scale
  const handleSaveSecularScale = async () => {
    if (!secularValidation.valid) {
      toast.error(secularValidation.error || "Invalid secular grading scale.");
      return;
    }

    setSavingSecularScale(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        { grading_scale: secularScale },
        "Failed to save secular grading scale"
      );
      const verifiedScale =
        Array.isArray(confirmed.grading_scale) && confirmed.grading_scale.length > 0
          ? confirmed.grading_scale
          : secularScale;
      setSecularScale(verifiedScale);
      setSavedSecularScale(verifiedScale);
      toast.success("Secular grading scale saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save secular grading scale");
    } finally {
      setSavingSecularScale(false);
    }
  };

  // Save Theology Grading Scale & Remarks
  const handleSaveTheologyScale = async () => {
    if (!theologyValidation.valid) {
      toast.error(theologyValidation.error || "Invalid theology grading scale.");
      return;
    }

    setSavingTheologyScale(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        {
          theology_grading_scale: theologyScale,
          theology_remarks: theologyRemarks,
        },
        "Failed to save theology grading settings"
      );
      const verifiedScale =
        Array.isArray(confirmed.theology_grading_scale) && confirmed.theology_grading_scale.length > 0
          ? confirmed.theology_grading_scale
          : theologyScale;
      const verifiedRemarks =
        Array.isArray(confirmed.theology_remarks) && confirmed.theology_remarks.length > 0
          ? confirmed.theology_remarks
          : theologyRemarks;
      setTheologyScale(verifiedScale);
      setSavedTheologyScale(verifiedScale);
      setTheologyRemarks(verifiedRemarks);
      setSavedTheologyRemarks(verifiedRemarks);
      toast.success("Theology grading scale and Arabic descriptors saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save theology grading scale");
    } finally {
      setSavingTheologyScale(false);
    }
  };

  // Save Secular Division Boundaries & Comment Templates
  const handleSaveDivisionBoundaries = async () => {
    if (!secularDivisionValidation.valid) {
      toast.error(secularDivisionValidation.error || "Invalid secular division boundaries.");
      return;
    }

    setSavingDivisionBoundaries(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        { division_boundaries: divisionBoundaries },
        "Failed to save division aggregate boundaries"
      );
      const verifiedDivs =
        Array.isArray(confirmed.division_boundaries) && confirmed.division_boundaries.length > 0
          ? confirmed.division_boundaries
          : divisionBoundaries;
      setDivisionBoundaries(verifiedDivs);
      setSavedDivisionBoundaries(verifiedDivs);
      toast.success("Division aggregate boundaries and comment templates saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save division boundaries");
    } finally {
      setSavingDivisionBoundaries(false);
    }
  };

  // Save Theology IPLE Division Boundaries
  const handleSaveTheologyDivisionBoundaries = async () => {
    if (!theologyDivisionValidation.valid) {
      toast.error(theologyDivisionValidation.error || "Invalid theology division boundaries.");
      return;
    }

    setSavingTheologyDivisionBoundaries(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        { theology_division_boundaries: theologyDivisionBoundaries },
        "Failed to save theology division boundaries"
      );
      const verifiedTheoDivs =
        Array.isArray((confirmed as any).theology_division_boundaries) &&
        (confirmed as any).theology_division_boundaries.length > 0
          ? (confirmed as any).theology_division_boundaries
          : theologyDivisionBoundaries;
      setTheologyDivisionBoundaries(verifiedTheoDivs);
      setSavedTheologyDivisionBoundaries(verifiedTheoDivs);
      toast.success("IPLE theology division boundaries saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save theology division boundaries");
    } finally {
      setSavingTheologyDivisionBoundaries(false);
    }
  };

  // Save Promotion & Conduct Comments Settings
  const handleSavePromotionComments = async () => {
    setSavingPromotionComments(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        { promotion_comments: promotionComments },
        "Failed to save promotion comments and conduct settings"
      );
      const verifiedPromo = {
        ...DEFAULT_PROMOTION_COMMENTS,
        ...(confirmed.promotion_comments || promotionComments),
      };
      setPromotionComments(verifiedPromo);
      setSavedPromotionComments(verifiedPromo);
      toast.success("Promotion comments and conduct settings saved and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to save promotion comments");
    } finally {
      setSavingPromotionComments(false);
    }
  };

  // One-Click Reset to UNEB / Jiddah Defaults
  const handleConfirmResetGradingDefaults = async () => {
    setResettingDefaults(true);
    try {
      const confirmed = await saveAndVerifySettingsPatch(
        {
          grading_scale: DEFAULT_GRADING_SCALE,
          theology_grading_scale: DEFAULT_THEOLOGY_GRADING_SCALE,
          theology_remarks: DEFAULT_THEOLOGY_REMARKS,
          division_boundaries: DEFAULT_DIVISION_BOUNDARIES,
          theology_division_boundaries: DEFAULT_THEOLOGY_DIVISION_BOUNDARIES,
          promotion_comments: DEFAULT_PROMOTION_COMMENTS,
        },
        "Failed to restore UNEB / Jiddah defaults"
      );

      const vSec = confirmed.grading_scale || DEFAULT_GRADING_SCALE;
      const vTheo = confirmed.theology_grading_scale || DEFAULT_THEOLOGY_GRADING_SCALE;
      const vRem = confirmed.theology_remarks || DEFAULT_THEOLOGY_REMARKS;
      const vDiv = confirmed.division_boundaries || DEFAULT_DIVISION_BOUNDARIES;
      const vTheoDiv = (confirmed as any).theology_division_boundaries || DEFAULT_THEOLOGY_DIVISION_BOUNDARIES;
      const vPromo = { ...DEFAULT_PROMOTION_COMMENTS, ...(confirmed.promotion_comments || {}) };

      setSecularScale(vSec);
      setSavedSecularScale(vSec);
      setTheologyScale(vTheo);
      setSavedTheologyScale(vTheo);
      setTheologyRemarks(vRem);
      setSavedTheologyRemarks(vRem);
      setDivisionBoundaries(vDiv);
      setSavedDivisionBoundaries(vDiv);
      setTheologyDivisionBoundaries(vTheoDiv);
      setSavedTheologyDivisionBoundaries(vTheoDiv);
      setPromotionComments(vPromo);
      setSavedPromotionComments(vPromo);
      setResetDialogOpen(false);
      toast.success("Grading scales and division rules restored and verified.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset grading defaults");
    } finally {
      setResettingDefaults(false);
    }
  };

  // Optimistic Auto-Save for Print Preferences
  const handleTogglePrintPref = async (key: keyof PrintPreferencesConfig, checked: boolean) => {
    const previous = { ...printPrefs };
    const updated: PrintPreferencesConfig = { ...printPrefs, [key]: checked };
    setPrintPrefs(updated);
    setSavingPrintPrefKey(key);

    try {
      const confirmed = await saveAndVerifySettingsPatch(
        { print_preferences: updated },
        "Failed to update print preference"
      );
      setPrintPrefs({ ...DEFAULT_PRINT_PREFERENCES, ...(confirmed.print_preferences || updated) });
      toast.success("Report card print preference saved and verified.");
      router.refresh();
    } catch (err: any) {
      setPrintPrefs(previous);
      toast.error(err.message || "Unable to update print preference");
    } finally {
      setSavingPrintPrefKey(null);
    }
  };

  // Optimistic Auto-Save for Marks Locks
  const handleToggleMarksLock = async (
    key: "bot_locked" | "mot_locked" | "eot_locked",
    checked: boolean
  ) => {
    const previous = { ...marksLocks };
    const updated: MarksLocksConfig = {
      ...marksLocks,
      [key]: checked,
      updated_at: new Date().toISOString(),
    };
    setMarksLocks(updated);
    setSavingLockKey(key);

    try {
      const res = await fetch("/api/settings/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ marks_locks: updated }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.data) {
        throw new Error(payload?.error || "Failed to update marks lock");
      }
      setMarksLocks({ ...DEFAULT_MARKS_LOCKS, ...(payload.data.marks_locks || updated) });
      invalidateClientCache();
      const examLabel = key === "bot_locked" ? "BOT" : key === "mot_locked" ? "MOT" : "EOT";
      toast.success(
        checked
          ? `${examLabel} marks entry is now locked for teachers.`
          : `${examLabel} marks entry is now unlocked for teachers.`
      );
      router.refresh();
    } catch (err: any) {
      setMarksLocks(previous);
      toast.error(err.message || "Unable to update marks lock");
    } finally {
      setSavingLockKey(null);
    }
  };

  // Filter categories when search query is typed
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) {
      return [activeCategory];
    }
    return SETTINGS_CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(normalizedQuery) ||
        cat.keywords.some((kw) => kw.includes(normalizedQuery) || normalizedQuery.includes(kw))
    ).map((cat) => cat.id);
  }, [normalizedQuery, activeCategory]);

  const shouldShowCategory = (id: SettingsCategoryKey) => visibleCategories.includes(id);

  const tabDirtyMap: Record<string, boolean> = {
    identity: isIdentityDirty || isGlobalPrintDefaultsDirty,
    secular_grading: isSecularScaleDirty || isDivisionDirty,
    theology_grading: isTheologyDirty || isTheologyDivisionDirty,
    comments: isDivisionDirty || isTheologyDirty || isPromotionCommentsDirty,
    locks: false,
  };
  const totalDirtyTabs = Object.values(tabDirtyMap).filter(Boolean).length;

  const lockedExamsCount = [
    marksLocks.bot_locked,
    marksLocks.mot_locked,
    marksLocks.eot_locked,
  ].filter(Boolean).length;

  const activePrintFeaturesCount = [
    printPrefs.includeStamp,
    printPrefs.includeSignatures,
    printPrefs.watermarkEnabled,
    printPrefs.highFidelityColors,
    printPrefs.showClassPosition,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0A0E0C] text-[#111827] dark:text-[#F4F7F5] -mx-4 sm:-mx-6 -my-6 sm:-my-8 px-4 sm:px-6 py-6">
      {/* Top Senior UI/UX Settings Header + Segmented 5-Tab Workspace Bar */}
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/95 dark:bg-[#0A0E0C]/95 backdrop-blur-sm pb-3 pt-1 border-b border-[#E7E2D7] dark:border-[#1C2622] mb-6">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <div className="w-9 h-9 rounded-xl bg-[#0F4D25] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                JS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-[#111827] dark:text-[#F4F7F5] leading-none">
                    School Settings &amp; Academic Engine
                  </h1>
                  <span
                    data-testid="settings-global-dirty-badge"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      totalDirtyTabs > 0
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-[#0F4D25] border border-emerald-300"
                    }`}
                  >
                    {totalDirtyTabs > 0 ? `${totalDirtyTabs} Unsaved` : "All Synced"}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-[#9AA7A0] mt-0.5">
                  Configure school identity, active term, PLE/IPLE grading scales, comments, and exam locks
                </p>
              </div>
            </div>

            {/* Centered Pill Search Input */}
            <div className="max-w-[440px] w-full h-10 rounded-full bg-white dark:bg-[#131A16] focus-within:ring-2 focus-within:ring-[#0F4D25]/20 border border-[#E7E2D7] dark:border-[#24332E] focus-within:border-[#0F4D25] px-4 text-sm flex items-center gap-3 transition-all shadow-2xs">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings (grading, term, conduct, lock)..."
                aria-label="Search settings"
                className="w-full bg-transparent text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] placeholder:text-stone-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear settings search"
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 5-Tab Segmented Workspace Switcher */}
          <div
            role="tablist"
            aria-label="School Settings Workspace Tabs"
            data-testid="settings-segmented-tabs"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          >
            {SETTINGS_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const isActive = !normalizedQuery && activeCategory === cat.id;
              const isMatch = Boolean(normalizedQuery && visibleCategories.includes(cat.id));
              const isDirty = Boolean(tabDirtyMap[cat.id]);
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={Boolean(isActive || isMatch)}
                  data-testid={`settings-tab-${cat.id}`}
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory(cat.id);
                  }}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isActive || isMatch
                      ? "bg-[#0F4D25] text-white border-[#0F4D25] shadow-xs"
                      : "bg-white dark:bg-[#131A16] border-[#E7E2D7] dark:border-[#24332E] text-stone-700 dark:text-stone-300 hover:bg-[#FAF7F2] dark:hover:bg-[#1C2620]"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-extrabold ${
                      isActive || isMatch
                        ? "bg-white/20 text-white"
                        : "bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.label}</span>
                  {cat.id === "comments" && (
                    <span className="sr-only">Grading &amp; Remarks Engine</span>
                  )}
                  {isDirty && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive || isMatch ? "bg-amber-300" : "bg-amber-500"
                      }`}
                      title="Unsaved changes in this tab"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Navigation Rail + Centered Modular Card Column */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start gap-6">
        {/* Left Settings Navigation Rail (Desktop vertical rail) */}
        <aside
          aria-label="Settings categories"
          className="hidden lg:block w-64 shrink-0 pr-2 sticky top-32"
        >
          <nav className="flex flex-col space-y-1.5">
            {SETTINGS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = !normalizedQuery && activeCategory === cat.id;
              const isMatch = Boolean(normalizedQuery && visibleCategories.includes(cat.id));
              const isDirty = Boolean(tabDirtyMap[cat.id]);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory(cat.id);
                  }}
                  className={`flex items-start gap-3 w-full text-left text-xs transition-all rounded-xl p-3 border cursor-pointer ${
                    isActive || isMatch
                      ? "bg-emerald-50/90 dark:bg-emerald-950/60 text-[#0F4D25] dark:text-emerald-300 border-emerald-300/80 font-bold shadow-2xs"
                      : "bg-white dark:bg-[#131A16] border-[#E7E2D7] dark:border-[#24332E] text-stone-700 dark:text-stone-300 hover:bg-[#FAF7F2] dark:hover:bg-[#1C2620]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 mt-0.5 text-[#0F4D25] dark:text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-bold">{cat.label}</span>
                      {isDirty && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                          Unsaved
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1 font-normal">
                      {cat.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Centered Modular Card Column */}
        <main className="max-w-[760px] w-full mx-auto space-y-5 pb-5 md:pb-8">
          {normalizedQuery && visibleCategories.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-8 text-center">
              <p className="text-sm font-semibold text-[#111827]">
                No settings matched "{searchQuery}"
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                Try searching for "grading", "stamp", "active term", "fees", "lock", or "password".
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] px-3.5 py-2 text-xs font-semibold text-white"
              >
                Reset Search
              </button>
            </div>
          )}

          {/* =====================================================================
              CATEGORY 1: SCHOOL IDENTITY & PROFILE
          ===================================================================== */}
          {shouldShowCategory("identity") && (
            <section className="space-y-5" aria-label="School Identity and Profile">
              <div className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      School Identity & Official Branding
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Displayed in the Global Topbar and printed on all Secular and Theology report headers.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2EEE2] px-3 py-1 text-xs font-semibold text-[#0D5C3A]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Institutional Header</span>
                  </span>
                </div>

                {/* 2-Column Summary Counters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E3E8E3] mb-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={normalizeSchoolLogoUrl(identity.logo_url)}
                      alt="School Crest"
                      onError={(e) => {
                        if (!e.currentTarget.src.endsWith("/logo-512h.png")) {
                          e.currentTarget.src = "/logo-512h.png";
                        }
                      }}
                      className="w-10 h-10 rounded-lg object-contain bg-white dark:bg-[#0D1412] border border-[#E3E8E3] dark:border-[#24312C] p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                        English Name
                      </div>
                      <div className="text-sm font-bold text-[#111827] truncate">
                        {identity.school_name || "Not Configured"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:border-l border-[#E3E8E3] sm:pl-3 min-w-0">
                    <div className="min-w-0 w-full">
                      <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                        Arabic Header (Theology Reports)
                      </div>
                      <div
                        dir="rtl"
                        className="text-sm font-bold text-[#111827] truncate text-right"
                      >
                        {identity.arabic_name || "مدرسة جدة الإسلامية"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* School Crest Upload Row */}
                <div className="border-b border-[#F1F5F1] pb-4 mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#111827]">
                      School Crest / Official Logo
                    </div>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Used on report card headers and watermarks. Upload a PNG/WEBP or specify path.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D5DFD5] bg-white hover:bg-[#F8FAF8] px-3 py-1.5 text-xs font-semibold text-[#374151] transition">
                      {uploadingLogo ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0D5C3A]" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#0D5C3A]" />
                      )}
                      <span>{uploadingLogo ? "Uploading..." : "Upload Crest"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleLogoUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <form onSubmit={handleSaveIdentity} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        School Name (English)
                      </label>
                      <input
                        type="text"
                        value={identity.school_name}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, school_name: e.target.value }))
                        }
                        placeholder="Jiddah Islamic Nursery and Primary School"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        School Name (Arabic)
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={identity.arabic_name}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, arabic_name: e.target.value }))
                        }
                        placeholder="مدرسة جدة الإسلامية للحضانة والابتدائية"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        School Motto
                      </label>
                      <input
                        type="text"
                        value={identity.motto}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, motto: e.target.value }))
                        }
                        placeholder="Strive for Life & Hereafter"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        MOES Center / Registration Number
                      </label>
                      <input
                        type="text"
                        value={identity.registration_number}
                        onChange={(e) =>
                          setIdentity((prev) => ({
                            ...prev,
                            registration_number: e.target.value,
                          }))
                        }
                        placeholder="e.g. PPS/N/1042"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        P.O. Box
                      </label>
                      <input
                        type="text"
                        value={identity.po_box}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, po_box: e.target.value }))
                        }
                        placeholder="P.O. Box 123, Entebbe"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        Physical Address
                      </label>
                      <input
                        type="text"
                        value={identity.address}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, address: e.target.value }))
                        }
                        placeholder="Nakiwogo, Entebbe, Uganda"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        Official Phone Numbers
                      </label>
                      <input
                        type="text"
                        value={identity.phone}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+256 700 000000 / +256 772 000000"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        Official Email
                      </label>
                      <input
                        type="email"
                        value={identity.email}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="info@jiddahislamic.ac.ug"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        Website URL
                      </label>
                      <input
                        type="text"
                        value={identity.website_url}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, website_url: e.target.value }))
                        }
                        placeholder="https://jiddahislamic.ac.ug"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        Crest / Logo URL
                      </label>
                      <input
                        type="text"
                        value={identity.logo_url}
                        onChange={(e) =>
                          setIdentity((prev) => ({ ...prev, logo_url: e.target.value }))
                        }
                        placeholder="/school_logo.svg"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                    </div>
                  </div>

                  {/* Dirty-State Save Footer Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F1]">
                    <span className="text-xs text-[#6B7280]">
                      {loadingSettings
                        ? "Syncing school identity..."
                        : isIdentityDirty
                          ? "You have unsaved changes to school identity"
                          : "All school identity fields are synced"}
                    </span>
                    <button
                      type="submit"
                      disabled={!isIdentityDirty || savingIdentity}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingIdentity ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{savingIdentity ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Dedicated Global Print & Stamp Defaults Card (Single Source of Truth) */}
              <div
                data-testid="settings-card-global-print-defaults"
                className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      Global Print &amp; Stamp Defaults
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Authoritative school-wide baseline inherited immediately by Secular Hub, Theology Hub, and Report Cards.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <Stamp className="w-3.5 h-3.5" />
                    <span>Global Print Truth</span>
                  </span>
                </div>

                <form onSubmit={handleSaveGlobalPrintDefaults} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1]">
                          Global Stamp Date
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPrintPrefs((prev) => ({
                                ...prev,
                                stamp_date: getLiveStampDateString(),
                              }))
                            }
                            className="text-[10.5px] font-bold text-[#0D5C3A] dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Use Today
                          </button>
                          {printPrefs.stamp_date && (
                            <button
                              type="button"
                              onClick={() =>
                                setPrintPrefs((prev) => ({ ...prev, stamp_date: "" }))
                              }
                              className="text-[10.5px] font-bold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
                            >
                              Auto Live Date
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        data-testid="settings-global-stamp-date"
                        value={printPrefs.stamp_date || ""}
                        onChange={(e) =>
                          setPrintPrefs((prev) => ({
                            ...prev,
                            stamp_date: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder={`Auto Live Date (${getLiveStampDateString()})`}
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm font-mono text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                      <p className="text-[10.5px] text-[#6B7280] dark:text-[#9AA7A0] mt-1">
                        Leave blank to stamp today&rsquo;s live date automatically, or set an official closing date (e.g., <code>{getLiveStampDateString()}</code>).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] mb-1.5">
                        Default Headteacher Name
                      </label>
                      <input
                        type="text"
                        data-testid="settings-default-headteacher-name"
                        value={printPrefs.default_headteacher_name || ""}
                        onChange={(e) =>
                          setPrintPrefs((prev) => ({
                            ...prev,
                            default_headteacher_name: e.target.value,
                          }))
                        }
                        placeholder="e.g. Hajji / Ustadh Headteacher Name"
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-3 text-xs sm:text-sm text-[#111827] dark:text-[#F4F7F5] focus:border-[#0D5C3A] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0D5C3A]/15 outline-none"
                      />
                      <p className="text-[10.5px] text-[#6B7280] dark:text-[#9AA7A0] mt-1">
                        Used as the default Head Teacher signatory line when resetting Hub sheets.
                      </p>
                    </div>
                  </div>

                  {/* Default Headteacher Signature Row */}
                  <div className="rounded-xl border border-[#E3E8E3] dark:border-[#24332E] bg-[#F8FAF8] dark:bg-[#0D1412] p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-24 h-12 rounded-lg bg-white dark:bg-[#131A16] border border-[#D5DFD5] dark:border-[#2A3B35] flex items-center justify-center overflow-hidden shrink-0 px-2">
                        {printPrefs.default_signature_url ? (
                          <img
                            src={printPrefs.default_signature_url}
                            alt="Default Headteacher Signature"
                            className="max-h-10 max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-stone-400">
                            No Signature
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#111827] dark:text-[#F4F7F5]">
                          Default Headteacher Signature
                        </div>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9AA7A0]">
                          Clean PNG/JPG ink scan printed across report cards and official sheets.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#131A16] hover:bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#374151] dark:text-[#E5ECE8] transition shrink-0">
                      {uploadingDefaultSig ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0D5C3A]" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#0D5C3A]" />
                      )}
                      <span>{uploadingDefaultSig ? "Uploading..." : "Upload Signature"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUploadDefaultSignature(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* Quick Global Toggle Defaults */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E8E3] dark:border-[#24332E] px-3.5 py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-[#111827] dark:text-[#F4F7F5]">
                          Show Official Stamp by Default
                        </div>
                        <div className="text-[10.5px] text-[#6B7280]">
                          Physical 55mm × 32mm school stamp
                        </div>
                      </div>
                      <Switch.Root
                        checked={Boolean(printPrefs.includeStamp)}
                        onCheckedChange={(checked) =>
                          setPrintPrefs((prev) => ({ ...prev, includeStamp: checked }))
                        }
                        className="w-9 h-5 rounded-full bg-stone-300 data-[state=checked]:bg-[#0D5C3A] transition-colors relative cursor-pointer shrink-0"
                      >
                        <Switch.Thumb className="block w-4 h-4 rounded-full bg-white shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                      </Switch.Root>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E8E3] dark:border-[#24332E] px-3.5 py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-[#111827] dark:text-[#F4F7F5]">
                          Show Signatures by Default
                        </div>
                        <div className="text-[10.5px] text-[#6B7280]">
                          Class teacher &amp; headteacher signature blocks
                        </div>
                      </div>
                      <Switch.Root
                        checked={Boolean(printPrefs.includeSignatures)}
                        onCheckedChange={(checked) =>
                          setPrintPrefs((prev) => ({ ...prev, includeSignatures: checked }))
                        }
                        className="w-9 h-5 rounded-full bg-stone-300 data-[state=checked]:bg-[#0D5C3A] transition-colors relative cursor-pointer shrink-0"
                      >
                        <Switch.Thumb className="block w-4 h-4 rounded-full bg-white shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                      </Switch.Root>
                    </div>
                  </div>

                  {/* Save Global Print Defaults Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F1] dark:border-[#1E2B25]">
                    <span className="text-xs text-[#6B7280] dark:text-[#9AA7A0]">
                      {isGlobalPrintDefaultsDirty
                        ? "Unsaved changes to global print & stamp defaults"
                        : "Synced live with Secular Hub, Theology Hub & Report Center"}
                    </span>
                    <button
                      type="submit"
                      data-testid="settings-save-print-defaults"
                      disabled={!isGlobalPrintDefaultsDirty || savingGlobalPrintDefaults}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {savingGlobalPrintDefaults ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {savingGlobalPrintDefaults ? "Syncing..." : "Save Print & Stamp Defaults"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Embedded Academic Terms & Calendar inside Tab 1: School Identity & Print Defaults */}
              <TermsClient
                initialTerms={normalizedTerms}
                initialFeeStructure={feeStructure}
                embedded={true}
              />
            </section>
          )}

          {/* =====================================================================
              TAB 2: SECULAR GRADING & DIVISIONS (PLE)
              + TAB 3: THEOLOGY GRADING & DIVISIONS (IPLE)
              + TAB 4: COMMENTS, CONDUCT & REMARKS RULES
          ===================================================================== */}
          {(shouldShowCategory("secular_grading") ||
            shouldShowCategory("theology_grading") ||
            shouldShowCategory("comments")) && (
            <section className="space-y-5" aria-label="Grading and Remarks Engine">
              {/* Card 3A: Secular Grading Scale (D1-F9) — shown on Tab 2 (secular_grading) or search */}
              {(shouldShowCategory("secular_grading") || Boolean(normalizedQuery)) && (
              <div
                data-testid="settings-card-secular-grading"
                className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      Secular Grading Scale (D1 to F9)
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Score ranges (0 to 100), aggregate points (1 to 9), and automated subject remarks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5DFD5] bg-[#F8FAF8] hover:bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#374151] transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#0D5C3A]" />
                    <span>Reset to UNEB / Jiddah Defaults</span>
                  </button>
                </div>

                {/* Validation Status Banner */}
                <div
                  className={`mb-4 rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 border ${
                    secularValidation.valid
                      ? "bg-[#F8FAF8] border-[#E3E8E3] text-[#0D5C3A]"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  {secularValidation.valid ? (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>
                        Continuous 0 to 100 coverage verified with zero gaps or overlapping bands.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{secularValidation.error}</span>
                    </>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3E8E3] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                        <th className="py-2 pr-2">Grade</th>
                        <th className="py-2 px-2">Min Score</th>
                        <th className="py-2 px-2">Max Score</th>
                        <th className="py-2 px-2">Points</th>
                        <th className="py-2 pl-2">Automated Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F1] text-sm">
                      {secularScale.map((band, idx) => (
                        <tr key={band.grade + idx}>
                          <td className="py-2.5 pr-2 font-bold text-[#0D5C3A] w-16">
                            <input
                              type="text"
                              value={band.grade}
                              onChange={(e) => {
                                const next = [...secularScale];
                                next[idx] = { ...band, grade: e.target.value };
                                setSecularScale(next);
                              }}
                              className="w-14 h-8 rounded border border-[#D5DFD5] px-2 text-xs font-bold text-[#0D5C3A]"
                            />
                          </td>
                          <td className="py-2.5 px-2 w-24">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={band.min}
                              onChange={(e) => {
                                const minVal = Number(e.target.value);
                                const next = [...secularScale];
                                next[idx] = {
                                  ...band,
                                  min: minVal,
                                  range: `${minVal}-${band.max}`,
                                };
                                setSecularScale(next);
                              }}
                              className="w-20 h-8 rounded border border-[#D5DFD5] px-2 text-xs text-[#111827]"
                            />
                          </td>
                          <td className="py-2.5 px-2 w-24">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={band.max}
                              onChange={(e) => {
                                const maxVal = Number(e.target.value);
                                const next = [...secularScale];
                                next[idx] = {
                                  ...band,
                                  max: maxVal,
                                  range: `${band.min}-${maxVal}`,
                                };
                                setSecularScale(next);
                              }}
                              className="w-20 h-8 rounded border border-[#D5DFD5] px-2 text-xs text-[#111827]"
                            />
                          </td>
                          <td className="py-2.5 px-2 w-20">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-[#F8FAF8] border border-[#E3E8E3] text-xs font-bold text-[#374151]">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2.5 pl-2">
                            <input
                              type="text"
                              value={band.remark}
                              onChange={(e) => {
                                const next = [...secularScale];
                                next[idx] = { ...band, remark: e.target.value };
                                setSecularScale(next);
                              }}
                              className="w-full h-8 rounded border border-[#D5DFD5] px-2.5 text-xs text-[#111827]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F1F5F1]">
                  <span className="text-xs text-[#6B7280]">
                    {isSecularScaleDirty
                      ? "Unsaved secular grading scale changes"
                      : "Secular grading scale synced with report engine"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveSecularScale}
                    disabled={!isSecularScaleDirty || !secularValidation.valid || savingSecularScale}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingSecularScale ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{savingSecularScale ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>
              )}

              {/* Card 3B: Theology Aggregate Weight Scale (1–9 Points) & Overall Arabic Remarks — shown on Tab 3 (theology_grading) or Tab 4 (comments) */}
              {(shouldShowCategory("theology_grading") ||
                shouldShowCategory("comments") ||
                Boolean(normalizedQuery)) && (
              <div
                data-testid="settings-card-theology-grading"
                className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      Theology Aggregate Weight Scale (1–9 Points) &amp; Overall Arabic Remarks (التقديرات الشرعية)
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Theology sheets display raw marks cleanly (no D1–F9 letter codes). These 1–9 point score bands feed the 4-subject overall division aggregate (4–12 = ممتاز, 13–23 = جيد جداً, 24–29 = جيد, 30–34 = مقبول, 35–36 = راسب).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5DFD5] bg-[#F8FAF8] hover:bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#374151] transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#0D5C3A]" />
                    <span>Reset to UNEB / Jiddah Defaults</span>
                  </button>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="text-xs font-semibold text-[#374151]">
                    Arabic Gender-Specific Teacher Remarks by Level (ملاحظات المعلم حسب التقدير)
                  </div>
                  <div className="space-y-2.5">
                    {theologyRemarks.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-[#E3E8E3] bg-[#F8FAF8] items-center"
                      >
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <span className="text-xs font-medium text-[#6B7280]">Level:</span>
                          <input
                            type="text"
                            dir="rtl"
                            value={item.level}
                            onChange={(e) => {
                              const next = [...theologyRemarks];
                              next[idx] = { ...item, level: e.target.value };
                              setTheologyRemarks(next);
                            }}
                            className="w-28 h-8 rounded border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs font-bold text-[#0D5C3A] dark:text-emerald-300 text-right"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#6B7280] mb-0.5">
                            Boys Remark (بنين)
                          </label>
                          <input
                            type="text"
                            dir="rtl"
                            value={item.boys}
                            onChange={(e) => {
                              const next = [...theologyRemarks];
                              next[idx] = { ...item, boys: e.target.value };
                              setTheologyRemarks(next);
                            }}
                            className="w-full h-8 rounded border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs font-semibold text-[#111827] dark:text-[#F4F7F5] text-right"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#6B7280] mb-0.5">
                            Girls Remark (بنات)
                          </label>
                          <input
                            type="text"
                            dir="rtl"
                            value={item.girls}
                            onChange={(e) => {
                              const next = [...theologyRemarks];
                              next[idx] = { ...item, girls: e.target.value };
                              setTheologyRemarks(next);
                            }}
                            className="w-full h-8 rounded border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs font-semibold text-[#111827] dark:text-[#F4F7F5] text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theology Grade Bands Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3E8E3] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                        <th className="py-2 pr-2">Point (1–9)</th>
                        <th className="py-2 px-2">Min</th>
                        <th className="py-2 px-2">Max</th>
                        <th className="py-2 pl-2 text-right">Arabic Subject Remark (التقدير)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F1] text-sm">
                      {theologyScale.map((band, idx) => (
                        <tr key={band.grade + idx}>
                          <td className="py-2 pr-2 font-bold text-[#0D5C3A] w-20">Pt {idx + 1}</td>
                          <td className="py-2 px-2 w-20">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={band.min}
                              onChange={(e) => {
                                const next = [...theologyScale];
                                next[idx] = { ...band, min: Number(e.target.value) };
                                setTheologyScale(next);
                              }}
                              className="w-16 h-8 rounded border border-[#D5DFD5] px-2 text-xs text-[#111827]"
                            />
                          </td>
                          <td className="py-2 px-2 w-20">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={band.max}
                              onChange={(e) => {
                                const next = [...theologyScale];
                                next[idx] = { ...band, max: Number(e.target.value) };
                                setTheologyScale(next);
                              }}
                              className="w-16 h-8 rounded border border-[#D5DFD5] px-2 text-xs text-[#111827]"
                            />
                          </td>
                          <td className="py-2 pl-2">
                            <input
                              type="text"
                              dir="rtl"
                              value={band.remark}
                              onChange={(e) => {
                                const next = [...theologyScale];
                                next[idx] = { ...band, remark: e.target.value };
                                setTheologyScale(next);
                              }}
                              className="w-full h-8 rounded border border-[#D5DFD5] px-3 text-sm font-semibold text-[#111827] text-right"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F1F5F1]">
                  <span className="text-xs text-[#6B7280]">
                    {isTheologyDirty
                      ? "Unsaved theology grading changes"
                      : "Theology descriptors synced with Arabic report templates"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTheologyScale}
                    disabled={!isTheologyDirty || !theologyValidation.valid || savingTheologyScale}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingTheologyScale ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{savingTheologyScale ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>
              )}

              {/* Card 3C: Division Aggregate Boundaries & Comment Templates — shown on Tab 2 (secular_grading) or Tab 4 (comments) */}
              {(shouldShowCategory("secular_grading") ||
                shouldShowCategory("comments") ||
                Boolean(normalizedQuery)) && (
              <div
                data-testid="settings-card-secular-divisions"
                className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6"
              >
                <div className="mb-4">
                  <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                    Division Aggregate Boundaries & Automated Comments
                  </h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                    4-core-subject aggregate cutoffs (4 to 36 points) and default Class Teacher / Headteacher remarks.
                  </p>
                </div>

                <div className="space-y-4">
                  {divisionBoundaries.map((div, idx) => (
                    <div
                      key={div.division}
                      className="rounded-xl border border-[#E3E8E3] bg-[#F8FAF8] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex items-center rounded-lg bg-[#E2EEE2] px-2.5 py-1 text-xs font-bold text-[#0D5C3A]">
                          {div.label} ({div.division})
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#6B7280] font-medium">Aggregate Range:</span>
                          <input
                            type="number"
                            min={4}
                            max={36}
                            value={div.min}
                            onChange={(e) => {
                              const next = [...divisionBoundaries];
                              next[idx] = { ...div, min: Number(e.target.value) };
                              setDivisionBoundaries(next);
                            }}
                            className="w-16 h-8 rounded border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2 text-xs font-bold text-[#111827] dark:text-[#F4F7F5]"
                          />
                          <span className="text-[#6B7280]">to</span>
                          <input
                            type="number"
                            min={4}
                            max={36}
                            value={div.max}
                            onChange={(e) => {
                              const next = [...divisionBoundaries];
                              next[idx] = { ...div, max: Number(e.target.value) };
                              setDivisionBoundaries(next);
                            }}
                            className="w-16 h-8 rounded border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2 text-xs font-bold text-[#111827] dark:text-[#F4F7F5]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                            Class Teacher Comment Template
                          </label>
                          <input
                            type="text"
                            value={div.classTeacherComment}
                            onChange={(e) => {
                              const next = [...divisionBoundaries];
                              next[idx] = { ...div, classTeacherComment: e.target.value };
                              setDivisionBoundaries(next);
                            }}
                            className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                            Headteacher Comment Template
                          </label>
                          <input
                            type="text"
                            value={div.headTeacherComment}
                            onChange={(e) => {
                              const next = [...divisionBoundaries];
                              next[idx] = { ...div, headTeacherComment: e.target.value };
                              setDivisionBoundaries(next);
                            }}
                            className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                            Conduct Remark Template
                          </label>
                          <input
                            type="text"
                            value={div.conductRemark || ""}
                            placeholder="e.g. Good conduct. Keep it up."
                            onChange={(e) => {
                              const next = [...divisionBoundaries];
                              next[idx] = { ...div, conductRemark: e.target.value };
                              setDivisionBoundaries(next);
                            }}
                            className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation Banner & Submit for Secular Division Boundaries */}
                <div
                  className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 border ${
                    secularDivisionValidation.valid
                      ? "bg-[#F8FAF8] border-[#E3E8E3] text-[#0D5C3A]"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  {secularDivisionValidation.valid ? (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Continuous 4–36 aggregate coverage verified for Secular divisions.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{secularDivisionValidation.error}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F1F5F1]">
                  <span className="text-xs text-[#6B7280]">
                    {isDivisionDirty
                      ? "Unsaved secular division boundary or comment changes"
                      : "Secular division rules synced with report engine"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveDivisionBoundaries}
                    disabled={!isDivisionDirty || !secularDivisionValidation.valid || savingDivisionBoundaries}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingDivisionBoundaries ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{savingDivisionBoundaries ? "Saving..." : "Save Secular Divisions"}</span>
                  </button>
                </div>
              </div>
              )}

              {/* Card 3C-IPLE: Theology Overall Aggregate Division Boundaries — shown on Tab 3 (theology_grading) */}
              {(shouldShowCategory("theology_grading") || Boolean(normalizedQuery)) && (
              <div
                data-testid="settings-card-theology-divisions"
                className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6"
              >
                <div className="mb-4">
                  <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                    Theology IPLE Overall Division Boundaries (تقديرات المجموع التراكمي ٤–٣٦)
                  </h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                    Configurable 4-core-subject aggregate cutoffs for Arabic Theology divisions (e.g. ممتاز 4–12, جيد جداً 13–23).
                  </p>
                </div>

                <div
                  className={`mb-4 rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 border ${
                    theologyDivisionValidation.valid
                      ? "bg-[#F8FAF8] border-[#E3E8E3] text-[#0D5C3A]"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  {theologyDivisionValidation.valid ? (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Continuous 4–36 aggregate coverage verified for IPLE theology divisions.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{theologyDivisionValidation.error}</span>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  {theologyDivisionBoundaries.map((div, idx) => (
                    <div
                      key={`${div.equivalentDivision}-${idx}`}
                      className="rounded-xl border border-[#E3E8E3] bg-[#F8FAF8] p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            dir="rtl"
                            className="inline-flex items-center rounded-lg bg-[#E2EEE2] px-2.5 py-1 text-xs font-bold text-[#0D5C3A]"
                          >
                            {div.division}
                          </span>
                          <span className="text-xs text-[#6B7280] font-medium">
                            ({div.label})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#6B7280] font-medium">Aggregate Range:</span>
                          <input
                            type="number"
                            min={4}
                            max={36}
                            value={div.min}
                            onChange={(e) => {
                              const next = [...theologyDivisionBoundaries];
                              next[idx] = { ...div, min: Number(e.target.value) };
                              setTheologyDivisionBoundaries(next);
                            }}
                            className="w-16 h-8 rounded border border-[#D5DFD5] bg-white px-2 text-xs font-bold text-[#111827]"
                          />
                          <span className="text-[#6B7280]">to</span>
                          <input
                            type="number"
                            min={4}
                            max={36}
                            value={div.max}
                            onChange={(e) => {
                              const next = [...theologyDivisionBoundaries];
                              next[idx] = { ...div, max: Number(e.target.value) };
                              setTheologyDivisionBoundaries(next);
                            }}
                            className="w-16 h-8 rounded border border-[#D5DFD5] bg-white px-2 text-xs font-bold text-[#111827]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F1F5F1]">
                  <span className="text-xs text-[#6B7280]">
                    {isTheologyDivisionDirty
                      ? "Unsaved IPLE theology division boundary changes"
                      : "IPLE theology division thresholds synced across hubs and reports"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTheologyDivisionBoundaries}
                    disabled={!isTheologyDivisionDirty || !theologyDivisionValidation.valid || savingTheologyDivisionBoundaries}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingTheologyDivisionBoundaries ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{savingTheologyDivisionBoundaries ? "Saving..." : "Save Theology Divisions"}</span>
                  </button>
                </div>
              </div>
              )}

              {/* Card 3D: Term 3 Promotion & General Conduct Settings — shown on Tab 4 (comments) */}
              {(shouldShowCategory("comments") || Boolean(normalizedQuery)) && (
              <div
                data-testid="settings-card-promotion-conduct"
                className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      Term 3 Promotion Remarks &amp; General Conduct
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Automated Class Teacher comments applied during end-of-year promotion decisions and fallback conduct remarks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5DFD5] bg-[#F8FAF8] hover:bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#374151] transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#0D5C3A]" />
                    <span>Reset to UNEB / Jiddah Defaults</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                        Promoted Remark (Division I, II, III)
                      </label>
                      <input
                        type="text"
                        value={promotionComments.promoted}
                        onChange={(e) =>
                          setPromotionComments({ ...promotionComments, promoted: e.target.value })
                        }
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                        placeholder="Promoted to the next class."
                      />
                      <p className="text-[10px] text-[#9AA7A0] mt-0.5">Printed under Class Teacher's Comment for passing candidates.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                        Promoted on Probation Remark (Division IV)
                      </label>
                      <input
                        type="text"
                        value={promotionComments.promoted_probation}
                        onChange={(e) =>
                          setPromotionComments({ ...promotionComments, promoted_probation: e.target.value })
                        }
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                        placeholder="Promoted on probation."
                      />
                      <p className="text-[10px] text-[#9AA7A0] mt-0.5">Printed when pupil is promoted with academic conditions.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                        Repeat Class Remark (Ungraded U)
                      </label>
                      <input
                        type="text"
                        value={promotionComments.repeat}
                        onChange={(e) =>
                          setPromotionComments({ ...promotionComments, repeat: e.target.value })
                        }
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                        placeholder="Advised to repeat the class."
                      />
                      <p className="text-[10px] text-[#9AA7A0] mt-0.5">Printed when student does not qualify for promotion.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                        Try Next Class Remark (Manual Override)
                      </label>
                      <input
                        type="text"
                        value={promotionComments.try_next_class}
                        onChange={(e) =>
                          setPromotionComments({ ...promotionComments, try_next_class: e.target.value })
                        }
                        className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                        placeholder="Try next class."
                      />
                      <p className="text-[10px] text-[#9AA7A0] mt-0.5">Printed when teachers assign manual probation promotion.</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F1] dark:border-[#24332E]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9AA7A0] mb-1">
                          Default General Conduct Remark (Nursery / Unclassified)
                        </label>
                        <input
                          type="text"
                          value={promotionComments.default_conduct}
                          onChange={(e) =>
                            setPromotionComments({ ...promotionComments, default_conduct: e.target.value })
                          }
                          className="w-full h-9 rounded-lg border border-[#D5DFD5] dark:border-[#2A3B35] bg-white dark:bg-[#0D1412] px-2.5 text-xs text-[#111827] dark:text-[#F4F7F5]"
                          placeholder="Good conduct."
                        />
                        <p className="text-[10px] text-[#9AA7A0] mt-0.5">Fallback conduct remark when student has no division assigned.</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <input
                          type="checkbox"
                          id="append_division_comment"
                          checked={promotionComments.append_division_comment || false}
                          onChange={(e) =>
                            setPromotionComments({
                              ...promotionComments,
                              append_division_comment: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-[#0D5C3A] focus:ring-[#0D5C3A] border-[#D5DFD5]"
                        />
                        <label
                          htmlFor="append_division_comment"
                          className="text-xs font-medium text-[#374151] dark:text-[#E2E8F0] cursor-pointer"
                        >
                          Append Division Academic Remark to Promotion Status
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F1F5F1] dark:border-[#24332E]">
                  <span className="text-xs text-[#6B7280]">
                    {isPromotionCommentsDirty
                      ? "Unsaved promotion or conduct settings"
                      : "Promotion remarks and conduct templates synced"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSavePromotionComments}
                    disabled={!isPromotionCommentsDirty || savingPromotionComments}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingPromotionComments ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{savingPromotionComments ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>
              )}
            </section>
          )}

          {/* =====================================================================
              TAB 5: EXAM LOCKS & ACCESS SAFEGUARDS (+ Print Layout & Signatures)
          ===================================================================== */}
          {shouldShowCategory("locks") && (
            <section className="space-y-5" aria-label="Exam Locks and Access Safeguards">
              <div className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      Report Card & Print Layout Preferences
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Changes auto-save immediately and apply across all 8 Secular and Theology report templates.
                    </p>
                  </div>
                  <Link
                    href="/admin/reports"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5DFD5] bg-[#F8FAF8] hover:bg-[#EEF3EE] px-3 py-1.5 text-xs font-semibold text-[#0D5C3A] transition"
                  >
                    <span>Preview Reports</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* 2-Column Summary Counters */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E3E8E3] mb-4">
                  <div>
                    <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                      Active Print Layers
                    </div>
                    <div className="text-sm font-bold text-[#111827] mt-0.5">
                      {activePrintFeaturesCount} / 5 Enabled
                    </div>
                  </div>
                  <div className="border-l border-[#E3E8E3] pl-3">
                    <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                      Paper Standard
                    </div>
                    <div className="text-sm font-bold text-[#0D5C3A] mt-0.5">
                      A4 Portrait (Locked Print Engine)
                    </div>
                  </div>
                </div>

                {/* Switch Rows */}
                <div className="divide-y divide-[#F1F5F1]">
                  {[
                    {
                      key: "includeStamp" as const,
                      title: "Include Official School Stamp",
                      desc: "Render the uploaded school stamp image on individual and batch report cards.",
                    },
                    {
                      key: "includeSignatures" as const,
                      title: "Include Official Signatures",
                      desc: "Render Headteacher, DOS, Theology Head, and Class Teacher signatures on reports.",
                    },
                    {
                      key: "watermarkEnabled" as const,
                      title: "School Crest Background Watermark",
                      desc: "Display a subtle centered school crest watermark behind report assessment tables.",
                    },
                    {
                      key: "highFidelityColors" as const,
                      title: "High-Fidelity Print Colors",
                      desc: "Enforce exact institutional green and gold header backgrounds when printing to PDF.",
                    },
                    {
                      key: "showClassPosition" as const,
                      title: "Show Student Class Position / Rank",
                      desc: "Display competition ranking (1st, 2nd, 3rd) on Secular and Theology report cards.",
                    },
                  ].map((item) => {
                    const isSaving = savingPrintPrefKey === item.key;
                    const checked = Boolean(printPrefs[item.key]);
                    return (
                      <div
                        key={item.key}
                        className="border-b border-[#F1F5F1] last:border-0 py-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-medium text-[#111827]">{item.title}</div>
                          <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSaving && (
                            <RefreshCw className="w-3.5 h-3.5 text-[#0D5C3A] animate-spin" />
                          )}
                          <Switch.Root
                            checked={checked}
                            disabled={isSaving}
                            onCheckedChange={(val) => void handleTogglePrintPref(item.key, val)}
                            aria-label={item.title}
                            className="w-10 h-5 bg-gray-200 rounded-full relative data-[state=checked]:bg-[#0D5C3A] transition-colors outline-none cursor-pointer disabled:opacity-50"
                          >
                            <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-[#131A16] rounded-2xl border border-[#E3E8E3] dark:border-[#24332E] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F4F7F5]">
                      Marks Entry &amp; Exam Set Access Locks
                    </h2>
                    <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">
                      Freeze teacher mark entry per exam set once reports are printed. Administrators retain override access.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2EEE2] px-3 py-1 text-xs font-semibold text-[#0D5C3A]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Server-Enforced</span>
                  </span>
                </div>

                {/* 2-Column Summary Counters */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E3E8E3] mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                      {lockedExamsCount > 0 ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                        Frozen Exam Sets
                      </div>
                      <div className="text-sm font-bold text-[#111827]">
                        {lockedExamsCount} / 3 Locked
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-l border-[#E3E8E3] pl-3">
                    <div className="w-9 h-9 rounded-lg bg-[#E2EEE2] text-[#0D5C3A] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                        Admin Override
                      </div>
                      <div className="text-sm font-bold text-[#0D5C3A]">Always Active</div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-[#F1F5F1]">
                  {[
                    {
                      key: "bot_locked" as const,
                      title: "Beginning of Term (BOT) Marks Lock",
                      desc: "When enabled, teachers cannot add, edit, or delete BOT scores in Secular or Theology hubs.",
                    },
                    {
                      key: "mot_locked" as const,
                      title: "Mid of Term (MOT) Marks Lock",
                      desc: "When enabled, teachers cannot alter MOT assessment scores after midterm reports are issued.",
                    },
                    {
                      key: "eot_locked" as const,
                      title: "End of Term (EOT) Marks Lock",
                      desc: "When enabled, teachers cannot alter final EOT examination scores after end-of-term printing.",
                    },
                  ].map((item) => {
                    const isSaving = savingLockKey === item.key;
                    const checked = Boolean(marksLocks[item.key]);
                    return (
                      <div
                        key={item.key}
                        className="border-b border-[#F1F5F1] last:border-0 py-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#111827]">{item.title}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                checked
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-[#E2EEE2] text-[#0D5C3A]"
                              }`}
                            >
                              {checked ? "Locked for Teachers" : "Open for Entry"}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B7280] dark:text-[#9AA7A0] mt-0.5">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSaving && (
                            <RefreshCw className="w-3.5 h-3.5 text-[#0D5C3A] animate-spin" />
                          )}
                          <Switch.Root
                            checked={checked}
                            disabled={isSaving}
                            onCheckedChange={(val) => void handleToggleMarksLock(item.key, val)}
                            aria-label={item.title}
                            className="w-10 h-5 bg-gray-200 rounded-full relative data-[state=checked]:bg-[#0D5C3A] transition-colors outline-none cursor-pointer disabled:opacity-50"
                          >
                            <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <SignaturesClient
                initialSlots={initialSlots}
                embedded={true}
                searchQuery={searchQuery}
              />

              <AccountClient
                initialProfile={initialProfile}
                userEmail={userEmail}
                embedded={true}
              />
            </section>
          )}
        </main>
      </div>

      {/* Confirm Destructive Dialog for Grading Scale Reset */}
      <ConfirmDestructiveDialog
        open={resetDialogOpen}
        title="Reset Grading & Division Scales to UNEB / Jiddah Defaults?"
        description="This will overwrite any custom Secular grade bands, Theology Arabic grade thresholds, and Division Aggregate boundaries with the official UNEB and Jiddah Islamic default scales."
        confirmLabel="Restore Defaults"
        loading={resettingDefaults}
        onConfirm={handleConfirmResetGradingDefaults}
        onCancel={() => setResetDialogOpen(false)}
      />
    </div>
  );
}
