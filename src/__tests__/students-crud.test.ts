// This is a unit test file for testing the student CRUD and Soft Delete APIs.
// To run this test, a test runner like Jest or Vitest needs to be configured in the project.

import { NextRequest } from 'next/server';
import { PUT, DELETE, PATCH } from '../app/api/students/[id]/route';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
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

jest.mock("@/lib/auth-server", () => ({
  verifyDataAccess: jest.fn().mockResolvedValue({ isAuthorized: true, role: "Administrator" }),
}));

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

import { GET as getEnrollments } from '../app/api/enrollments/route';
import { GET as getReports } from '../app/api/reports/route';

describe('Student soft delete hiding from views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { createClient } = require('@/utils/supabase/server');
    createClient.mockReturnValue(mockSupabase);

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('Test 5: GET /api/enrollments applies is_archived = false filter', async () => {
    const req = new NextRequest('http://localhost/api/enrollments');
    await getEnrollments(req);

    expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');
    expect(mockSupabase.from().select).toHaveBeenCalled();
    expect(mockSupabase.from().eq).toHaveBeenCalledWith('is_active', true);
    expect(mockSupabase.from().eq).toHaveBeenCalledWith('students.is_archived', false);
  });

  it('Test 6: GET /api/reports allows fetching historical marks for archived students', async () => {
    const req = new NextRequest('http://localhost/api/reports?student_id=1&term_id=1');

    // Setup specific mock for reports logic
    const studentSelectMock = jest.fn().mockReturnThis();
    const studentEqMock = jest.fn().mockReturnThis();
    const studentLimitMock = jest.fn().mockResolvedValue({
      data: [{ id: '1', class_name: 'P.1', enrollments: [{ theology_class_id: null }] }],
      error: null
    });

    // Just verifying that it queries 'students' with the correct ID, and does NOT filter by is_archived
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'students') {
        return {
          select: studentSelectMock,
          eq: studentEqMock,
          limit: studentLimitMock,
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });

    // Run the API
    try {
        await getReports(req);
    } catch(e) {}

    expect(mockSupabase.from).toHaveBeenCalledWith('students');
    expect(studentEqMock).toHaveBeenCalledWith('id', '1');
    expect(studentEqMock).toHaveBeenCalledWith('enrollments.is_active', true);
    // Ensure it did NOT get called with is_archived
    expect(studentEqMock).not.toHaveBeenCalledWith('is_archived', false);
    expect(studentEqMock).not.toHaveBeenCalledWith('students.is_archived', false);
  });
});
