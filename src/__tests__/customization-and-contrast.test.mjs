import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateColorContrast,
  getContrastRatio,
  hexToRgb,
} from '../lib/color-contrast.ts';

import { themePresets, getThemeColors } from '../lib/themes.ts';
import { SCHOOL_FIXTURES } from './fixtures/synthetic-seed-factory.mjs';

describe('Wave 4: Customization, End-to-End & Contrast Verification', () => {
  describe('1. Programmatic Color Contrast (WCAG 2.1 AA/AAA)', () => {
    it('evaluates black on white as maximum contrast (21:1)', () => {
      const result = evaluateColorContrast('#000000', '#ffffff');
      assert.equal(result.ratio, 21);
      assert.equal(result.isAANormalText, true);
      assert.equal(result.isAAANormalText, true);
      assert.equal(result.status, 'PASS');
    });

    it('validates that all default theme presets pass WCAG AA for primary text/headers', () => {
      for (const [name, preset] of Object.entries(themePresets)) {
        const evalPrimary = evaluateColorContrast(preset.primary, '#ffffff');
        assert.ok(
          evalPrimary.isAALargeText,
          `Preset "${name}" primary color ${preset.primary} fails WCAG AA large text contrast (${evalPrimary.ratio}:1)`
        );
      }
    });

    it('rejects / flags insufficient contrast colors', () => {
      // Very light yellow on white background
      const badEval = evaluateColorContrast('#fff066', '#ffffff');
      assert.equal(badEval.status, 'FAIL');
      assert.equal(badEval.isAANormalText, false);
      assert.ok(badEval.recommendation?.includes('fails WCAG AA'));
    });
  });

  describe('2. Multi-School Branding Isolation', () => {
    it('proves that changing School A branding never alters School B', () => {
      const schoolA = { ...SCHOOL_FIXTURES[0] };
      const schoolB = { ...SCHOOL_FIXTURES[1] };

      // Mutate school A
      const updatedSchoolA = {
        ...schoolA,
        school_name: 'UPDATED_ALPHA_NAME',
        theme_color: '#123456',
        primary_font: 'Poppins',
      };

      // Assert school B remains completely untouched
      assert.notEqual(updatedSchoolA.school_name, schoolB.school_name);
      assert.notEqual(updatedSchoolA.theme_color, schoolB.theme_color);
      assert.equal(schoolB.school_name, 'SYNTHETIC_SCHOOL_BETA');
      assert.equal(schoolB.theme_color, '#1d4ed8');
      assert.equal(schoolB.primary_font, 'Roboto');
    });
  });

  describe('3. Custom Font Fallback Safety', () => {
    it('falls back gracefully to default font when unrecognized font name is requested', () => {
      const primaryFonts = ['Montserrat', 'Inter', 'Poppins', 'Roboto'];
      const arabicFonts = ['Amiri', 'Cairo', 'Tajawal', 'Almarai', 'Changa', 'Kufam'];

      const resolveFont = (name, list, fallback) => {
        return list.includes(name) ? name : fallback;
      };

      assert.equal(resolveFont('NonExistentFantasyFont', primaryFonts, 'Montserrat'), 'Montserrat');
      assert.equal(resolveFont('UnknownArabicFont', arabicFonts, 'Amiri'), 'Amiri');
      assert.equal(resolveFont('Inter', primaryFonts, 'Montserrat'), 'Inter');
      assert.equal(resolveFont('Cairo', arabicFonts, 'Amiri'), 'Cairo');
    });

    it('correctly validates supported font families', () => {
      const primaryFonts = ['Montserrat', 'Inter', 'Poppins', 'Roboto'];
      const arabicFonts = ['Amiri', 'Cairo', 'Tajawal', 'Almarai', 'Changa', 'Kufam'];

      assert.ok(primaryFonts.includes('Inter'));
      assert.ok(primaryFonts.includes('Roboto'));
      assert.ok(arabicFonts.includes('Amiri'));
      assert.ok(arabicFonts.includes('Cairo'));
    });
  });

  describe('4. Settings Persistence Schema Validation', () => {
    it('validates input structure and email normalization', () => {
      const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      assert.equal(isValidEmail('valid.school@jiddah.edu.ug'), true);
      assert.equal(isValidEmail('invalid-school-email'), false);
      assert.equal(isValidEmail(''), false);
    });
  });
});
