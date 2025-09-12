// Vitest setup file
// This file is run before all tests

// Global test setup for Vitest
import { vi } from 'vitest';

// Mock uuid module
vi.mock('uuid', () => ({
    v4: vi.fn(() => '12345678-1234-1234-1234-123456789abc'),
    default: {
        v4: vi.fn(() => '12345678-1234-1234-1234-123456789abc')
    }
}));

// Mock react-native-fs globally
vi.mock('react-native-fs');
vi.mock('@openaddresses/batch-error');
vi.mock('@orbat-mapper/convert-symbology');
