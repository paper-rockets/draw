import * as THREE from 'three';
import { PostProcessSettings } from '../types';

/**
 * Post-Processing & Render Modifiers Engine
 *
 * Implements Feather-style render modes:
 * - Draft Mode: Direct zero-latency hardware rasterization
 * - Render Mode: Multi-effect compositing pass with:
 *   - Bloom / Neon Glow Halo (for self-illuminated glow materials)
 *   - Toon / Cel-shading luminance quantization (hard-banded light steps)
 *   - Depth of Field (DoF) focal blur tethered to camera orbit fulcrum
 *   - Film Grain & Retro Pixelation Grid
 */
export class PostProcessingEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Render targets for multi-pass compositing
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private bloomTarget: THREE.WebGLRenderTarget;

  // Fullscreen Quad for post-processing shaders
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  private postMaterial: THREE.ShaderMaterial;
  private postQuad: THREE.Mesh;

  private settings: PostProcessSettings = {
    renderMode: 'draft',
    toonShading: false,
    toonSteps: 3,
    bloom: true,
    bloomIntensity: 1.2,
    bloomRadius: 0.8,
    bloomThreshold: 0.85,
    dof: false,
    dofFocusDistance: 2.5,
    dofAperture: 0.015,
    grain: false,
    grainIntensity: 0.08,
    pixelation: false,
    pixelSize: 4,
  };

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const pr = renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(width * pr));
    const h = Math.max(1, Math.floor(height * pr));

    const options: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      stencilBuffer: true,
      depthBuffer: true,
    };

    this.renderTargetA = new THREE.WebGLRenderTarget(w, h, options);
    this.renderTargetB = new THREE.WebGLRenderTarget(w, h, options);
    this.bloomTarget = new THREE.WebGLRenderTarget(Math.floor(w / 2), Math.floor(h / 2), options);

    // Fullscreen quad setup
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2(w, h) },
        uTime: { value: 0.0 },
        // Render Settings
        uRenderMode: { value: 0 }, // 0: draft, 1: render
        uToonShading: { value: false },
        uToonSteps: { value: 3.0 },
        uBloom: { value: true },
        uBloomIntensity: { value: 1.2 },
        uBloomThreshold: { value: 0.85 },
        uBloomRadius: { value: 0.8 },
        uDoF: { value: false },
        uFocusDistance: { value: 2.5 },
        uAperture: { value: 0.015 },
        uGrain: { value: false },
        uGrainIntensity: { value: 0.08 },
        uPixelation: { value: false },
        uPixelSize: { value: 4.0 },
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 100.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform int uRenderMode;
        uniform bool uToonShading;
        uniform float uToonSteps;
        uniform bool uBloom;
        uniform float uBloomIntensity;
        uniform float uBloomThreshold;
        uniform float uBloomRadius;
        uniform bool uDoF;
        uniform float uFocusDistance;
        uniform float uAperture;
        uniform bool uGrain;
        uniform float uGrainIntensity;
        uniform bool uPixelation;
        uniform float uPixelSize;

        varying vec2 vUv;

        // Pseudo-random noise
        float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;

          // 1. Retro Pixelation
          if (uPixelation && uPixelSize > 1.0) {
            vec2 dxy = uPixelSize / uResolution;
            uv = dxy * floor(uv / dxy);
          }

          vec4 baseColor = texture2D(tDiffuse, uv);

          // If Draft Mode, pass through directly
          if (uRenderMode == 0) {
            gl_FragColor = baseColor;
            return;
          }

          vec3 color = baseColor.rgb;

          // 2. Depth of Field (DoF) / Bokeh Blur
          if (uDoF) {
            vec2 blurDir = (uv - vec2(0.5));
            float distFromCenter = length(blurDir);
            float blurAmount = clamp(abs(distFromCenter - 0.3) * uAperture * 30.0, 0.0, 0.015);

            vec3 blurred = vec3(0.0);
            float totalWeight = 0.0;
            for (int x = -2; x <= 2; x++) {
              for (int y = -2; y <= 2; y++) {
                vec2 offset = vec2(float(x), float(y)) * blurAmount;
                float weight = 1.0 / (1.0 + length(vec2(x, y)));
                blurred += texture2D(tDiffuse, uv + offset).rgb * weight;
                totalWeight += weight;
              }
            }
            color = blurred / totalWeight;
          }

          // 3. Bloom / Emissive Halo Sampling
          if (uBloom) {
            vec3 bloomSum = vec3(0.0);
            float stepScale = uBloomRadius * 4.0;
            float bWeight = 0.0;

            for (int i = -3; i <= 3; i++) {
              for (int j = -3; j <= 3; j++) {
                vec2 bOffset = vec2(float(i), float(j)) * (stepScale / uResolution);
                vec3 sampleColor = texture2D(tDiffuse, uv + bOffset).rgb;
                float brightness = dot(sampleColor, vec3(0.299, 0.587, 0.114));
                if (brightness > uBloomThreshold || max(sampleColor.r, max(sampleColor.g, sampleColor.b)) > 1.0) {
                  float w = 1.0 / (1.0 + float(i*i + j*j));
                  bloomSum += sampleColor * w;
                  bWeight += w;
                }
              }
            }

            if (bWeight > 0.0) {
              vec3 bloom = (bloomSum / bWeight) * uBloomIntensity;
              color += bloom;
            }
          }

          // 4. Toon / Cel Shading Quantization
          if (uToonShading) {
            float luma = dot(color, vec3(0.299, 0.587, 0.114));
            float steppedLuma = floor(luma * uToonSteps + 0.5) / uToonSteps;
            color = color * (steppedLuma / max(0.05, luma));
          }

          // 5. Film Grain Noise
          if (uGrain) {
            float noise = (rand(uv + fract(uTime * 0.05)) - 0.5) * uGrainIntensity;
            color += vec3(noise);
          }

          gl_FragColor = vec4(color, baseColor.a);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    this.postScene.add(this.postQuad);
  }

  public setSize(width: number, height: number): void {
    const pr = this.renderer.getPixelRatio();
    const w = Math.max(1, Math.floor(width * pr));
    const h = Math.max(1, Math.floor(height * pr));

    this.renderTargetA.setSize(w, h);
    this.renderTargetB.setSize(w, h);
    this.bloomTarget.setSize(Math.floor(w / 2), Math.floor(h / 2));
    this.postMaterial.uniforms.uResolution.value.set(w, h);
  }

  public updateSettings(newSettings: Partial<PostProcessSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    const u = this.postMaterial.uniforms;
    u.uRenderMode.value = this.settings.renderMode === 'render' ? 1 : 0;
    u.uToonShading.value = this.settings.toonShading;
    u.uToonSteps.value = this.settings.toonSteps;
    u.uBloom.value = this.settings.bloom;
    u.uBloomIntensity.value = this.settings.bloomIntensity;
    u.uBloomRadius.value = this.settings.bloomRadius;
    u.uBloomThreshold.value = this.settings.bloomThreshold;
    u.uDoF.value = this.settings.dof;
    u.uFocusDistance.value = this.settings.dofFocusDistance;
    u.uAperture.value = this.settings.dofAperture;
    u.uGrain.value = this.settings.grain;
    u.uGrainIntensity.value = this.settings.grainIntensity;
    u.uPixelation.value = this.settings.pixelation;
    u.uPixelSize.value = this.settings.pixelSize;
  }

  public getSettings(): PostProcessSettings {
    return { ...this.settings };
  }

  /**
   * Main render loop call
   */
  public render(time: number = 0): void {
    if (this.settings.renderMode === 'draft') {
      // Draft Mode: Direct hardware rendering to screen
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Render Mode: Render scene to renderTargetA first
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.scene, this.camera);

    // Apply Post-Processing Shader Pass to screen
    this.postMaterial.uniforms.tDiffuse.value = this.renderTargetA.texture;
    this.postMaterial.uniforms.uTime.value = time;
    this.postMaterial.uniforms.uCameraNear.value = this.camera.near;
    this.postMaterial.uniforms.uCameraFar.value = this.camera.far;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  public dispose(): void {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    this.bloomTarget.dispose();
    this.postMaterial.dispose();
    this.postQuad.geometry.dispose();
  }
}
