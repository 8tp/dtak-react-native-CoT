import RNFS from 'react-native-fs';
import path from 'path';
import test from 'tape';
import { Basemap } from '../index.js';

// React Native compatible fs wrapper
const fs = {
    readFile: async (filePath: string): Promise<Buffer> => {
        const content = await RNFS.readFile(filePath, 'utf8');
        return Buffer.from(content, 'utf8');
    },
    readdir: async (dirPath: string): Promise<string[]> => {
        const result = await RNFS.readDir(dirPath);
        return result.map(item => item.name);
    }
};

// React Native compatible directory resolution - you'd need to bundle these files
const basemapsDir = './test/basemaps/'; // This would need to be adjusted based on your React Native setup

for (const fixturename of await fs.readdir(basemapsDir)) {
    test(`Basemap Test: ${fixturename}`, async (t) => {
        const fixturePath = path.join(basemapsDir, fixturename);
        const fixture = String(await fs.readFile(fixturePath));
        const container = await Basemap.parse(fixture);

        t.ok(container.raw.customMapSource.name._text.length)

        const json = container.to_json();
        t.ok(json.name && json.name.length);

        t.end();
    });
}
