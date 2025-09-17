import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, test, expect } from 'vitest';
import { Basemap } from '../index.js';
import { fileURLToPath } from 'node:url';

for (const fixturename of await fs.readdir(new URL('./basemaps/', import.meta.url))) {
    describe('Basemap Tests', () => {
        test(`Basemap Test: ${fixturename}`, async () => {
            const fixture = String(await fs.readFile(path.join(path.parse(fileURLToPath(import.meta.url)).dir, 'basemaps/', fixturename)));
            const container = await Basemap.parse(fixture);

            expect(container.raw.customMapSource.name._text.length).toBeGreaterThan(0);

            const json = container.to_json();
            expect(json.name).toBeDefined();
            if (json.name) {
                expect(json.name.length).toBeGreaterThan(0);
            }
        });
    });
}
