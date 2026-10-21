'use client';

import React, { useEffect, useState } from 'react';
import {
  computeConfigurableRankings,
  RankingPreferences,
  RankingMethod,
  RankingBasis,
  RankingTiebreak,
  StudentRecord,
} from '@/lib/ranking';
import { Award, Info, Save, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RankingSettingsPreviewProps {
  initialPreferences?: RankingPreferences;
  onPreferencesChange?: (prefs: RankingPreferences) => void;
  isStandalone?: boolean;
}

const SAMPLE_STUDENTS: StudentRecord[] = [
  { id: '1', no: 1, name: 'Farouk Ssemakula', english: 90, math: 96, total: 385, average: 96.2, aggregate: 4 },
  { id: '2', no: 2, name: 'Amina Nakato', english: 92, math: 90, total: 370, average: 92.5, aggregate: 6 },
  { id: '3', no: 3, name: 'Ibrahim Lwanga', english: 88, math: 94, total: 370, average: 92.5, aggregate: 6 },
  { id: '4', no: 4, name: 'Zahra Nabirye', english: 84, math: 86, total: 350, average: 87.5, aggregate: 8 },
];

export const RankingSettingsPreview: React.FC<RankingSettingsPreviewProps> = ({
  initialPreferences,
  onPreferencesChange,
  isStandalone = false,
}) => {
  const [preferences, setPreferences] = useState<RankingPreferences>({
    method: initialPreferences?.method || 'standard',
    basis: initialPreferences?.basis || 'total_score',
    scope: initialPreferences?.scope || 'class',
    tiebreak: initialPreferences?.tiebreak || 'none',
    show_rank: initialPreferences?.show_rank ?? true,
  });
  const [savingRanking, setSavingRanking] = useState(false);
  const [savedRanking, setSavedRanking] = useState(false);

  useEffect(() => {
    if (initialPreferences) {
      setPreferences({
        method: initialPreferences.method || 'standard',
        basis: initialPreferences.basis || 'total_score',
        scope: initialPreferences.scope || 'class',
        tiebreak: initialPreferences.tiebreak || 'none',
        show_rank: initialPreferences.show_rank ?? true,
      });
    }
  }, [initialPreferences]);

  const updatePreference = <K extends keyof RankingPreferences>(
    key: K,
    value: RankingPreferences[K]
  ) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    if (onPreferencesChange) {
      onPreferencesChange(updated);
    }
  };

  const handleSaveRankingPreferences = async () => {
    setSavingRanking(true);
    try {
      const res = await fetch('/api/settings/school', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranking_preferences: preferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save ranking preferences');
      setSavedRanking(true);
      toast.success('Ranking preferences saved to backend');
      setTimeout(() => setSavedRanking(false), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Unable to save ranking preferences');
    } finally {
      setSavingRanking(false);
    }
  };

  const rankedStudents = computeConfigurableRankings(SAMPLE_STUDENTS, preferences);

  return (
    <div className={`space-y-6 ${isStandalone ? 'p-6 bg-white rounded-2xl border border-stone-200 shadow-sm' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Award className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-stone-900">Class & Term Ranking Preferences</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              Live Interactive Preview
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Configure how report cards calculate and display student standings. Default is Ugandan standard (1, 2, 2, 4).
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveRankingPreferences}
          disabled={savingRanking}
          className="min-h-[44px] px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
        >
          {savingRanking ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : savedRanking ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{savingRanking ? 'Saving...' : savedRanking ? 'Saved' : 'Save Ranking Rules'}</span>
        </button>
      </div>

      {/* Control selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Method */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Ranking Method
          </label>
          <select
            value={preferences.method}
            onChange={(e) => updatePreference('method', e.target.value as RankingMethod)}
            className="w-full min-h-[44px] text-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-emerald-700 focus:bg-white transition"
          >
            <option value="standard">Standard (1, 2, 2, 4) — Official UNEB</option>
            <option value="dense">Dense (1, 2, 2, 3) — No Skips</option>
            <option value="ordinal">Ordinal (1, 2, 3, 4) — Strict Sequential</option>
            <option value="fractional">Fractional (1, 2.5, 2.5, 4) — Equal Split</option>
          </select>
          <p className="text-[11px] text-stone-500">
            {preferences.method === 'standard' && 'Default: Skips ranks after tied positions.'}
            {preferences.method === 'dense' && 'Next distinct score receives the immediate next rank.'}
            {preferences.method === 'ordinal' && 'Every student receives a distinct integer position.'}
            {preferences.method === 'fractional' && 'Tied pupils share the arithmetic mean of tied ranks.'}
          </p>
        </div>

        {/* Basis */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Ranking Basis
          </label>
          <select
            value={preferences.basis}
            onChange={(e) => updatePreference('basis', e.target.value as RankingBasis)}
            className="w-full min-h-[44px] text-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-emerald-700 focus:bg-white transition"
          >
            <option value="total_score">Total Marks (Desc)</option>
            <option value="average">Percentage Average (Desc)</option>
            <option value="aggregates">UNEB Aggregates (Asc: 4 is Top)</option>
          </select>
          <p className="text-[11px] text-stone-500">
            Metric evaluated to determine standing.
          </p>
        </div>

        {/* Tiebreak */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Tiebreak Rule
          </label>
          <select
            value={preferences.tiebreak}
            onChange={(e) => updatePreference('tiebreak', e.target.value as RankingTiebreak)}
            className="w-full min-h-[44px] text-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:border-emerald-700 focus:bg-white transition"
          >
            <option value="none">None (Share Equal Position)</option>
            <option value="english">Higher English Score Breaks Tie</option>
            <option value="math">Higher Math Score Breaks Tie</option>
            <option value="alphabetical">Alphabetical (A to Z)</option>
          </select>
          <p className="text-[11px] text-stone-500">
            Secondary sorting criteria when scores match.
          </p>
        </div>

        {/* Show or Hide Rank */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Report Visibility
          </label>
          <div className="flex items-center gap-3 pt-1 min-h-[44px]">
            <button
              type="button"
              onClick={() => updatePreference('show_rank', !preferences.show_rank)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                preferences.show_rank ? 'bg-emerald-700' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferences.show_rank ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-stone-700">
              {preferences.show_rank ? 'Show Rank on Reports' : 'Hide Rank (Show "-")'}
            </span>
          </div>
          <p className="text-[11px] text-stone-500">
            {preferences.show_rank
              ? 'Positions are printed on student report cards.'
              : 'Positions suppressed on report cards to protect student well-being.'}
          </p>
        </div>
      </div>

      {/* Live Table Preview */}
      <div className="rounded-xl border border-stone-200 overflow-x-auto bg-white shadow-sm">
        <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Sample Class Ranking Ledger (Notice Tied Students)
            </span>
          </div>
          <span className="text-[11px] text-stone-500 font-mono tabular-nums">
            Method: {preferences.method} | Basis: {preferences.basis} | Tiebreak: {preferences.tiebreak}
          </span>
        </div>

        <table className="w-full text-left text-xs text-stone-700 tabular-nums">
          <thead className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-2.5 w-16 text-center">Rank</th>
              <th className="px-4 py-2.5">Student Name</th>
              <th className="px-4 py-2.5 text-center">Total Marks</th>
              <th className="px-4 py-2.5 text-center">Average</th>
              <th className="px-4 py-2.5 text-center">English</th>
              <th className="px-4 py-2.5 text-center">Math</th>
              <th className="px-4 py-2.5 text-center">Aggregate</th>
              <th className="px-4 py-2.5">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rankedStudents.map((st) => {
              const isTied = rankedStudents.filter((other) => other.total === st.total).length > 1;
              return (
                <tr
                  key={st.id}
                  className={`transition-colors ${
                    isTied ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-stone-50'
                  }`}
                >
                  <td className="px-4 py-2.5 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                        st.rank === 1
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isTied
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      {st.rank}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-stone-900 flex items-center gap-2">
                    <span>{st.name}</span>
                    {isTied && (
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1 rounded font-medium">
                        Tied (370)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold">{st.total}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{st.average}%</td>
                  <td className="px-4 py-2.5 text-center font-mono">{st.english}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{st.math}</td>
                  <td className="px-4 py-2.5 text-center font-mono">Agg {st.aggregate}</td>
                  <td className="px-4 py-2.5 text-[11px] text-stone-500">
                    {st.rank === 1 && 'Top pupil'}
                    {isTied && preferences.tiebreak === 'english' && st.english === 92 && 'Wins tie on English mark (92 vs 88)'}
                    {isTied && preferences.tiebreak === 'english' && st.english === 88 && 'Ranked 3rd due to lower English mark'}
                    {isTied && preferences.tiebreak === 'none' && preferences.method === 'standard' && 'Shared 2nd position (4th comes next)'}
                    {isTied && preferences.tiebreak === 'none' && preferences.method === 'dense' && 'Shared 2nd position (3rd comes next)'}
                    {isTied && preferences.tiebreak === 'none' && preferences.method === 'fractional' && 'Split rank: (2 + 3) ÷ 2 = 2.5'}
                    {!isTied && st.rank !== 1 && 'Distinct position'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-start gap-2.5 text-xs text-stone-600">
        <Info className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Owner Decision Parity Rule:</strong> The default configuration strictly remains Standard (1, 2, 2, 4) with Total Score basis and no tiebreak. Custom ranking preferences are saved to the school settings backend.
        </p>
      </div>
    </div>
  );
};
