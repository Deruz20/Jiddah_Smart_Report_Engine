// This is a unit test file for testing the student CRUD and Soft Delete APIs.
// To run this test, a test runner like Jest or Vitest needs to be configured in the project.

import { NextRequest } from 'next/server';
import { PUT, DELETE, PATCH } from '../app/api/students/[id]/route';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/auth-server', () => ({
  verifyDataAccess: jest.fn().mockResolvedValue({ isAuthorized: true }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({})),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin' } }, error: null }),
  },
  from: jest.fn(),
};

describe('Student CRUD API', () => {
  let req: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    const { createClient } = require('@/utils/supabase/server');
    createClient.mockReturnValue(mockSupabase);
    
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'e1', circular_class_id: 'c1', theology_class_id: 't1', academic_year: 2024 },
        error: null
      }),
    });
  });

  it('Test 1: Editing basic student fields updates the students table correctly', async () => {
    req = new NextRequest('http://localhost/api/students/1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Updated Name',
        arabic_name: 'اسم محدث',
        admission_number: 'ADM001',
        circular_class_id: 'c1',
        theology_class_id: 't1',
        religion: 'Muslim'
      }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    
    // Verify students table was updated
    expect(mockSupabase.from).toHaveBeenCalledWith('students');
    expect(mockSupabase.from('students').update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Updated Name',
      arabic_name: 'اسم محدث',
      admission_number: 'ADM001',
      is_muslim: true,
    }));
  });

  it('Test 2: Editing a student class creates a new enrollments record', async () => {
    req = new NextRequest('http://localhost/api/students/1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Name',
        admission_number: 'ADM001',
        circular_class_id: 'c2', // Changed class
        theology_class_id: 't1',
        religion: 'Muslim'
      }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    // Verify old enrollment marked inactive
    expect(mockSupabase.from('enrollments').update).toHaveBeenCalledWith({ is_active: false });
    expect(mockSupabase.from('enrollments').update().eq).toHaveBeenCalledWith('id', 'e1');

    // Verify new enrollment inserted
    expect(mockSupabase.from('enrollments').insert).toHaveBeenCalledWith([{
      student_id: '1',
      circular_class_id: 'c2',
      theology_class_id: 't1',
      academic_year: 2024,
      is_active: true,
    }]);
  });

  it('Test 3: Archiving a student successfully sets is_archived = true', async () => {
    req = new NextRequest('http://localhost/api/students/1', { method: 'DELETE' });

    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    expect(mockSupabase.from('students').update).toHaveBeenCalledWith({ is_archived: true });
    expect(mockSupabase.from('students').update().eq).toHaveBeenCalledWith('id', '1');
  });

  it('Test 4: Restoring a student sets is_archived = false', async () => {
    req = new NextRequest('http://localhost/api/students/1', {
      method: 'PATCH',
      body: JSON.stringify({ is_archived: false })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    expect(mockSupabase.from('students').update).toHaveBeenCalledWith({ is_archived: false });
  });
});
