-- Run this in your Supabase SQL Editor:
ALTER TABLE school_settings
ADD COLUMN IF NOT EXISTS primary_font varchar(255) DEFAULT 'Montserrat',
ADD COLUMN IF NOT EXISTS arabic_font varchar(255) DEFAULT 'Amiri',
ADD COLUMN IF NOT EXISTS theme_color varchar(50) DEFAULT '#0f4d25',
ADD COLUMN IF NOT EXISTS report_theme_preset varchar(100) DEFAULT 'emerald-gold';

COMMENT ON COLUMN school_settings.primary_font IS 'Self-hosted primary font name';
COMMENT ON COLUMN school_settings.arabic_font IS 'Self-hosted Arabic font name';
COMMENT ON COLUMN school_settings.theme_color IS 'Admin dashboard theme color';
COMMENT ON COLUMN school_settings.report_theme_preset IS 'Vetted preset identifier for report card aesthetics';
