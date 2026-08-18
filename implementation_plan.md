# Recreate Primary Report based on Image (LOWER REPORT FORM)

The goal is to perfectly replicate the layout and structure shown in the new reference image (`media_1787009968412.png`). The current HTML structure was based on the old HTML file, but the user explicitly wants the 3-column academic table (BOT, MOT, EOT) and the decorative diamond border as shown in the new "LOWER REPORT FORM" image.

## User Review Required
> [!IMPORTANT]
> The new design uses a decorative diamond/star border. I will use CSS or base64 images to recreate this border. Since the reference image is "LOWER REPORT FORM", I will apply this exact 3-column layout (BOT, MOT, EOT) and styling to all Primary reports (BOT, MOT, EOT).

## Proposed Changes

### Primary Reports (`src/components/reports/PrimaryEOTReport.tsx`, `PrimaryMOTReport.tsx`, `PrimaryBOTReport.tsx`)

#### [MODIFY] `PrimaryEOTReport.tsx`
- Rewrite the main container CSS to include the custom diamond/star border (using a CSS `border-image` or pseudo-elements to replicate the pattern).
- Change the academic table from a 2-term format (MOT, EOT) to the 3-term format (BOT, MOT, EOT) as seen in the image.
  - Columns: SUBJECTS | BEGINNING OF TERM (MARK, AGG) | MIDTERM (MARK, AGG) | END OF TERM (MARK, AGG) | SUBJECT TEACHER'S COMMENT.
- Update header to perfectly match the image:
  - Bismillah centered at the top.
  - School logo centered below it.
  - Green outlined "LOWER REPORT FORM - END OF TERM" box below logo.
  - Left: JIDDAH ISLAMIC NURSERY AND PRIMARY SCHOOL - Nsaggu.
  - Right: Arabic text.
- Adjust theology table layout to match the image, ensuring it stays on the right side.
- Ensure the print page strictly enforces `A4 landscape` and spans the full 1123px width by applying the exact dimensions in a way that respects the wrapper limits.

#### [MODIFY] `PrimaryMOTReport.tsx` and `PrimaryBOTReport.tsx`
- Duplicate the new perfect structure to the MOT and BOT reports, only changing the header badge text to match the respective term.

## Verification Plan
1. Generate the component and ensure it renders without squishing.
2. Verify that the 3-column table (BOT, MOT, EOT) is populated correctly with `reportData`.
3. Verify that the theology table remains stable and hardcoded to the 4 subjects.
4. Verify the decorative border appears correctly in the browser and in print preview.
