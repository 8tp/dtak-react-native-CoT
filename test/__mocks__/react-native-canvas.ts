export class Canvas {
  width = 800;
  height = 600;
  private ctx: CanvasRenderingContext2D;
  constructor() {
    this.ctx = {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      rect: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      setLineDash: () => {},
      strokeStyle: '#000',
      lineWidth: 1,
      fillStyle: '#000',
      globalAlpha: 1,
      font: '16px Arial',
      textAlign: 'left',
      textBaseline: 'top'
    };
  }
  getContext(_type: '2d') {
    void _type;
    return this.ctx;
  }
  async toDataURL(_type?: string) { 
    void _type;
    return 'data:image/png;base64,mock'; 
  }
}

export type CanvasRenderingContext2D = {
  clearRect: (x: number, y: number, w: number, h: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arc: (x: number, y: number, r: number, sAngle: number, eAngle: number) => void;
  rect: (x: number, y: number, w: number, h: number) => void;
  stroke: () => void;
  fill: () => void;
  fillText: (text: string, x: number, y: number) => void;
  setLineDash: (segments: number[]) => void;
  strokeStyle: any;
  lineWidth: number;
  fillStyle: any;
  globalAlpha: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
};

export default { Canvas };
