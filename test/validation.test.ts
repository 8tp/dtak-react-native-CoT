import { describe, test, expect } from 'vitest';
import { CoTParser } from '../index.js';

describe('Validation', () => {
    test('await CoTParser.from_xml - Invalid', async () => {
        await expect(async () => {
            await CoTParser.from_xml('<not-cot-xml test="1"/>');
        }).rejects.toThrow(/Cannot read properties of undefined/);
    });
});
