# Print Layout Audit

This audit documents how the report generator handles edge cases like extremely long names and missing grades in the print stylesheet (`print-system.css`).

| Case | Description | Behavior Observed | Screenshot |
|---|---|---|---|
| **Long Name** | A student name that exceeds the typical length of the dotted line (`Abdullahi Abubakar Mohammed Ibn Khaldun Al-Faruq The Third`). | The `.line` element is a flex item (`flex: 1`, `min-width: 0`), causing long names to wrap to the next line within the `.info-row`. This breaks the alignment of the dotted border. | ![Long Name Layout](audit-result.png) |
| **Missing Grade** | `score` and `grade` are `null` or `undefined` for a subject. | Handled gracefully. Fallback text (`-`) is rendered correctly in the `.data-cell` columns without breaking table cells. | ![Missing Grade Layout](audit-result.png) |
