// Vitest setup file
// This file is run before all tests

// Global test setup for Vitest
import { vi, afterAll } from 'vitest';

// Mock react-native-fs globally
vi.mock('react-native-fs');

afterAll(async () => {
  
});