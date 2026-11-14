import React from "react";

export interface PrintMetadataItem {
  label: string;
  value: string | number | null | undefined;
}

interface OfficialPrintLetterheadProps {
  /** Primary document title pill (e.g. "END OF TERM BROADSHEET", "CLASS STUDENT ROSTER") */
  documentTitle: string;
  /** Optional Arabic subtitle shown in the bilingual lockup */
  arabicDocumentTitle?: string;
  /** Metadata cells rendered in the compact institutional bar */
  metadata?: PrintMetadataItem[];
  /** RTL mode for Arabic-primary theology documents */
  rtl?: boolean;
  /** School name override from school_settings */
  schoolName?: string;
  /** Arabic school name override */
  arabicName?: string;
  /** Motto override */
  motto?: string;
  /** Contact line override */
  contactLine?: string;
  /** Crest image URL */
  logoUrl?: string;
  /** Show on screen too (defaults to print-only so screen workspace stays compact) */
  visibleOnScreen?: boolean;
}

/**
 * Reusable Official Institutional Letterhead for printed broadsheets,
 * rosters, and administrative documents. Uses pure print-safe markup and
 * crisp borderless crest artwork (/logo-512h.png).
 */
export function OfficialPrintLetterhead({
  documentTitle,
  arabicDocumentTitle,
  metadata = [],
  rtl = false,
  schoolName = "JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL",
  arabicName = "مدرسة جدة الإسلامية للروضة والابتدائية",
  motto = "Strive for Life & Hereafter",
  contactLine = "P.O. Box 34008, Kampala – Uganda • Tel: +256 705 316961 / +256 787 779909",
  logoUrl = "/logo-512h.png",
  visibleOnScreen = false,
}: OfficialPrintLetterheadProps) {
  return (
    <header
      dir={rtl ? "rtl" : "ltr"}
      className={`${visibleOnScreen ? "block" : "hidden print:block"} mb-4 text-black select-none`}
    >
      <div className="flex items-center justify-between gap-4 pb-2.5">
        {/* Left: Crisp School Crest */}
        <div className="flex items-center shrink-0">
          <img
            src={logoUrl || "/logo-512h.png"}
            alt="Jiddah Islamic School Crest"
            width={56}
            height={56}
            className="w-14 h-14 object-contain"
          />
        </div>

        {/* Center: English Official School Identity */}
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-[15px] sm:text-[17px] font-black tracking-wide text-[#0B3D26] print:text-black uppercase leading-tight">
            {schoolName}
          </h1>
          <p className="text-[10px] font-semibold italic text-[#8A6D1B] print:text-stone-700 mt-0.5">
            &ldquo;{motto}&rdquo;
          </p>
          <p className="text-[9.5px] font-medium text-stone-600 print:text-black mt-0.5">
            {contactLine}
          </p>
        </div>

        {/* Right: Arabic Institutional Title + Document Type Pill */}
        <div className={`shrink-0 flex flex-col ${rtl ? "items-start text-left" : "items-end text-right"}`}>
          <span
            dir="rtl"
            className="font-arabic text-[13px] font-bold text-[#0B3D26] print:text-black leading-tight"
          >
            {arabicName}
          </span>
          <span className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0D5C3A]/35 bg-[#E8F3EC] text-[#0B3D26] print:bg-stone-100 print:border-black print:text-black text-[9.5px] font-extrabold uppercase tracking-wider">
            {documentTitle}
          </span>
          {arabicDocumentTitle && (
            <span dir="rtl" className="font-arabic text-[10px] font-semibold text-stone-700 print:text-black mt-0.5">
              {arabicDocumentTitle}
            </span>
          )}
        </div>
      </div>

      {/* Institutional 3px Green-Gold-Green Accent Hairline */}
      <div
        className="h-[3px] w-full rounded-full"
        style={{
          background: "linear-gradient(90deg, #0D5C3A 0%, #C59B27 50%, #0D5C3A 100%)",
        }}
      />

      {/* Metadata Summary Bar */}
      {metadata.length > 0 && (
        <div className="mt-2.5 grid grid-flow-col auto-cols-fr gap-2 px-3 py-1.5 rounded-md border border-stone-300 print:border-black bg-stone-50/70 print:bg-transparent text-[10.5px]">
          {metadata.map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="flex items-center justify-center gap-1.5 min-w-0">
              <span className="font-bold uppercase tracking-wider text-stone-500 print:text-stone-700 text-[9px] shrink-0">
                {item.label}:
              </span>
              <span className="font-bold text-stone-900 print:text-black truncate">
                {item.value || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

interface OfficialPrintSignaturesFooterProps {
  rtl?: boolean;
  generatedBy?: string;
}

/**
 * Clean 3-column signature & official stamp footer rendered at the bottom of
 * printed rosters and assessment broadsheets.
 */
export function OfficialPrintSignaturesFooter({
  rtl = false,
  generatedBy,
}: OfficialPrintSignaturesFooterProps) {
  const printedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <footer
      dir={rtl ? "rtl" : "ltr"}
      className="hidden print:block mt-6 pt-4 border-t border-stone-300 text-black break-inside-avoid"
    >
      <div className="grid grid-cols-3 gap-8 text-center text-[10px]">
        <div className="pt-6 border-t border-dashed border-stone-500">
          <p className="font-bold uppercase tracking-wider">
            {rtl ? "توقيع مربي الفصل" : "Class Teacher Signature & Date"}
          </p>
        </div>
        <div className="pt-6 border-t border-dashed border-stone-500">
          <p className="font-bold uppercase tracking-wider">
            {rtl ? "مدير الشؤون الأكاديمية" : "Director of Studies / Checked By"}
          </p>
        </div>
        <div className="pt-6 border-t border-dashed border-stone-500">
          <p className="font-bold uppercase tracking-wider">
            {rtl ? "توقيع المدير والختم الرسمي" : "Head Teacher Signature & Official Stamp"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[8.5px] text-stone-600">
        <span>Jiddah Smart Report Engine • Official Institutional Print Record</span>
        <span>
          {generatedBy ? `Prepared by ${generatedBy} • ` : ""}
          Printed {printedDate}
        </span>
      </div>
    </footer>
  );
}

