/**
 * Location Repository Smoke Tests
 * Basic tests to verify the location repository methods exist and have correct signatures
 */

import { describe, it, expect } from 'vitest';
import { LocationRepository } from '@/src/repositories/locations';
import { BusinessRuleViolationError, ValidationError } from '@/src/domain/errors';

describe('LocationRepository - Smoke Tests', () => {
  it('should have all required methods', () => {
    const repository = new LocationRepository();
    
    expect(repository.findLocations).toBeDefined();
    expect(repository.findLocationById).toBeDefined();
    expect(repository.createLocation).toBeDefined();
    expect(repository.updateLocation).toBeDefined();
    expect(repository.deleteLocation).toBeDefined();
    expect(repository.getLocationUsage).toBeDefined();
  });

  it('should export BusinessRuleViolationError for safe deletion', () => {
    expect(BusinessRuleViolationError).toBeDefined();
    const error = new BusinessRuleViolationError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('BusinessRuleViolationError');
  });

  it('should export ValidationError for hierarchy validation', () => {
    expect(ValidationError).toBeDefined();
    const error = new ValidationError('Test validation error');
    expect(error.message).toBe('Test validation error');
    expect(error.name).toBe('ValidationError');
  });
});

