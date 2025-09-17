import type { Static } from '@sinclair/typebox';
import type { Feature } from '../lib/types/feature.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, test, expect } from 'vitest';
import { CoTParser } from '../index.js';
import { fileURLToPath } from 'node:url';

for (const fixturename of await fs.readdir(new URL('./fixtures/', import.meta.url))) {
    describe('GeoJSON Reversal Tests', () => {
        test(`GeoJSON Reversal Tests: ${fixturename}`, async () => {
            const fixture: Static<typeof Feature> = JSON.parse(String(await fs.readFile(path.join(path.parse(fileURLToPath(import.meta.url)).dir, 'fixtures/', fixturename))));
            const geo = await CoTParser.from_geojson(fixture)
            const output = await CoTParser.to_geojson(geo);

            expect(output).toEqual(fixture);
        });
    });
}
