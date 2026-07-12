import { z } from 'zod'

const noAngleBrackets = /^(?!.*[<>]).*$/

export const studentFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').regex(noAngleBrackets, 'Invalid characters'),
  admissionNumber: z.string().trim().min(1, 'Admission number required').max(50, 'Admission number too long').regex(/^[A-Za-z0-9\-_.]+$/, 'Invalid admission number'),
  classId: z.string().uuid('Invalid class id'),
  theologyClassId: z.string().uuid('Invalid theology class id').optional(),
  academicYear: z.number().int().min(2000).max(2100),
})

export const marksEntrySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment id'),
  termId: z.string().uuid('Invalid term id'),
  score: z.number().min(0, 'Score must be at least 0').max(100, 'Score must be at most 100'),
})

export const teacherFormSchema = z.object({
  full_name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100).regex(/^[a-zA-Z\s\-'.]+$/, 'Name contains invalid characters'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.enum(['Head Teacher', 'Class Teacher', 'Theology Instructor', 'Deputy Head Teacher', 'Support Staff']),
  subject_specialization: z.string().trim().max(100).optional().or(z.literal('')),
  class_assigned: z.string().trim().max(20).optional().or(z.literal('')),
})

export const loginFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signUpFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100, 'Name too long').regex(noAngleBrackets, 'Invalid characters'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm your password'),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Passwords must match',
    })
  }
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const accountProfileSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[A-Za-z\s\-]+$/, 'Name may only contain letters, spaces, and hyphens'),
  phone: z.string().trim().regex(/^(?:$|[+\d\s\-()]{7,20})$/, 'Invalid phone number'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
}).superRefine(({ newPassword, confirmPassword }, ctx) => {
  if (newPassword !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Passwords must match',
    })
  }
})

export const schoolSettingsSchema = z.object({
  school_name: z.string().trim().min(3, 'School name must be at least 3 characters').max(200, 'School name too long'),
  address: z.string().trim().max(300).optional(),
  district: z.string().trim().max(100).optional(),
  phone_1: z.string().trim().regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  phone_2: z.string().trim().regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  pay_code: z.string().trim().max(50).optional(),
  current_term: z.enum(['Term 1', 'Term 2', 'Term 3']),
  current_year: z.number().int().min(2020, 'Current year must be between 2020 and 2035').max(2035, 'Current year must be between 2020 and 2035'),
  motto: z.string().trim().max(200, 'Motto too long').optional(),
})

export const userProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone: z.string().trim().regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
})

export type StudentForm = z.infer<typeof studentFormSchema>
export type MarksEntry = z.infer<typeof marksEntrySchema>
export type TeacherForm = z.infer<typeof teacherFormSchema>
export type LoginForm = z.infer<typeof loginFormSchema>
export type SignUpForm = z.infer<typeof signUpFormSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
export type AccountProfileForm = z.infer<typeof accountProfileSchema>
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>
export type SchoolSettingsForm = z.infer<typeof schoolSettingsSchema>
export type UserProfileForm = z.infer<typeof userProfileSchema>
