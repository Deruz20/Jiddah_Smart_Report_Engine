'use client';

import { useQuery } from '@tanstack/react-query';
import { EnrollmentData } from '@/types/models';

export interface EnrollmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface EnrollmentsResponse {
  data: EnrollmentData[];
  pagination?: EnrollmentPagination;
}

export interface UseEnrollmentsOptions {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  enabled?: boolean;
}

export function useEnrollments(options: UseEnrollmentsOptions = {}) {
  const { page, limit, search, classId, enabled = true } = options;

  return useQuery<EnrollmentsResponse, Error>({
    queryKey: ['enrollments', { page, limit, search, classId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (page !== undefined) params.set('page', String(page));
      if (limit !== undefined) params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (classId) params.set('class_id', classId);

      const queryString = params.toString();
      const url = `/api/enrollments${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch enrollments');
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        return { data: json };
      }
      return json;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
