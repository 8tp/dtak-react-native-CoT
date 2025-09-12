import { describe, test, expect } from 'vitest';
import Util from '../lib/utils/util.js';

describe('Util.cot_date', () => {
    test('default behavior', () => {
        const res = Util.cot_date();

        // Within 100ms of current time
        expect(+new Date(res.time)).toBeGreaterThan(+new Date() - 100);

        // res.start is the same as res.time
        expect(+new Date(res.start)).toBe(+new Date(res.time));

        // Approx 20s ahead of start
        expect(+new Date(res.stale)).toBeGreaterThan(+new Date(res.start) + 20 * 1000 - 100);
        expect(+new Date(res.stale)).toBeLessThan(+new Date(res.start) + 20 * 1000 + 100);
    });

    test('with custom stale time', () => {
        const res = Util.cot_date(null, null, 1000);

        // Within 100ms of current time
        expect(+new Date(res.time)).toBeGreaterThan(+new Date() - 100);

        // res.start is the same as res.time
        expect(+new Date(res.start)).toBe(+new Date(res.time));

        // Approx 1s ahead of start
        expect(+new Date(res.stale)).toBeGreaterThan(+new Date(res.start) + 1 * 1000 - 100);
        expect(+new Date(res.stale)).toBeLessThan(+new Date(res.start) + 1 * 1000 + 100);
    });
});
