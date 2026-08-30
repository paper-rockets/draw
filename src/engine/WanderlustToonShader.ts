import * as THREE from 'three';
import { EnvironmentConfig, ProceduralPattern } from '../types';
import { RenderEngine } from './RenderEngine';

/**
 * Wanderlust Custom Cel / Toon Shader Material for Three.js
 * Implements multi-band quantized diffuse lighting, anime-style Fresnel rim lighting,
 * stepped specular highlights, and procedural texture patterns.
 */
export const WanderlustToonShader = {
  uniforms: {
    uBaseColor: { value: new THREE.Color('#ffffff') },
    uOpacity: { value: 1.0 },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uLightColor: { value: new THREE.Color('#ffffff') },
    uAmbientColor: { value: new THREE.Color('#333333') },
    uToonBands: { value: 3.0 },
    uRimIntensity: { value: 0.6 },
    uRimPower: { value: 3.0 },
    uRimColor: { value: new THREE.Color('#e0f2fe') },
    uSpecular: { value: 1.0 },
    uHasPattern: { value: 0.0 },
    uPatternMap: { value: null as THREE.Texture | null },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform float uOpacity;
    uniform vec3 uLightDir;
    uniform vec3 uLightColor;
    uniform vec3 uAmbientColor;
    uniform float uToonBands;
    uniform float uRimIntensity;
    uniform float uRimPower;
    uniform vec3 uRimColor;
    uniform float uSpecular;
    uniform float uHasPattern;
    uniform sampler2D uPatternMap;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Light direction in view space
      vec3 lightDir = normalize(uLightDir);

      // 1. Diffuse N dot L
      float nDotL = dot(normal, lightDir);
      float lightFactor = max(0.0, nDotL);

      // 2. Quantize into stepped Toon Bands
      float bands = max(2.0, uToonBands);
      float steppedLight = floor(lightFactor * bands) / (bands - 1.0);
      // Soften step edges slightly for anti-aliased cartoon look
      steppedLight = smoothstep(0.0, 1.0, steppedLight);
      
      // Keep shadow floor so dark side has soft ambient toon tone
      float shadowFloor = 0.22;
      steppedLight = mix(shadowFloor, 1.0, steppedLight);

      // 3. Pattern map blending if present
      vec3 surfaceColor = uBaseColor;
      if (uHasPattern > 0.5) {
        vec4 pat = texture2D(uPatternMap, vUv);
        surfaceColor *= pat.rgb;
      }

      // 4. Stepped Anime Specular Glint
      vec3 halfDir = normalize(lightDir + viewDir);
      float nDotH = max(0.0, dot(normal, halfDir));
      float spec = pow(nDotH, 32.0);
      float steppedSpec = smoothstep(0.65, 0.72, spec) * uSpecular;

      // 5. Anime Fresnel Rim Lighting
      float fresnel = 1.0 - max(0.0, dot(normal, viewDir));
      float rim = pow(fresnel, uRimPower) * uRimIntensity;
      // Fade rim on fully shadowed side
      rim *= smoothstep(-0.2, 0.4, nDotL);

      // 6. Combine composite toon color
      vec3 litColor = surfaceColor * uLightColor * steppedLight + uAmbientColor * surfaceColor;
      vec3 finalColor = litColor + (uRimColor * rim) + (uLightColor * steppedSpec * 0.75);

      gl_FragColor = vec4(finalColor, uOpacity);
    }
  `,
};

/**
 * Creates an optimized Wanderlust Toon Shader Material
 */
export function createWanderlustToonMaterial(
  color: string,
  opacity: number = 1.0,
  pattern: ProceduralPattern = 'none',
  patternScale: number = 1.0,
  patternAngle: number = 0,
  patternContrast: number = 1.0,
  env?: EnvironmentConfig
): THREE.ShaderMaterial {
  const threeColor = new THREE.Color(color);
  const patternTex = RenderEngine.createPatternTexture(pattern, patternScale, patternAngle, patternContrast);

  // Compute view-space light direction
  const lightAltitude = env?.lightAltitude ?? 50;
  const lightAzimuth = env?.lightAzimuth ?? 120;
  const worldLightDir = RenderEngine.getLightDirection(lightAltitude, lightAzimuth);

  const uniforms = {
    uBaseColor: { value: threeColor },
    uOpacity: { value: opacity },
    uLightDir: { value: worldLightDir },
    uLightColor: { value: new THREE.Color(env?.lightColor || '#ffffff').multiplyScalar(env?.lightIntensity || 1.2) },
    uAmbientColor: { value: new THREE.Color(env?.skyHorizonColor || '#475569').multiplyScalar(0.35) },
    uToonBands: { value: env?.toonBands ?? 3.0 },
    uRimIntensity: { value: env?.toonRimIntensity ?? 0.65 },
    uRimPower: { value: env?.toonRimPower ?? 3.2 },
    uRimColor: { value: new THREE.Color(env?.toonRimColor || env?.skyHorizonColor || '#bae6fd') },
    uSpecular: { value: env?.toonSpecular !== false ? 1.0 : 0.0 },
    uHasPattern: { value: patternTex ? 1.0 : 0.0 },
    uPatternMap: { value: patternTex },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WanderlustToonShader.vertexShader,
    fragmentShader: WanderlustToonShader.fragmentShader,
    side: THREE.DoubleSide,
    transparent: opacity < 1.0,
    depthWrite: true,
  });

  return mat;
}
