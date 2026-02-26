import { DataPackage, CoTParser } from '../index.js'
import path from 'path';

test(`DataPackage CoT Parsing: CameraCOTs.zip`, async () => {
    const packagePath = path.join(__dirname, 'packages', 'CameraCOTs.zip');
    const pkg = await DataPackage.parse(packagePath, {
        cleanup: false
    });

    expect(pkg.version).toBe('2');
    expect(pkg.path).toBeTruthy();
    expect(pkg.settings).toEqual({
        uid: 'fd4310f2-e34a-455d-b1c2-15c06b740a04',
        name: '2024 streaming cameras - not for iTAK'
    });

    expect(pkg.contents).toEqual([
        {
            _attributes: { ignore: false, zipEntry: '3ecf1e30-f374-4ae6-a051-2da7084ff57d/3ecf1e30-f374-4ae6-a051-2da7084ff57d.cot' },
            Parameter: { _attributes: { name: 'uid', value: '3ecf1e30-f374-4ae6-a051-2da7084ff57d' } }
        }
    ]);

    const cots = await pkg.cots();
    expect(cots.length).toBe(1);

    const attachments = await pkg.attachments();
    expect(attachments.size).toBe(0)

    const files = await pkg.files();
    expect(files.size).toBe(0)

    await pkg.destroy();

});

// Skipped: requires zip archive creation (not yet implemented for React Native)
test.skip(`DataPackage CoT Writing`, () => {});
test.skip(`DataPackage CoT Writing (duplicate)`, () => {});

test(`DataPackage CoT Parsing: QuickPic.zip`, async () => {
    const pkg = await DataPackage.parse(path.join(__dirname, 'packages', 'QuickPic.zip'), {
        cleanup: false
    });

    expect(await DataPackage.hash(path.join(__dirname, 'packages', 'QuickPic.zip'))).toBe('bd13db0f18ccb423833cc21c0678e0224dd15ff504c1f16c43aff03e216b82a7');

    expect(pkg.version).toBe('2');
    expect(pkg.path).toBeTruthy();
    expect(pkg.settings).toEqual({
        uid: '3b758d3c-5b7a-4fba-a0dc-bbde18e895b5',
        name: '20240702_144514.jpg',
        onReceiveImport: true,
        onReceiveDelete: true,
        callsign: 'DFPC Ingalls.2.144535'
    });

    expect(pkg.contents).toEqual([
        {
            _attributes: { ignore: false, zipEntry: '3b758d3c-5b7a-4fba-a0dc-bbde18e895b5/3b758d3c-5b7a-4fba-a0dc-bbde18e895b5.cot' },
            Parameter: { _attributes: { name: 'uid', value: '3b758d3c-5b7a-4fba-a0dc-bbde18e895b5' } }
        }, {
            _attributes: { ignore: false, zipEntry: 'e63e920689815c961ec9d873c83f08a6/20240702_144514.jpg' },
            Parameter: { _attributes: { name: 'uid', value: '3b758d3c-5b7a-4fba-a0dc-bbde18e895b5' } }
        }
    ]);

    const cots = await pkg.cots();
    expect(cots.length).toBe(1);

    const attachments = await pkg.attachments();
    expect(attachments.size).toBe(1)

    const files = await pkg.files();
    expect(files.size).toBe(0)

    expect(attachments.get('3b758d3c-5b7a-4fba-a0dc-bbde18e895b5')).toEqual([{
        _attributes: { ignore: false, zipEntry: 'e63e920689815c961ec9d873c83f08a6/20240702_144514.jpg' },
        Parameter: { _attributes: { name: 'uid', value: '3b758d3c-5b7a-4fba-a0dc-bbde18e895b5' } }
    }]);

    await pkg.destroy();

});

// Skipped: requires Node.js streams (createReadStream not available in React Native)
test.skip(`DataPackage CoT Parsing: addFile,getFile`, () => {});

test(`DataPackage CoT Parsing: AttachmentInManifest.zip`, async () => {
    const pkg = await DataPackage.parse(path.join(__dirname, 'packages', 'AttachmentInManifest.zip'), {
        cleanup: false
    });

    expect(await DataPackage.hash(path.join(__dirname, 'packages', 'AttachmentInManifest.zip'))).toBe('313127964ac117dfbe6d64bb8a0832182593348692df3b8f9f9448d9f91c289e');

    expect(pkg.version).toBe('2');
    expect(pkg.path).toBeTruthy();
    expect(pkg.settings).toEqual({
        uid: 'c7f90966-f048-41fd-8951-70cd9a380cd2',
        name: '1000001544.jpg',
        onReceiveImport: true,
        onReceiveDelete: true,
        callsign: 'excl 1'
    });

    expect(pkg.contents).toEqual([
        {
            _attributes: { ignore: false, zipEntry: 'c7f90966-f048-41fd-8951-70cd9a380cd2/c7f90966-f048-41fd-8951-70cd9a380cd2.cot' },
            Parameter: { _attributes: { name: 'uid', value: 'c7f90966-f048-41fd-8951-70cd9a380cd2' } }
        }, {
            _attributes: { ignore: false, zipEntry: '6988443373b26e519cfd1096665b8eaa/1000001544.jpg' },
            Parameter: { _attributes: { name: 'uid', value: 'c7f90966-f048-41fd-8951-70cd9a380cd2' } }
        }
    ]);

    const cots = await pkg.cots();

    expect(cots.length).toBe(1);

    if (!cots[0].raw.event.detail) throw new Error('Detail field not set');

    expect(
        cots[0].raw.event.detail.attachment_list
    ).toEqual(
        { _attributes: { hashes: '["3adefc8c1935166d3e501844549776c6fc21cc6d72f371fdda23788e6ec7181d"]' } }
    )

    const attachments = await pkg.attachments();
    expect(attachments.size).toBe(1)


    const files = await pkg.files();
    expect(files.size).toBe(0)

    expect(attachments.get('c7f90966-f048-41fd-8951-70cd9a380cd2')).toEqual([{
        _attributes: { ignore: false, zipEntry: '6988443373b26e519cfd1096665b8eaa/1000001544.jpg' },
        Parameter: { _attributes: { name: 'uid', value: 'c7f90966-f048-41fd-8951-70cd9a380cd2' } }
    }]);

    await pkg.destroy();

});

test(`DataPackage File Parsing: COMileposts.zip`, async () => {
    const pkg = await DataPackage.parse(path.join(__dirname, 'packages', 'COMilePosts.zip'), {
        cleanup: false
    });

    expect(await DataPackage.hash(path.join(__dirname, 'packages', 'COMilePosts.zip'))).toBe('118e6b6f4cd30c855606879263f6376ca8a6f9b1694dd38ac43868ecfbe46edb');

    expect(pkg.version).toBe('2');
    expect(pkg.path).toBeTruthy();
    expect(pkg.settings).toEqual({
        uid: '62089a51-65d7-4c8c-9830-3bc466cd5683',
        name: 'CO Mileposts.kmz',
        onReceiveImport: true,
        onReceiveDelete: true
    });

    expect(pkg.contents).toEqual([
        {
            _attributes: { ignore: false, zipEntry: '86771c6fd3635ec4d66c3fd9501f23c1/CO Mileposts.kmz' },
            Parameter: [
                { _attributes: { name: 'name', value: 'CO Mileposts.kmz' } },
                { _attributes: { name: 'contentType', value: 'KML' } },
                { _attributes: { name: 'visible', value: 'false' } }
            ]
        }
    ]);

    const cots = await pkg.cots();
    expect(cots.length).toBe(0);

    const attachments = await pkg.attachments();
    expect(attachments.size).toBe(0)


    const files = await pkg.files();
    expect(files.size).toBe(1)

    expect(files.has('86771c6fd3635ec4d66c3fd9501f23c1/CO Mileposts.kmz')).toBeTruthy();

    await pkg.destroy();

});

test(`DataPackage File Parsing: Iconset-FalconView.zip (strict: false)`, async () => {
    const pkg = await DataPackage.parse(path.join(__dirname, 'packages', 'Iconset-FalconView.zip'), {
        strict: false,
        cleanup: false
    });

    expect(await DataPackage.hash(path.join(__dirname, 'packages', 'Iconset-FalconView.zip'))).toBe('53622c90841d2ef66b3b508412be0ecd33f90f1cd7887295ab0c3a31ee2e7315');

    expect(pkg.version).toBe('2');
    expect(pkg.path).toBeTruthy();
    expect(pkg.settings).toEqual({
        uid: '53622c90841d2ef66b3b508412be0ecd33f90f1cd7887295ab0c3a31ee2e7315',
        name: 'Iconset-FalconView',
        onReceiveImport: true,
        onReceiveDelete: true
    });

    expect(pkg.contents.length).toEqual(490);

    const cots = await pkg.cots();
    expect(cots.length).toBe(0);

    const attachments = await pkg.attachments();
    expect(attachments.size).toBe(0)


    const files = await pkg.files();
    expect(files.size).toBe(490)

    expect(files.has('iconset.xml')).toBeTruthy();

    expect(pkg.isMissionArchive()).toBe(false)

    await pkg.destroy();

});

test(`MissionArchive: Testing Export`, async () => {
    const pkg = await DataPackage.parse(path.join(__dirname, 'packages', 'MissionArchive.zip'), {
        strict: false,
        cleanup: false
    });

    expect(
        await DataPackage.hash(path.join(__dirname, 'packages', 'Iconset-FalconView.zip'))
    ).toBe(
        '53622c90841d2ef66b3b508412be0ecd33f90f1cd7887295ab0c3a31ee2e7315'
    );

    expect(pkg.version).toBe('2');
    expect(pkg.path).toBeTruthy();
    expect(pkg.settings).toEqual({
        uid: '26f64fe4-57f1-4109-8e79-d616f8050b57',
        name: 'Ingalls Testing',
        mission_guid: 'cedfcdbe-5be7-4f29-92c7-216a506772b2',
        password_hash: '',
        creatorUid: 'ANDROID-CloudTAK-nicholas.ingalls@state.co.us',
        create_time: '1738621323646',
        expiration: '-1',
        chatroom: '',
        description: 'Data Sync Testing',
        tool: 'public',
        onReceiveImport: true,
        onReceiveDelete: false,
        mission_name: 'Ingalls Testing',
        mission_label: 'Ingalls Testing',
        mission_uid: 'ops.cotak.gov-8443-ssl-Ingalls Testing',
        mission_server: 'ops.cotak.gov:8443:ssl'
    });

    expect(pkg.contents.length).toEqual(0);

    const cots = await pkg.cots();
    expect(cots.length).toBe(0);

    const attachments = await pkg.attachments();
    expect(attachments.size).toBe(0)


    const files = await pkg.files();
    expect(files.size).toBe(0)

    expect(pkg.isMissionArchive()).toBe(true)

    expect(pkg.manifest()).toEqual('<?xml version="1.0" encoding="UTF-8"?>\n<MissionPackageManifest version="2"><Configuration><Parameter name="uid" value="26f64fe4-57f1-4109-8e79-d616f8050b57"/><Parameter name="name" value="Ingalls Testing"/><Parameter name="mission_guid" value="cedfcdbe-5be7-4f29-92c7-216a506772b2"/><Parameter name="creatorUid" value="ANDROID-CloudTAK-nicholas.ingalls@state.co.us"/><Parameter name="create_time" value="1738621323646"/><Parameter name="expiration" value="-1"/><Parameter name="description" value="Data Sync Testing"/><Parameter name="tool" value="public"/><Parameter name="onReceiveImport" value="true"/><Parameter name="mission_name" value="Ingalls Testing"/><Parameter name="mission_label" value="Ingalls Testing"/><Parameter name="mission_uid" value="ops.cotak.gov-8443-ssl-Ingalls Testing"/><Parameter name="mission_server" value="ops.cotak.gov:8443:ssl"/></Configuration><Contents></Contents><Groups><Group name="DFPCCoE - All Personnel"/></Groups><Role name="MISSION_SUBSCRIBER"><Permissions name="MISSION_READ"/><Permissions name="MISSION_WRITE"/></Role></MissionPackageManifest>');

    await pkg.destroy();

});
