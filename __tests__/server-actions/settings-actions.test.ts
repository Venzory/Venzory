/**
 * Settings Actions Tests
 * Tests server actions for practice settings, invites, and role changes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ForbiddenError,
  BusinessRuleViolationError,
  ValidationError,
} from '@/src/domain/errors';

// Create mock service functions using vi.hoisted to ensure they're available during mock setup
const { mockUpdatePracticeSettings, mockUpdateUserRole, mockCreateInvite } = vi.hoisted(() => ({
  mockUpdatePracticeSettings: vi.fn(),
  mockUpdateUserRole: vi.fn(),
  mockCreateInvite: vi.fn(),
}));

// Mock CSRF verification
vi.mock('@/lib/server-action-csrf', () => ({
  verifyCsrfFromHeaders: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock context builder
const mockBuildRequestContext = vi.fn();
vi.mock('@/src/lib/context/context-builder', () => ({
  buildRequestContext: () => mockBuildRequestContext(),
}));

// Mock settings service with stable references
vi.mock('@/src/services/settings', () => ({
  getSettingsService: () => ({
    updatePracticeSettings: mockUpdatePracticeSettings,
    updateUserRole: mockUpdateUserRole,
    createInvite: mockCreateInvite,
  }),
}));

// Import after mocks are set up
import {
  updatePracticeSettingsAction,
  inviteUserAction,
  updateUserRoleAction,
} from '@/app/(dashboard)/settings/actions';

describe('Settings Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset all mock functions
    mockUpdatePracticeSettings.mockReset();
    mockUpdateUserRole.mockReset();
    mockCreateInvite.mockReset();
    
    // Default mock context
    mockBuildRequestContext.mockResolvedValue({
      userId: 'test-user-id',
      practiceId: 'test-practice-id',
      role: 'ADMIN',
    });
  });

  describe('updatePracticeSettingsAction', () => {
    it('should return field-level errors when Zod validation fails', async () => {
      const formData = new FormData();
      formData.append('name', ''); // Invalid: empty name

      const result = await updatePracticeSettingsAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('name');
      expect(result.errors?.name).toContain('Practice name is required');
      expect(mockUpdatePracticeSettings).not.toHaveBeenCalled();
    });

    it('should return field-level errors for invalid email', async () => {
      const formData = new FormData();
      formData.append('name', 'Valid Practice Name');
      formData.append('contactEmail', 'invalid-email');

      const result = await updatePracticeSettingsAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('contactEmail');
      expect(mockUpdatePracticeSettings).not.toHaveBeenCalled();
    });

    it('should return field-level errors for invalid URL', async () => {
      const formData = new FormData();
      formData.append('name', 'Valid Practice Name');
      formData.append('logoUrl', 'not-a-url');

      const result = await updatePracticeSettingsAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('logoUrl');
      expect(mockUpdatePracticeSettings).not.toHaveBeenCalled();
    });

    it('should map ForbiddenError to error message', async () => {
      const formData = new FormData();
      formData.append('name', 'Valid Practice Name');

      mockUpdatePracticeSettings.mockRejectedValue(
        new ForbiddenError('Insufficient permissions')
      );

      const result = await updatePracticeSettingsAction(null, formData);

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Insufficient permissions');
      expect(result).not.toHaveProperty('errors');
    });

    it('should return success when update succeeds', async () => {
      const formData = new FormData();
      formData.append('name', 'Updated Practice');
      formData.append('city', 'New City');

      mockUpdatePracticeSettings.mockResolvedValue(undefined);

      const result = await updatePracticeSettingsAction(null, formData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Practice settings updated');
      expect(mockUpdatePracticeSettings).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Updated Practice',
          city: 'New City',
        })
      );
    });

    it('should handle null/empty optional fields correctly', async () => {
      const formData = new FormData();
      formData.append('name', 'Practice Name');
      formData.append('street', '');
      formData.append('contactEmail', '');
      formData.append('logoUrl', '');

      mockUpdatePracticeSettings.mockResolvedValue(undefined);

      const result = await updatePracticeSettingsAction(null, formData);

      expect(result).toHaveProperty('success');
      expect(mockUpdatePracticeSettings).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Practice Name',
          street: null,
          contactEmail: null,
          logoUrl: null,
        })
      );
    });
  });

  describe('inviteUserAction', () => {
    it('should return field-level errors when email is invalid', async () => {
      const formData = new FormData();
      formData.append('email', 'invalid-email');
      formData.append('role', 'STAFF');

      const result = await inviteUserAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('email');
      expect(mockCreateInvite).not.toHaveBeenCalled();
    });

    it('should return field-level errors when email is missing', async () => {
      const formData = new FormData();
      formData.append('role', 'STAFF');

      const result = await inviteUserAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('email');
      expect(mockCreateInvite).not.toHaveBeenCalled();
    });

    it('should map ForbiddenError to error message', async () => {
      const formData = new FormData();
      formData.append('email', 'user@example.com');
      formData.append('role', 'STAFF');

      mockCreateInvite.mockRejectedValue(
        new ForbiddenError('Only administrators can invite users')
      );

      const result = await inviteUserAction(null, formData);

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Only administrators can invite users');
      expect(result).not.toHaveProperty('errors');
    });

    it('should return success when invite is created', async () => {
      const formData = new FormData();
      formData.append('email', 'newuser@example.com');
      formData.append('role', 'STAFF');
      formData.append('name', 'New User');

      mockCreateInvite.mockResolvedValue({
        id: 'invite-id',
        email: 'newuser@example.com',
        role: 'STAFF',
      });

      const result = await inviteUserAction(null, formData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Invitation sent to newuser@example.com');
      expect(mockCreateInvite).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'newuser@example.com',
          role: 'STAFF',
          inviterName: 'New User',
        })
      );
    });

    it('should handle optional name field', async () => {
      const formData = new FormData();
      formData.append('email', 'user@example.com');
      formData.append('role', 'VIEWER');

      mockCreateInvite.mockResolvedValue({
        id: 'invite-id',
        email: 'user@example.com',
        role: 'VIEWER',
      });

      const result = await inviteUserAction(null, formData);

      expect(result).toHaveProperty('success');
      expect(mockCreateInvite).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'user@example.com',
          role: 'VIEWER',
          inviterName: null,
        })
      );
    });
  });

  describe('updateUserRoleAction', () => {
    it('should return field-level errors when validation fails', async () => {
      const formData = new FormData();
      formData.append('userId', 'invalid-id');
      formData.append('role', 'INVALID_ROLE');

      const result = await updateUserRoleAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(mockUpdateUserRole).not.toHaveBeenCalled();
    });

    it('should return field-level errors when userId is missing', async () => {
      const formData = new FormData();
      formData.append('role', 'STAFF');

      const result = await updateUserRoleAction(null, formData);

      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveProperty('userId');
      expect(mockUpdateUserRole).not.toHaveBeenCalled();
    });

    it('should map BusinessRuleViolationError for self-role change', async () => {
      const formData = new FormData();
      formData.append('userId', 'test-user-id');
      formData.append('role', 'STAFF');

      mockUpdateUserRole.mockRejectedValue(
        new BusinessRuleViolationError('Cannot change your own role')
      );

      const result = await updateUserRoleAction(null, formData);

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Cannot change your own role');
      expect(result).not.toHaveProperty('errors');
    });

    it('should map BusinessRuleViolationError for last admin demotion', async () => {
      const formData = new FormData();
      formData.append('userId', 'other-admin-id');
      formData.append('role', 'STAFF');

      mockUpdateUserRole.mockRejectedValue(
        new BusinessRuleViolationError('Cannot remove the last admin from the practice')
      );

      const result = await updateUserRoleAction(null, formData);

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Cannot remove the last admin from the practice');
      expect(result).not.toHaveProperty('errors');
    });

    it('should map ForbiddenError to error message', async () => {
      const formData = new FormData();
      formData.append('userId', 'other-user-id');
      formData.append('role', 'STAFF');

      mockUpdateUserRole.mockRejectedValue(
        new ForbiddenError('Insufficient permissions. Required: ADMIN, Has: STAFF')
      );

      const result = await updateUserRoleAction(null, formData);

      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Insufficient permissions. Required: ADMIN, Has: STAFF');
      expect(result).not.toHaveProperty('errors');
    });

    it('should return success when role is updated', async () => {
      const formData = new FormData();
      formData.append('userId', 'other-user-id');
      formData.append('role', 'ADMIN');

      mockUpdateUserRole.mockResolvedValue(undefined);

      const result = await updateUserRoleAction(null, formData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe('User role updated');
      expect(mockUpdateUserRole).toHaveBeenCalledWith(
        expect.anything(),
        'other-user-id',
        'ADMIN'
      );
    });

    it('should accept all valid role values', async () => {
      const roles = ['ADMIN', 'STAFF', 'VIEWER'];

      for (const role of roles) {
        vi.clearAllMocks();
        mockUpdateUserRole.mockResolvedValue(undefined);

        const formData = new FormData();
        formData.append('userId', 'user-id');
        formData.append('role', role);

        const result = await updateUserRoleAction(null, formData);

        expect(result).toHaveProperty('success');
        expect(mockUpdateUserRole).toHaveBeenCalledWith(
          expect.anything(),
          'user-id',
          role
        );
      }
    });
  });
});

