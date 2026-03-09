import * as nodefs from 'fs';
import path from 'path';
import { Basemap } from '../index.js';

const basemapsDir = path.join(__dirname, 'basemaps');

const fixtureFiles = nodefs.readdirSync(basemapsDir);

for (const fixturename of fixtureFiles) {
    test(`Basemap Test: ${fixturename}`, async () => {
        const fixturePath = path.join(basemapsDir, fixturename);
        const fixture = nodefs.readFileSync(fixturePath, 'utf8');
        const container = Basemap.parse(fixture);

        expect(container.raw.customMapSource.name._text.length).toBeTruthy()

        const json = container.to_json();
        expect(json.name && json.name.length).toBeTruthy();
    });
}
