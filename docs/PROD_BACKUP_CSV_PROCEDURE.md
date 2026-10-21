# Production Backup & CSV Export Procedure

> **APPLICABILITY:** Supabase Free Tier Production Database  
> **CONTEXT:** Supabase Free Tier does not include automated point-in-time recovery (PITR) or daily automated backups. Before any schema modification, policy application, or data cleanup, a manual verified export is strictly mandatory.

---

## 1. Mandatory Pre-Migration Tables (Every Table in Probe Output & Auth Snapshot)

Because production tables vary depending on legacy migrations and the database size is small, export of **EVERY table reported in the probe's `row_counts` output** plus an **auth.users snapshot** is mandatory before executing any migration.

Every downloaded table export CSV must be verified by comparing its exported row count (excluding header) against the exact count reported in the probe's `row_counts[table_name]`.

### Tables to Export:
1. **Dynamic Target:** Every table key present in `row_counts` from `scripts/prod-schema-probe.sql`.
   For the owner-verified production shape dated 2026-10-19, this means all 33 public tables:
   `academic_terms`, `activity_log`, `activity_logs`, `circular_classes`, `circular_marks`, `circular_results`, `circular_subjects`, `classes`, `enrollments`, `grading_criteria`, `grading_remarks`, `marks`, `marks_audit_log`, `marks_primary`, `notifications`, `nursery_assessments`, `profiles`, `report_templates`, `school_settings`, `signatures`, `students`, `subjects`, `teacher_class_assignments`, `teacher_initials`, `teacher_invites`, `teachers`, `terms`, `theology_classes`, `theology_marks`, `theology_results`, `theology_subjects`, `user_profiles`, and `users`.
2. **Auth Snapshot:** `auth.users` snapshot query (MANDATORY because deactivation and account cleanups touch auth user ban statuses).

### Auth Users Snapshot Query (Download CSV via SQL Editor)
```sql
SELECT id, email, banned_until, last_sign_in_at, created_at
FROM auth.users
ORDER BY created_at ASC;
```

---

## 2. Export Methods

### Method A: Supabase Dashboard CSV Export (Fastest, Web-Based)

For each public table listed above:
1. Log into the **Supabase Dashboard** -> Project `vismrobdsdsaxmqegcay`.
2. Navigate to **Table Editor** in the left sidebar.
3. Select the target table (e.g. `theology_marks`).
4. Click the **Export** button in the upper-right corner.
5. Select **Export to CSV**.
6. Save the downloaded CSV into the designated secure backup folder naming format:
   `YYYYMMDD_HHMM_production_<table_name>.csv`
7. Repeat for all public tables.

---

### Method B: `pg_dump` CLI Alternative (Command Line)

If terminal access to PostgreSQL client utilities is available:

```bash
# Set placeholder credentials (DO NOT commit password or connection string)
PG_HOST="db.[PROJECT_REF].supabase.co"
PG_PORT="5432"
PG_USER="postgres"
PG_DB="postgres"

# Run pg_dump for public schema with transaction snapshot
pg_dump \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  --schema=public \
  --data-only \
  --format=plain \
  -f "backup_prod_data_$(date +%Y%m%d_%H%M%S).sql"
```

*Note: For individual CSV dumps via `psql`:*
```bash
psql "postgresql://$PG_USER:[PASSWORD]@$PG_HOST:$PG_PORT/$PG_DB" \
  -c "\copy public.theology_marks TO 'theology_marks_backup.csv' WITH (FORMAT csv, HEADER true);"
```

---

## 3. Row-Count Verification Query

Run this query directly in the Supabase SQL Editor immediately prior to export and compare each count with the number of rows in the exported CSV (excluding header line):

```sql
SELECT 
  table_name, 
  (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint AS exact_row_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Verification Rule:**
- Exported CSV line count minus 1 (header) **MUST EXACTLY EQUAL** `exact_row_count`.
- If counts diverge, re-run the export before continuing.

---

## 4. Secure Storage Protocol

1. **Storage Location:**
   - Store all exported `.csv` and `.sql` backup files in a dedicated, local, encrypted folder (e.g., BitLocker encrypted drive or local secure vault).
   - Recommended path: `C:\Users\USER\SecureBackups\Jiddah_Prod_YYYYMMDD\`.
2. **Strict Exclusions:**
   - **NEVER** copy, stage, or commit backup files to the git repository.
   - Verify git status remains clean:
     ```powershell
     git status
     ```
   - The `.gitignore` file must include `*.csv` and `backups/`.
3. **Retention Policy:**
   - Keep pre-migration backups indefinitely or for at least 90 days following a successful release.
