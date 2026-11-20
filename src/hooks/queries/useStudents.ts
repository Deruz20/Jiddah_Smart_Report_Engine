'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StudentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StudentRecord {
  id: string;
  name: string;
  admission_number: string;
  created_at: string;
  circular_class: string;
  circular_class_id?: string | null;
  section: string | null;
  theology_class_arabic: string | null;
  theology_class_english: string | null;
  theology_class_id?: string | null;
  academic_year: string;
  status: 'Nursery' | 'Primary' | 'Theology';
  is_theology_enrolled?: boolean;
  gender?: string | null;
  is_archived?: boolean;
  is_muslim?: boolean;
  arabic_name?: string | null;
}

export interface UseStudentsOptions {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  status?: string;
  archived?: boolean | 'all';
  initialData?: { data: StudentRecord[]; pagination: StudentPagination };
  enabled?: boolean;
}

export interface StudentsResponse {
  data: StudentRecord[];
  pagination: StudentPagination;
}

export function useStudents(options: UseStudentsOptions = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    classId = 'all',
    status = 'All',
    archived = false,
    initialData,
    enabled = true,
  } = options;

  return useQuery<StudentsResponse, Error>({
    queryKey: ['students', { page, limit, search, classId, status, archived }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.set('search', search.trim());
      if (classId && classId !== 'all') params.set('class_id', classId);
      if (status && status !== 'All') params.set('status', status);
      if (archived === 'all') params.set('archived', 'all');
      else if (archived) params.set('archived', 'true');
      else params.set('archived', 'false');

      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch students');
      }

      const json = await res.json();
      if (Array.isArray(json)) {
        return {
          data: json,
          pagination: {
            page,
            limit,
            total: json.length,
            totalPages: Math.max(1, Math.ceil(json.length / limit)),
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
      return json;
    },
    initialData,
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useArchiveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to archive student');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      const res = await fetch(`/api/students/${studentId}?hard_delete=true`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete student permanently');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}
