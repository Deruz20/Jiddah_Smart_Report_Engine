'use client';

import { useQuery } from '@tanstack/react-query';

export interface AnalyticsSummaryKpis {
  schoolAverage: number;
  passRate: number;
  topPerformer: string;
  needsAttention: string;
  totalScoresCount?: number;
}

export interface AnalyticsDashboardResponse {
  summaryKpis?: AnalyticsSummaryKpis;
  termPerformance: Array<{ term: string; average: number; highest: number; lowest: number }>;
  classPerformance: Array<{ class: string; avg: number }>;
  subjectPerformance: Array<{ subject: string; avg: number }>;
  attendanceTrend: Array<{ month: string; rate: number }>;
  gradeDistribution: Array<{ grade: string; count: number; fill: string }>;
}

export function useAnalyticsDashboard(options: { termId?: string; enabled?: boolean } = {}) {
  const { termId, enabled = true } = options;

  return useQuery<AnalyticsDashboardResponse, Error>({
    queryKey: ['analytics', 'dashboard', { termId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (termId) params.set('term_id', termId);

      const qs = params.toString();
      const res = await fetch(`/api/analytics/dashboard${qs ? `?${qs}` : ''}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch analytics dashboard');
      }
      return res.json();
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
