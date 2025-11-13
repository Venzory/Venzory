/**
 * Shared form state type for server actions
 * 
 * Provides a consistent structure for form validation errors:
 * - success: Success message to display
 * - error: Form-level or server error message
 * - errors: Field-level validation errors from Zod (key = field name, value = array of error messages)
 */
export type FormState = {
  success?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

