/**
 * MarkupCanvas Tests
 * Test suite for the canvas-based drawing functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarkupCanvas } from '../../lib/photo-markup/MarkupCanvas';
import { MarkupAnnotation, MarkupTool } from '../../lib/photo-markup/types';

// Mock Canvas API
const mockContext = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    strokeStyle: '#000000',
    lineWidth: 1,
    fillStyle: '#000000',
    globalAlpha: 1,
    font: '16px Arial',
    textAlign: 'left',
    textBaseline: 'top'
};

const mockCanvas = {
    width: 800,
    height: 600,
    getContext: vi.fn(() => mockContext),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock-data')
};

describe('MarkupCanvas', () => {
    let canvas: MarkupCanvas;
    let mockAnnotation: MarkupAnnotation;

    beforeEach(async () => {
        canvas = new MarkupCanvas();
        
        mockAnnotation = {
            id: 'test-annotation',
            type: 'circle',
            coordinates: [100, 100, 50],
            style: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                opacity: 1
            },
            timestamp: Date.now(),
            author: 'test-user'
        };

        // Initialize canvas with mock
        await canvas.initialize(
            mockCanvas as any,
            1920, // photo width
            1080, // photo height
            800,  // canvas width
            600   // canvas height
        );
    });

    afterEach(() => {
        canvas.cleanup();
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            const newCanvas = new MarkupCanvas();
            
            await expect(
                newCanvas.initialize(mockCanvas as any, 1920, 1080, 800, 600)
            ).resolves.not.toThrow();
        });

        it('should set canvas dimensions correctly', () => {
            const canvasSize = canvas.getCanvasSize();
            const imageSize = canvas.getImageSize();
            
            expect(canvasSize).toEqual({ width: 800, height: 600 });
            expect(imageSize).toEqual({ width: 1920, height: 1080 });
        });

        it('should throw error with invalid canvas', async () => {
            const newCanvas = new MarkupCanvas();
            const invalidCanvas = { getContext: () => null };
            
            await expect(
                newCanvas.initialize(invalidCanvas as any, 1920, 1080, 800, 600)
            ).rejects.toThrow();
        });
    });

    describe('Tool Management', () => {
        it('should set current tool', () => {
            const arrowTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'arrow')!;
            
            canvas.setTool(arrowTool);
            
            expect(canvas.getCurrentTool()).toEqual(arrowTool);
        });

        it('should have default tools available', () => {
            const tools = MarkupCanvas.DEFAULT_TOOLS;
            
            expect(tools.length).toBeGreaterThan(0);
            expect(tools.map(t => t.type)).toContain('circle');
            expect(tools.map(t => t.type)).toContain('arrow');
            expect(tools.map(t => t.type)).toContain('text');
            expect(tools.map(t => t.type)).toContain('rectangle');
            expect(tools.map(t => t.type)).toContain('freehand');
        });

        it('should use first tool as default', () => {
            const newCanvas = new MarkupCanvas();
            
            expect(newCanvas.getCurrentTool()).toEqual(MarkupCanvas.DEFAULT_TOOLS[0]);
        });

        it('should accept custom initial tool', () => {
            const textTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'text')!;
            const newCanvas = new MarkupCanvas(textTool);
            
            expect(newCanvas.getCurrentTool()).toEqual(textTool);
        });
    });

    describe('Drawing Operations', () => {
        it('should start drawing operation', () => {
            canvas.startDrawing(100, 100);
            
            // Should set drawing state (internal state, can't directly test)
            // But we can test that subsequent operations work
            canvas.continueDrawing(150, 150);
            const annotation = canvas.finishDrawing();
            
            expect(annotation).toBeDefined();
            expect(annotation?.type).toBe('circle');
        });

        it('should continue drawing operation', () => {
            canvas.startDrawing(100, 100);
            
            expect(() => {
                canvas.continueDrawing(150, 150);
            }).not.toThrow();
        });

        it('should finish drawing and create annotation', () => {
            canvas.startDrawing(100, 100);
            canvas.continueDrawing(150, 150);
            
            const annotation = canvas.finishDrawing();
            
            expect(annotation).toBeDefined();
            expect(annotation?.id).toBeDefined();
            expect(annotation?.coordinates).toHaveLength(3); // circle: [x, y, radius]
        });

        it('should return null when finishing without starting', () => {
            const annotation = canvas.finishDrawing();
            
            expect(annotation).toBeNull();
        });

        it('should create text annotation with text', () => {
            const textTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'text')!;
            canvas.setTool(textTool);
            
            canvas.startDrawing(100, 100);
            const annotation = canvas.finishDrawing('Test Text');
            
            expect(annotation).toBeDefined();
            expect(annotation?.type).toBe('text');
            expect(annotation?.text).toBe('Test Text');
        });

        it('should not create text annotation without text', () => {
            const textTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'text')!;
            canvas.setTool(textTool);
            
            canvas.startDrawing(100, 100);
            const annotation = canvas.finishDrawing();
            
            expect(annotation).toBeNull();
        });
    });

    describe('Annotation Management', () => {
        it('should add annotation', () => {
            canvas.addAnnotation(mockAnnotation);
            
            const annotations = canvas.getAnnotations();
            expect(annotations).toHaveLength(1);
            expect(annotations[0]).toEqual(mockAnnotation);
        });

        it('should remove annotation by ID', () => {
            canvas.addAnnotation(mockAnnotation);
            
            const success = canvas.removeAnnotation(mockAnnotation.id);
            
            expect(success).toBe(true);
            expect(canvas.getAnnotations()).toHaveLength(0);
        });

        it('should return false when removing non-existent annotation', () => {
            const success = canvas.removeAnnotation('non-existent-id');
            
            expect(success).toBe(false);
        });

        it('should clear all annotations', () => {
            canvas.addAnnotation(mockAnnotation);
            canvas.addAnnotation({ ...mockAnnotation, id: 'annotation-2' });
            
            canvas.clearAnnotations();
            
            expect(canvas.getAnnotations()).toHaveLength(0);
        });

        it('should load annotations from data', () => {
            const annotations = [
                mockAnnotation,
                { ...mockAnnotation, id: 'annotation-2', type: 'arrow' as const }
            ];
            
            canvas.loadAnnotations(annotations);
            
            expect(canvas.getAnnotations()).toEqual(annotations);
        });
    });

    describe('Drawing Different Shapes', () => {
        it('should create circle annotation', () => {
            const circleTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'circle')!;
            canvas.setTool(circleTool);
            
            canvas.startDrawing(100, 100);
            canvas.continueDrawing(150, 150);
            const annotation = canvas.finishDrawing();
            
            expect(annotation?.type).toBe('circle');
            expect(annotation?.coordinates).toHaveLength(3);
        });

        it('should create arrow annotation', () => {
            const arrowTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'arrow')!;
            canvas.setTool(arrowTool);
            
            canvas.startDrawing(100, 100);
            canvas.continueDrawing(200, 150);
            const annotation = canvas.finishDrawing();
            
            expect(annotation?.type).toBe('arrow');
            expect(annotation?.coordinates).toHaveLength(4); // [x1, y1, x2, y2]
        });

        it('should create rectangle annotation', () => {
            const rectTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'rectangle')!;
            canvas.setTool(rectTool);
            
            canvas.startDrawing(100, 100);
            canvas.continueDrawing(200, 150);
            const annotation = canvas.finishDrawing();
            
            expect(annotation?.type).toBe('rectangle');
            expect(annotation?.coordinates).toHaveLength(4);
        });

        it('should create freehand annotation', () => {
            const freehandTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'freehand')!;
            canvas.setTool(freehandTool);
            
            canvas.startDrawing(100, 100);
            canvas.continueDrawing(110, 105);
            canvas.continueDrawing(120, 110);
            const annotation = canvas.finishDrawing();
            
            expect(annotation?.type).toBe('freehand');
            expect(annotation?.coordinates.length).toBeGreaterThan(4);
        });

        it('should not create freehand with insufficient points', () => {
            const freehandTool = MarkupCanvas.DEFAULT_TOOLS.find(t => t.type === 'freehand')!;
            canvas.setTool(freehandTool);
            
            canvas.startDrawing(100, 100);
            const annotation = canvas.finishDrawing();
            
            expect(annotation).toBeNull();
        });
    });

    describe('Canvas Rendering', () => {
        it('should redraw canvas', () => {
            canvas.addAnnotation(mockAnnotation);
            
            expect(() => {
                canvas.redrawCanvas();
            }).not.toThrow();
            
            expect(mockContext.clearRect).toHaveBeenCalled();
        });

        it('should call appropriate drawing methods for different shapes', () => {
            const circleAnnotation = { ...mockAnnotation, type: 'circle' as const };
            const arrowAnnotation = { ...mockAnnotation, id: 'arrow-1', type: 'arrow' as const, coordinates: [0, 0, 100, 100] };
            
            canvas.addAnnotation(circleAnnotation);
            canvas.addAnnotation(arrowAnnotation);
            
            canvas.redrawCanvas();
            
            expect(mockContext.arc).toHaveBeenCalled(); // for circle
            expect(mockContext.lineTo).toHaveBeenCalled(); // for arrow
        });

        it('should export canvas as image', async () => {
            const dataUrl = await canvas.exportAsImage();
            
            expect(dataUrl).toBe('data:image/png;base64,mock-data');
            expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
        });

        it('should throw error when exporting without canvas', async () => {
            const newCanvas = new MarkupCanvas();
            
            await expect(newCanvas.exportAsImage()).rejects.toThrow();
        });
    });

    describe('Coordinate Transformation', () => {
        it('should handle coordinate transformation correctly', () => {
            // This tests the internal coordinate transformation
            // We can verify by checking that annotations are created with proper coordinates
            
            canvas.startDrawing(400, 300); // Center of 800x600 canvas
            canvas.continueDrawing(450, 350);
            const annotation = canvas.finishDrawing();
            
            expect(annotation).toBeDefined();
            expect(annotation?.coordinates).toBeDefined();
            
            // The exact coordinates depend on the scaling calculation
            // but they should be within the image bounds
            const [x, y] = annotation!.coordinates;
            expect(x).toBeGreaterThanOrEqual(0);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(1920);
            expect(y).toBeLessThanOrEqual(1080);
        });
    });

    describe('Style Application', () => {
        it('should apply annotation styles during drawing', () => {
            const customTool: MarkupTool = {
                type: 'circle',
                name: 'Custom Circle',
                icon: '⭕',
                defaultStyle: {
                    strokeColor: '#00FF00',
                    strokeWidth: 5,
                    opacity: 0.8
                }
            };
            
            canvas.setTool(customTool);
            canvas.startDrawing(100, 100);
            canvas.continueDrawing(150, 150);
            const annotation = canvas.finishDrawing();
            
            expect(annotation?.style.strokeColor).toBe('#00FF00');
            expect(annotation?.style.strokeWidth).toBe(5);
            expect(annotation?.style.opacity).toBe(0.8);
        });
    });

    describe('Error Handling', () => {
        it('should handle drawing operations without context gracefully', () => {
            const newCanvas = new MarkupCanvas();
            
            expect(() => {
                newCanvas.startDrawing(100, 100);
                newCanvas.continueDrawing(150, 150);
                newCanvas.finishDrawing();
            }).not.toThrow();
        });

        it('should handle redraw without context gracefully', () => {
            const newCanvas = new MarkupCanvas();
            
            expect(() => {
                newCanvas.redrawCanvas();
            }).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup resources properly', () => {
            canvas.addAnnotation(mockAnnotation);
            
            canvas.cleanup();
            
            expect(canvas.getAnnotations()).toHaveLength(0);
        });

        it('should reset canvas state on cleanup', () => {
            canvas.startDrawing(100, 100);
            
            canvas.cleanup();
            
            const annotation = canvas.finishDrawing();
            expect(annotation).toBeNull();
        });
    });
});
