'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircularMarkRow, TheologyMarkRow } from '@/types/models';

export interface MarksSheetResponse {
  circular_marks?: CircularMarkRow[];
  theology_marks?: TheologyMarkRow[];
}

export interface UseMarksOptions {
  enrollmentId: string;
  termId: string;
  scoreType?: string;
  enabled?: boolean;
}

export function useMarks(options: UseMarksOptions) {
  const { enrollmentId, termId, scoreType = 'both', enabled = true } = options;

  return useQuery<MarksSheetResponse, Error>({
    queryKey: ['marks', { enrollmentId, termId, scoreType }],
    queryFn: async () => {
      if (!enrollmentId || !termId) {
        return { circular_marks: [], theology_marks: [] };
      }

      const params = new URLSearchParams({
        enrollment_id: enrollmentId,
        term_id: termId,
        score_type: scoreType,
      });

      const res = await fetch(`/api/marks?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch student marks');
      }

      return res.json();
    },
    enabled: Boolean(enrollmentId && termId && enabled),
    staleTime: 30 * 1000,
  });
}

export interface SaveMarksPayload {
  enrollment_id: string;
  term_id: string;
  circular_marks?: Array<{
    subject_id: string;
    bot_score?: number | null;
    mot_score?: number | null;
    eot_score?: number | null;
  }>;
  theology_marks?: Array<{
    subject_id: string;
    mot_score?: number | null;
    eot_score?: number | null;
  }>;
}

export function useSaveMarks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveMarksPayload) => {
      const res = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save marks');
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marks', { enrollmentId: variables.enrollment_id, termId: variables.term_id }],
      });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
