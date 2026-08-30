import * as THREE from 'three';
import { BrushSettings } from '../types';

/**
 * Dynamic UV Texture Painting Engine
 *
 * Implements direct GPU texture painting onto the 3D model's UV map using
 * offscreen high-resolution 2D Canvas textures with seamless interpolation and undo history.
 */
export class UVPaintingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private width: number = 2048;
  private height: number = 2048;
  private lastUV: THREE.Vector2 | null = null;
  private historyStack: ImageData[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 25;
  private isDrawing: boolean = false;
  private activeMeshes: THREE.Mesh[] = [];
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  constructor(resolution: number = 2048) {
    this.width = resolution;
    this.height = resolution;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    // Initialize with clean transparent canvas
    this.clearCanvas();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;

    this.saveState();
  }

  public getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  public clearToColor(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  /**
   * Bind the dynamic canvas texture to the target model meshes via overlay meshes
   */
  public attachToModel(root: THREE.Object3D): void {
    this.activeMeshes = [];
    root.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && child.name !== 'UV_Overlay') {
        this.activeMeshes.push(child);

        // Ensure geometry has UV coordinates
        if (!child.geometry.attributes.uv) {
          this.generateFallbackUVs(child.geometry);
        }

        // Check if an overlay already exists
        let existingOverlay: THREE.Mesh | null = null;
        for (const c of child.children) {
          if (c.name === 'UV_Overlay') {
            existingOverlay = c as THREE.Mesh;
            break;
          }
        }

        if (!existingOverlay) {
          const overlayMat = new THREE.MeshStandardMaterial({
            map: this.texture,
            transparent: true,
            opacity: 1.0,
            roughness: 0.4,
            metalness: 0.1,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1.0,
            polygonOffsetUnits: -2.0,
            side: THREE.DoubleSide,
          });
          const overlayMesh = new THREE.Mesh(child.geometry, overlayMat);
          overlayMesh.name = 'UV_Overlay';
          overlayMesh.renderOrder = 4;
          child.add(overlayMesh);
        }
      }
    });
  }

  private generateFallbackUVs(geometry: THREE.BufferGeometry): void {
    const pos = geometry.attributes.position;
    if (!pos) return;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
      const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, y))) / Math.PI;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  /**
   * Start a stroke on UV coordinate
   */
  public beginStroke(uv: THREE.Vector2, settings: BrushSettings): void {
    this.isDrawing = true;
    this.lastUV = uv.clone();
    this.paintStamp(uv, settings, 1.0);
  }

  /**
   * Interpolate paint along UV coordinates
   */
  public paintTo(uv: THREE.Vector2, settings: BrushSettings, pressure: number = 1.0): void {
    if (!this.isDrawing) {
      this.beginStroke(uv, settings);
      return;
    }

    if (!this.lastUV) {
      this.lastUV = uv.clone();
      this.paintStamp(uv, settings, pressure);
      return;
    }

    const p1x = this.lastUV.x * this.width;
    const p1y = (1.0 - this.lastUV.y) * this.height; // Flip Y for WebGL UV convention
    const p2x = uv.x * this.width;
    const p2y = (1.0 - uv.y) * this.height;

    const dx = p2x - p1x;
    const dy = p2y - p1y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dynamic brush radius in pixel units
    const baseRadius = settings.size * (this.width * 0.25);
    const radius = Math.max(2, baseRadius * (settings.pressureSensitivity ? pressure : 1.0));
    const step = Math.max(1.5, radius * 0.25);
    const count = Math.ceil(dist / step);

    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const x = p1x + dx * t;
      const y = p1y + dy * t;
      this.renderBrushAtPixel(x, y, radius, settings);
    }

    this.lastUV.copy(uv);
    this.texture.needsUpdate = true;
  }

  /**
   * Paint a single stamp at UV coordinate
   */
  public paintStamp(uv: THREE.Vector2, settings: BrushSettings, pressure: number = 1.0): void {
    const px = uv.x * this.width;
    const py = (1.0 - uv.y) * this.height;
    const baseRadius = settings.size * (this.width * 0.25);
    const radius = Math.max(2, baseRadius * (settings.pressureSensitivity ? pressure : 1.0));

    this.renderBrushAtPixel(px, py, radius, settings);
    this.texture.needsUpdate = true;
  }

  private renderBrushAtPixel(x: number, y: number, radius: number, settings: BrushSettings): void {
    this.ctx.save();
    
    // Radial gradient for smooth feathered edge
    const radGrad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    const hex = settings.color;
    const alpha = settings.opacity;

    // Convert hex to rgb
    const c = new THREE.Color(hex);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);

    radGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    radGrad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.85})`);
    radGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = radGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Handle seamless UV border wrapping
    this.handleWrapping(x, y, radius, radGrad);

    this.ctx.restore();
  }

  private handleWrapping(x: number, y: number, radius: number, style: any): void {
    let wrapX = 0;
    let wrapY = 0;

    if (x - radius < 0) wrapX = this.width;
    else if (x + radius > this.width) wrapX = -this.width;

    if (y - radius < 0) wrapY = this.height;
    else if (y + radius > this.height) wrapY = -this.height;

    if (wrapX !== 0) {
      this.ctx.beginPath();
      this.ctx.arc(x + wrapX, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    if (wrapY !== 0) {
      this.ctx.beginPath();
      this.ctx.arc(x, y + wrapY, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    if (wrapX !== 0 && wrapY !== 0) {
      this.ctx.beginPath();
      this.ctx.arc(x + wrapX, y + wrapY, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  public endStroke(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.lastUV = null;
      this.saveState();
    }
  }

  public saveState(): void {
    const data = this.ctx.getImageData(0, 0, this.width, this.height);
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }
    this.historyStack.push(data);
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    } else {
      this.historyIndex++;
    }
  }

  public undo(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.ctx.putImageData(this.historyStack[this.historyIndex], 0, 0);
      this.texture.needsUpdate = true;
      return true;
    }
    return false;
  }

  public redo(): boolean {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.ctx.putImageData(this.historyStack[this.historyIndex], 0, 0);
      this.texture.needsUpdate = true;
      return true;
    }
    return false;
  }

  public exportPNG(): string {
    return this.canvas.toDataURL('image/png');
  }

  public dispose(): void {
    this.texture.dispose();
    this.historyStack = [];
  }
}
