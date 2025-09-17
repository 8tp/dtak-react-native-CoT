import protobuf from 'protobufjs';
import Err from '@openaddresses/batch-error';
import { xml2js, js2xml } from 'xml-js';
import { diff } from 'json-diff-ts';
import type { Static } from '@sinclair/typebox';
import { from_geojson } from './parser/from_geojson.js';
import { normalize_geojson } from './parser/normalize_geojson.js';
import { to_geojson } from './parser/to_geojson.js';
import type {
    Feature,
} from './types/feature.js';
import type {
    GeoJSONFeature,
} from './types/geojson.js';
import {
    InputFeature,
} from './types/feature.js';
import JSONCoT, { Detail } from './types/types.js'
import CoT from './cot.js';
import type { CoTOptions } from './cot.js';
import AJV from 'ajv';

// Minimal type helpers to avoid use of 'any' while preserving flexibility
type LongLike = { toNumber(): number };
type CotEventDetail = {
    xmlDetail?: string;
    contact?: Record<string, unknown>;
    group?: Record<string, unknown>;
    precisionlocation?: Record<string, unknown>;
    status?: Record<string, unknown>;
    takv?: Record<string, unknown>;
    track?: Record<string, unknown>;
    [k: string]: unknown;
};
type CotEventMessage = {
    cotEvent: {
        [k: string]: unknown;
        detail: CotEventDetail;
    };
};
type DecodedTakMessage = {
    cotEvent: {
        uid: string;
        type: string;
        how?: string;
        qos?: string;
        opex?: string;
        access?: string;
        sendTime: LongLike;
        startTime: LongLike;
        staleTime: LongLike;
        lat: number;
        lon: number;
        hae: number; // treat as present for typing; may be undefined at runtime
        le: number;  // treat as present for typing; may be undefined at runtime
        ce: number;  // treat as present for typing; may be undefined at runtime
        detail: Record<string, unknown>;
    };
};
type XmlNode = Record<string, unknown>;

// React Native compatible protobuf loading
// For React Native, we need to load protobuf definitions differently
// let RootMessage: protobuf.Root;
let RootMessage: protobuf.Root = new protobuf.Root();
let rootInitPromise: Promise<void> | null = null;

// Check if we're in a React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

if (isReactNative) {
    // In React Native, create an empty root for now
    // In a real React Native app, you would bundle the proto files as assets
    RootMessage = new protobuf.Root();
    console.warn('Protobuf definitions not loaded in React Native environment. Some functionality may be limited.');
} else {
    // In Node.js environment, try to load the proto files
    // try {
    //     // eslint-disable-next-line @typescript-eslint/no-require-imports
    //     const path = require('path');
    //     const protoDir = path.join(__dirname, 'proto');
    //     
    //     // Load all proto files in the correct order to handle imports
    //     RootMessage = new protobuf.Root();
    //     RootMessage.resolvePath = (origin: string, target: string) => {
    //         return path.join(protoDir, target);
    //     };
    //     
    //     // Load the main proto file which will automatically load imports
    //     const protoPath = path.join(protoDir, 'takmessage.proto');
    //     RootMessage = protobuf.loadSync(protoPath);
    // } catch (error) {
    //     console.warn('Failed to load protobuf definitions:', error);
    //     RootMessage = new protobuf.Root();
    // }
}

const ensureRootInitialized = async (): Promise<void> => {
    if (rootInitPromise) return rootInitPromise;

    rootInitPromise = (async () => {
        if (isReactNative) {
            return;
        }

        try {
            const pathModule = await import('path');
            const { fileURLToPath } = await import('url');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = pathModule.dirname(__filename);
            const protoDir = pathModule.join(__dirname, 'proto');

            let localRoot = new protobuf.Root();
            localRoot.resolvePath = (origin: string, target: string) => {
                return pathModule.join(protoDir, target);
            };

            const protoPath = pathModule.join(protoDir, 'takmessage.proto');
            localRoot = protobuf.loadSync(protoPath);
            RootMessage = localRoot;
        } catch (error) {
            console.warn('Failed to load protobuf definitions:', error);
            RootMessage = new protobuf.Root();
        }
    })();

    return rootInitPromise;
};

// For React Native, package.json reading would need to be handled differently
const pkg = { version: '14.7.9' }; // Hardcoded for now, or read from a bundled file

const checkXML = (new AJV({
    allErrors: true,
    coerceTypes: true,
    allowUnionTypes: true
}))
    .compile(JSONCoT);

/**
 * Convert to and from an XML CoT message
 * @class
 *
 * @param cot A string/buffer containing the XML representation or the xml-js object tree
 *
 * @prop raw Raw XML-JS representation of CoT
 */
export class CoTParser {
    static validate(
        cot: CoT,
        opts: {
            flow: boolean
        } = {
                flow: true
            }
    ): CoT {
        if (opts.flow === undefined) opts.flow = true;

        checkXML(cot.raw);
        if (checkXML.errors) throw new Err(400, null, `${checkXML.errors[0].message} (${checkXML.errors[0].instancePath})`);

        if (opts.flow) {
            if (!cot.raw.event.detail) cot.raw.event.detail = {};

            if (!cot.raw.event.detail['_flow-tags_']) {
                cot.raw.event.detail['_flow-tags_'] = {};
            }

            cot.raw.event.detail['_flow-tags_'][`NodeCoT-${pkg.version}`] = new Date().toISOString()
        }

        return cot;
    }

    /**
     * Detect difference between CoT messages
     * Note: This diffs based on GeoJSON Representation of message
     *       So if unknown properties are present they will be excluded from the diff
     */
    static async isDiff(
        aCoT: CoT,
        bCoT: CoT,
        opts = {
            diffMetadata: false,
            diffStaleStartTime: false,
            diffDest: false,
            diffFlow: false
        }
    ): Promise<boolean> {
        const a = await this.to_geojson(aCoT) as Static<typeof InputFeature>;
        const b = await this.to_geojson(bCoT) as Static<typeof InputFeature>;

        if (!opts.diffDest) {
            delete a.properties.dest;
            delete b.properties.dest;
        }

        if (!opts.diffMetadata) {
            delete a.properties.metadata;
            delete b.properties.metadata;
        }

        if (!opts.diffFlow) {
            delete a.properties.flow;
            delete b.properties.flow;
        }

        if (!opts.diffStaleStartTime) {
            delete a.properties.time;
            delete a.properties.stale;
            delete a.properties.start;
            delete b.properties.time;
            delete b.properties.stale;
            delete b.properties.start;
        }

        const diffs = diff(a, b);

        return diffs.length > 0;
    }


    static from_xml(
        raw: Buffer | string,
        opts: CoTOptions = {}
    ): CoT {
        const cot = new CoT(
            xml2js(String(raw), { compact: true }) as Static<typeof JSONCoT>,
            opts
        );

        return this.validate(cot);
    }

    static to_xml(cot: CoT): string {
        return js2xml(cot.raw, { compact: true });
    }

    /**
     * Return an ATAK Compliant Protobuf
     */
    static async to_proto(cot: CoT, version = 1): Promise<Uint8Array> {
        if (version < 1 || version > 1) throw new Err(400, null, `Unsupported Proto Version: ${version}`);
        await ensureRootInitialized();
        
        let ProtoMessage;
        try {
            ProtoMessage = RootMessage.lookupType(`atakmap.commoncommo.protobuf.v${version}.TakMessage`);
        } catch (error) {
            throw new Err(400, null, `Protobuf definitions not available: ${error}`);
        }

        // The spread operator is important to make sure the delete doesn't modify the underlying detail object
        const detail = { ...cot.raw.event.detail };

        const msg: CotEventMessage = {
            cotEvent: {
                ...cot.raw.event._attributes,
                sendTime: new Date(cot.raw.event._attributes.time).getTime(),
                startTime: new Date(cot.raw.event._attributes.start).getTime(),
                staleTime: new Date(cot.raw.event._attributes.stale).getTime(),
                ...cot.raw.event.point._attributes,
                detail: {
                    xmlDetail: ''
                }
            }
        };

        let key: keyof Static<typeof Detail>;
        for (key in detail) {
            if (['contact', 'group', 'precisionlocation', 'status', 'takv', 'track'].includes(key)) {
                msg.cotEvent.detail[key] = detail[key]._attributes;
                delete detail[key]
            }
        }
        
        // Preserve important detail elements that have special meaning
        const preservedElements = ['archive', 'shape', 'strokeColor', 'strokeWeight', 'strokeStyle', 'fillColor', 'labels'];
        for (const elem of preservedElements) {
            if (Object.prototype.hasOwnProperty.call(detail, elem)) {
                // Keep these elements in detail for xmlDetail serialization
                // They will be properly reconstructed during from_proto
            }
        }

        // Include all remaining detail properties and metadata in xmlDetail
        const xmlDetailContent = {
            ...detail,
            metadata: cot.metadata || {}
        };
        
        // Only add xmlDetail if there's actual content to serialize
        if (Object.keys(xmlDetailContent).length > 0 || Object.keys(cot.metadata || {}).length > 0) {
            try {
                // Wrap content in a root element to ensure valid XML
                const wrappedContent = { detail: xmlDetailContent };
                msg.cotEvent.detail.xmlDetail = js2xml(wrappedContent, { 
                    compact: true,
                    ignoreDeclaration: true,
                    ignoreInstruction: true,
                    ignoreComment: true,
                    ignoreDoctype: true
                });
            } catch (error) {
                console.warn('Failed to serialize xmlDetail:', error);
                msg.cotEvent.detail.xmlDetail = '';
            }
        }

        return ProtoMessage.encode(msg).finish();
    }

    /**
     * Return a GeoJSON Feature from an XML CoT message
     */
    static async to_geojson(cot: CoT): Promise<Static<typeof Feature>> {
        return await to_geojson(cot);
    }

    /**
     * Parse an ATAK compliant Protobuf to a JS Object
     */
    static async from_proto(
        raw: Uint8Array,
        version = 1,
        opts: CoTOptions = {}
    ): Promise<CoT> {
        await ensureRootInitialized();
        let ProtoMessage;
        try {
            ProtoMessage = RootMessage.lookupType(`atakmap.commoncommo.protobuf.v${version}.TakMessage`);
        } catch (error) {
            throw new Err(400, null, `Protobuf definitions not available: ${error}`);
        }

        // Decode protobuf message - protobuf types are complex, using any for now
        const decoded: DecodedTakMessage = ProtoMessage.decode(raw) as unknown as DecodedTakMessage;

        if (!decoded.cotEvent) throw new Err(400, null, 'No cotEvent Data');

        // Detail structure is highly dynamic; allow index access
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detail: Record<string, any> = {};
        const metadata: Record<string, unknown> = {};
        for (const key in decoded.cotEvent.detail) {
            if (key === 'xmlDetail') {
                try {
                    // Clean up the XML data before parsing
                    let xmlData = (decoded.cotEvent.detail as Record<string, unknown>)[key] as string | undefined;
                    if (typeof xmlData === 'string') {
                        // Remove any trailing null bytes, control characters, and invalid XML chars
                        // eslint-disable-next-line no-control-regex
                        xmlData = xmlData.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '').trim();
                        
                        // Ensure the XML has a proper root element if it doesn't already
                        if (xmlData && !xmlData.startsWith('<')) {
                            xmlData = `<root>${xmlData}</root>`;
                        }
                        
                        if (xmlData) {
                            const xml = xml2js(xmlData, { 
                                compact: true,
                                ignoreDeclaration: true,
                                ignoreInstruction: true,
                                ignoreComment: true,
                                ignoreDoctype: true,
                                sanitize: true
                            }) as unknown as XmlNode;
                            
                            // Handle wrapped content structure
                            if ((xml as Record<string, unknown>).detail) {
                                // Content was wrapped in detail element during serialization
                                Object.assign(detail, (xml as Record<string, unknown>).detail as object);
                            } else if ((xml as Record<string, unknown>).root) {
                                // If we added a root wrapper, unwrap it
                                Object.assign(detail, (xml as Record<string, unknown>).root as object);
                            } else {
                                Object.assign(detail, xml as object);
                            }
                            
                            // Handle special reconstructions for known elements
                            if (detail.archive) {
                                // Convert archive element back to archived property for to_geojson
                                detail.archived = true;
                            }
                        }
                    }
                } catch (xmlError) {
                    console.warn('Failed to parse xmlDetail:', xmlError);
                    // Skip invalid XML data rather than failing the entire parse
                }

                if (detail.metadata) {
                    // Handle metadata reconstruction properly
                    if (typeof detail.metadata === 'object') {
                        const meta = detail.metadata as Record<string, unknown>;
                        for (const key in meta) {
                            const val = meta[key];
                            if (val && typeof val === 'object' && (val as Record<string, unknown>)._text !== undefined) {
                                metadata[key] = (val as Record<string, unknown>)._text as unknown;
                            } else {
                                metadata[key] = val as unknown;
                            }
                        }
                    }
                    delete detail.metadata;
                }
            } else if (key === 'group') {
                if ((decoded.cotEvent.detail as Record<string, unknown>)[key]) {
                    detail.__group = { _attributes: (decoded.cotEvent.detail as Record<string, unknown>)[key] };
                }
            } else if (['contact', 'precisionlocation', 'status', 'takv', 'track'].includes(key)) {
                if ((decoded.cotEvent.detail as Record<string, unknown>)[key]) {
                    (detail as Record<string, unknown>)[key] = { _attributes: (decoded.cotEvent.detail as Record<string, unknown>)[key] };
                }
            }
        }

        const cot = new CoT({
            event: {
                _attributes: {
                    version: '2.0',
                    uid: decoded.cotEvent.uid, type: decoded.cotEvent.type, how: decoded.cotEvent.how,
                    qos: decoded.cotEvent.qos, opex: decoded.cotEvent.opex, access: decoded.cotEvent.access,
                    time: new Date(decoded.cotEvent.sendTime.toNumber()).toISOString(),
                    start: new Date(decoded.cotEvent.startTime.toNumber()).toISOString(),
                    stale: new Date(decoded.cotEvent.staleTime.toNumber()).toISOString(),
                },
                detail,
                point: {
                    _attributes: {
                        lat: decoded.cotEvent.lat,
                        lon: decoded.cotEvent.lon,
                        hae: decoded.cotEvent.hae,
                        le: decoded.cotEvent.le,
                        ce: decoded.cotEvent.ce,
                    },
                }
            }
        }, opts);

        cot.metadata = metadata;

        return this.validate(cot);
    }

    static async normalize_geojson(
        feature: Static<typeof GeoJSONFeature>
    ): Promise<Static<typeof Feature>> {
        const feat = await normalize_geojson(feature);
        return feat;
    }

    /**
     * Return an CoT Message given a GeoJSON Feature
     *
     * @param {Object} feature GeoJSON Point Feature
     *
     * @return {CoT}
     */
    static async from_geojson(
        feature: Static<typeof InputFeature>,
        opts: CoTOptions = {}
    ): Promise<CoT> {
        const cot = await from_geojson(feature, opts);

        return this.validate(cot);
    }
}
