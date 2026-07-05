import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api/client';

export function useTheologyData() {
  const [marks, setMarks] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [marksRes, termsRes, activeTermRes, enrollmentsRes, subjectsRes] = await Promise.all([
        api.get('/theology-marks'),
        api.get('/terms'),
        api.get('/settings/terms/active'),
        api.get('/enrollments').catch(() => ({ data: [] })), 
        api.get('/theology-subjects').catch(() => []),
      ]);

      setMarks(marksRes.data || []);
      setTerms(termsRes.data || []);
      setActiveTerm(activeTermRes.data || null);
      setEnrollments(Array.isArray(enrollmentsRes) ? enrollmentsRes : (enrollmentsRes as any).data || []);
      setSubjects(Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes as any).data || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { marks, enrollments, subjects, terms, activeTerm, loading, error, refetch: fetchData };
}
