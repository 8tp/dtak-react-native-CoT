/**
 * MarkupCanvas - Canvas-based drawing component for photo annotations
 * Supports circles, arrows, text, rectangles, and freehand drawing
 */

import { Canvas } from 'react-native-canvas';
import type { CanvasRenderingContext2D } from 'react-native-canvas';
import { v4 as uuidv4 } from 'uuid';

import type { MarkupAnnotation, AnnotationStyle, MarkupTool } from './types';
import { PhotoMarkupError, PhotoMarkupErrorCodes } from './types';

export interface DrawingPoint {
    x: number;
    y: number;
    timestamp?: number;
}

export interface DrawingState {
    isDrawing: boolean;
    startPoint?: DrawingPoint;
    currentPoint?: DrawingPoint;
    path?: DrawingPoint[];
}

export class MarkupCanvas {
    private canvas: Canvas | null = null;
    private context: CanvasRenderingContext2D | null = null;
    private annotations: MarkupAnnotation[] = [];
    private currentTool: MarkupTool;
    private drawingState: DrawingState = { isDrawing: false };
    private canvasSize = { width: 0, height: 0 };
    private imageSize = { width: 0, height: 0 };
    private scale = 1;
    private offset = { x: 0, y: 0 };

    // Default markup tools
    public static readonly DEFAULT_TOOLS: MarkupTool[] = [
        {
            type: 'circle',
            name: 'Circle',
            icon: '⭕',
            defaultStyle: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                fillColor: 'transparent',
                opacity: 1
            }
        },
        {
            type: 'arrow',
            name: 'Arrow',
            icon: '➡️',
            defaultStyle: {
                strokeColor: '#FF0000',
                strokeWidth: 4,
                opacity: 1
            }
        },
        {
            type: 'text',
            name: 'Text',
            icon: '📝',
            defaultStyle: {
                strokeColor: '#FF0000',
                strokeWidth: 2,
                opacity: 1,
                fontSize: 16,
                fontFamily: 'Arial'
            }
        },
        {
            type: 'rectangle',
            name: 'Rectangle',
            icon: '⬜',
            defaultStyle: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                fillColor: 'transparent',
                opacity: 1
            }
        },
        {
            type: 'freehand',
            name: 'Freehand',
            icon: '✏️',
            defaultStyle: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                opacity: 1
            }
        }
    ];

    constructor(initialTool?: MarkupTool) {
        this.currentTool = initialTool || MarkupCanvas.DEFAULT_TOOLS[0];
    }

    /**
     * Initialize canvas with photo dimensions
     */
    public async initialize(
        canvas: Canvas,
        photoWidth: number,
        photoHeight: number,
        canvasWidth: number,
        canvasHeight: number
    ): Promise<void> {
        try {
            this.canvas = canvas;
            this.context = canvas.getContext('2d');
            
            if (!this.context) {
                throw new PhotoMarkupError(
                    'Failed to get canvas context',
                    PhotoMarkupErrorCodes.INVALID_ANNOTATION
                );
            }

            this.imageSize = { width: photoWidth, height: photoHeight };
            this.canvasSize = { width: canvasWidth, height: canvasHeight };
            
            // Calculate scale and offset to fit image in canvas
            this.calculateScaleAndOffset();
            
            // Set canvas size
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // Clear canvas
            this.clearCanvas();
            
        } catch (error) {
            console.error('Canvas initialization failed:', error);
            throw new PhotoMarkupError(
                'Failed to initialize markup canvas',
                PhotoMarkupErrorCodes.INVALID_ANNOTATION,
                error
            );
        }
    }

    /**
     * Calculate scale and offset to fit image in canvas while maintaining aspect ratio
     */
    private calculateScaleAndOffset(): void {
        const scaleX = this.canvasSize.width / this.imageSize.width;
        const scaleY = this.canvasSize.height / this.imageSize.height;
        
        // Use the smaller scale to maintain aspect ratio
        this.scale = Math.min(scaleX, scaleY);
        
        // Calculate offset to center the image
        const scaledWidth = this.imageSize.width * this.scale;
        const scaledHeight = this.imageSize.height * this.scale;
        
        this.offset.x = (this.canvasSize.width - scaledWidth) / 2;
        this.offset.y = (this.canvasSize.height - scaledHeight) / 2;
    }

    /**
     * Convert canvas coordinates to image coordinates
     */
    private canvasToImageCoords(canvasX: number, canvasY: number): { x: number; y: number } {
        const imageX = (canvasX - this.offset.x) / this.scale;
        const imageY = (canvasY - this.offset.y) / this.scale;
        
        return { x: imageX, y: imageY };
    }

    /**
     * Convert image coordinates to canvas coordinates
     */
    private imageToCanvasCoords(imageX: number, imageY: number): { x: number; y: number } {
        const canvasX = imageX * this.scale + this.offset.x;
        const canvasY = imageY * this.scale + this.offset.y;
        
        return { x: canvasX, y: canvasY };
    }

    /**
     * Start drawing operation
     */
    public startDrawing(canvasX: number, canvasY: number): void {
        if (!this.context) return;

        const imageCoords = this.canvasToImageCoords(canvasX, canvasY);
        
        this.drawingState = {
            isDrawing: true,
            startPoint: { x: imageCoords.x, y: imageCoords.y, timestamp: Date.now() },
            currentPoint: { x: imageCoords.x, y: imageCoords.y },
            path: this.currentTool.type === 'freehand' ? [{ x: imageCoords.x, y: imageCoords.y }] : undefined
        };
    }

    /**
     * Continue drawing operation
     */
    public continueDrawing(canvasX: number, canvasY: number): void {
        if (!this.context || !this.drawingState.isDrawing) return;

        const imageCoords = this.canvasToImageCoords(canvasX, canvasY);
        this.drawingState.currentPoint = { x: imageCoords.x, y: imageCoords.y };

        if (this.currentTool.type === 'freehand' && this.drawingState.path) {
            this.drawingState.path.push({ x: imageCoords.x, y: imageCoords.y });
        }

        // Redraw canvas with current drawing
        this.redrawCanvas();
        this.drawCurrentAnnotation();
    }

    /**
     * Finish drawing operation and create annotation
     */
    public finishDrawing(text?: string): MarkupAnnotation | null {
        if (!this.drawingState.isDrawing || !this.drawingState.startPoint) {
            return null;
        }

        const annotation = this.createAnnotation(text);
        if (annotation) {
            this.annotations.push(annotation);
            this.redrawCanvas();
        }

        this.drawingState = { isDrawing: false };
        return annotation;
    }

    /**
     * Create annotation based on current drawing state
     */
    private createAnnotation(text?: string): MarkupAnnotation | null {
        if (!this.drawingState.startPoint || !this.drawingState.currentPoint) {
            return null;
        }

        const { startPoint, currentPoint, path } = this.drawingState;
        let coordinates: number[] = [];

        switch (this.currentTool.type) {
            case 'circle': {
                const radius = Math.sqrt(
                    Math.pow(currentPoint.x - startPoint.x, 2) + 
                    Math.pow(currentPoint.y - startPoint.y, 2)
                );
                coordinates = [startPoint.x, startPoint.y, radius];
                break;
            }

            case 'arrow':
            case 'rectangle': {
                coordinates = [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y];
                break;
            }

            case 'text': {
                coordinates = [startPoint.x, startPoint.y];
                if (!text) {
                    return null; // Text annotation requires text
                }
                break;
            }

            case 'freehand': {
                if (!path || path.length < 2) {
                    return null;
                }
                coordinates = path.flatMap(point => [point.x, point.y]);
                break;
            }

            default:
                return null;
        }

        return {
            id: uuidv4(),
            type: this.currentTool.type,
            coordinates,
            style: { ...this.currentTool.defaultStyle },
            text: text || undefined,
            timestamp: Date.now(),
            author: 'current-user' // This should be set from user context
        };
    }

    /**
     * Draw current annotation being created
     */
    private drawCurrentAnnotation(): void {
        if (!this.context || !this.drawingState.isDrawing) return;

        const tempAnnotation = this.createAnnotation();
        if (tempAnnotation) {
            this.drawAnnotation(tempAnnotation, true);
        }
    }

    /**
     * Draw a single annotation on the canvas
     */
    private drawAnnotation(annotation: MarkupAnnotation, isTemporary = false): void {
        if (!this.context) return;

        const ctx = this.context;
        const style = annotation.style;

        // Set drawing style
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.globalAlpha = style.opacity;
        
        if (style.fillColor && style.fillColor !== 'transparent') {
            ctx.fillStyle = style.fillColor;
        }

        // Set line dash for temporary annotations
        if (isTemporary) {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        switch (annotation.type) {
            case 'circle':
                this.drawCircle(annotation.coordinates);
                break;
            case 'arrow':
                this.drawArrow(annotation.coordinates);
                break;
            case 'rectangle':
                this.drawRectangle(annotation.coordinates);
                break;
            case 'text':
                this.drawText(annotation.coordinates, annotation.text || '', style);
                break;
            case 'freehand':
                this.drawFreehand(annotation.coordinates);
                break;
        }

        // Reset line dash
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    /**
     * Draw circle annotation
     */
    private drawCircle(coords: number[]): void {
        if (!this.context || coords.length < 3) return;

        const [centerX, centerY, radius] = coords;
        const canvasCenter = this.imageToCanvasCoords(centerX, centerY);
        const canvasRadius = radius * this.scale;

        this.context.beginPath();
        this.context.arc(canvasCenter.x, canvasCenter.y, canvasRadius, 0, 2 * Math.PI);
        this.context.stroke();
        
        if (this.context.fillStyle !== 'transparent') {
            this.context.fill();
        }
    }

    /**
     * Draw arrow annotation
     */
    private drawArrow(coords: number[]): void {
        if (!this.context || coords.length < 4) return;

        const [startX, startY, endX, endY] = coords;
        const canvasStart = this.imageToCanvasCoords(startX, startY);
        const canvasEnd = this.imageToCanvasCoords(endX, endY);

        const ctx = this.context;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(canvasStart.x, canvasStart.y);
        ctx.lineTo(canvasEnd.x, canvasEnd.y);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(canvasEnd.y - canvasStart.y, canvasEnd.x - canvasStart.x);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;

        ctx.beginPath();
        ctx.moveTo(canvasEnd.x, canvasEnd.y);
        ctx.lineTo(
            canvasEnd.x - arrowLength * Math.cos(angle - arrowAngle),
            canvasEnd.y - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(canvasEnd.x, canvasEnd.y);
        ctx.lineTo(
            canvasEnd.x - arrowLength * Math.cos(angle + arrowAngle),
            canvasEnd.y - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
    }

    /**
     * Draw rectangle annotation
     */
    private drawRectangle(coords: number[]): void {
        if (!this.context || coords.length < 4) return;

        const [startX, startY, endX, endY] = coords;
        const canvasStart = this.imageToCanvasCoords(startX, startY);
        const canvasEnd = this.imageToCanvasCoords(endX, endY);

        const width = canvasEnd.x - canvasStart.x;
        const height = canvasEnd.y - canvasStart.y;

        this.context.beginPath();
        this.context.rect(canvasStart.x, canvasStart.y, width, height);
        this.context.stroke();
        
        if (this.context.fillStyle !== 'transparent') {
            this.context.fill();
        }
    }

    /**
     * Draw text annotation
     */
    private drawText(coords: number[], text: string, style: AnnotationStyle): void {
        if (!this.context || coords.length < 2) return;

        const [x, y] = coords;
        const canvasCoords = this.imageToCanvasCoords(x, y);

        const ctx = this.context;
        ctx.font = `${style.fontSize || 16}px ${style.fontFamily || 'Arial'}`;
        ctx.fillStyle = style.strokeColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        ctx.fillText(text, canvasCoords.x, canvasCoords.y);
    }

    /**
     * Draw freehand annotation
     */
    private drawFreehand(coords: number[]): void {
        if (!this.context || coords.length < 4) return;

        const ctx = this.context;
        ctx.beginPath();

        for (let i = 0; i < coords.length; i += 2) {
            const canvasCoords = this.imageToCanvasCoords(coords[i], coords[i + 1]);
            
            if (i === 0) {
                ctx.moveTo(canvasCoords.x, canvasCoords.y);
            } else {
                ctx.lineTo(canvasCoords.x, canvasCoords.y);
            }
        }
        
        ctx.stroke();
    }

    /**
     * Clear canvas and redraw all annotations
     */
    public redrawCanvas(): void {
        if (!this.context) return;

        this.clearCanvas();
        
        // Draw all annotations
        this.annotations.forEach(annotation => {
            this.drawAnnotation(annotation);
        });
    }

    /**
     * Clear the entire canvas
     */
    private clearCanvas(): void {
        if (!this.context) return;
        
        this.context.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }

    /**
     * Set current drawing tool
     */
    public setTool(tool: MarkupTool): void {
        this.currentTool = tool;
    }

    /**
     * Get current drawing tool
     */
    public getCurrentTool(): MarkupTool {
        return this.currentTool;
    }

    /**
     * Add annotation programmatically
     */
    public addAnnotation(annotation: MarkupAnnotation): void {
        this.annotations.push(annotation);
        this.redrawCanvas();
    }

    /**
     * Remove annotation by ID
     */
    public removeAnnotation(annotationId: string): boolean {
        const index = this.annotations.findIndex(a => a.id === annotationId);
        if (index !== -1) {
            this.annotations.splice(index, 1);
            this.redrawCanvas();
            return true;
        }
        return false;
    }

    /**
     * Get all annotations
     */
    public getAnnotations(): MarkupAnnotation[] {
        return [...this.annotations];
    }

    /**
     * Clear all annotations
     */
    public clearAnnotations(): void {
        this.annotations = [];
        this.redrawCanvas();
    }

    /**
     * Export canvas as image data URL
     */
    public async exportAsImage(): Promise<string> {
        if (!this.canvas) {
            throw new PhotoMarkupError(
                'Canvas not initialized',
                PhotoMarkupErrorCodes.INVALID_ANNOTATION
            );
        }

        try {
            return await this.canvas.toDataURL('image/png');
        } catch (error) {
            throw new PhotoMarkupError(
                'Failed to export canvas as image',
                PhotoMarkupErrorCodes.INVALID_ANNOTATION,
                error
            );
        }
    }

    /**
     * Load annotations from data
     */
    public loadAnnotations(annotations: MarkupAnnotation[]): void {
        this.annotations = [...annotations];
        this.redrawCanvas();
    }

    /**
     * Get canvas dimensions
     */
    public getCanvasSize(): { width: number; height: number } {
        return { ...this.canvasSize };
    }

    /**
     * Get image dimensions
     */
    public getImageSize(): { width: number; height: number } {
        return { ...this.imageSize };
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.canvas = null;
        this.context = null;
        this.annotations = [];
        this.drawingState = { isDrawing: false };
    }
}
