import * as THREE from 'three';
import { EnvironmentConfig } from '../types';

/**
 * GLSL Vertex and Fragment shaders for Wanderlust Procedural Sky & Animated Clouds
 * Implements Rayleigh/Mie atmospheric scattering, multi-octave 3D simplex/fBm procedural clouds,
 * sun corona glare, dynamic horizon haze blending, and night sky procedural stars.
 */
export const WanderlustSkyShader = {
  uniforms: {
    uTime: { value: 0 },
    uSunPosition: { value: new THREE.Vector3(0, 1, 0) },
    uZenithColor: { value: new THREE.Color('#1e88e5') },
    uHorizonColor: { value: new THREE.Color('#bae6fd') },
    uGroundColor: { value: new THREE.Color('#e2e8f0') },
    uCloudColor: { value: new THREE.Color('#ffffff') },
    uCloudShadowColor: { value: new THREE.Color('#94a3b8') },
    uCloudDensity: { value: 0.45 },
    uCloudScale: { value: 1.5 },
    uCloudSpeed: { value: 0.8 },
    uSunGlow: { value: 1.2 },
    uStarDensity: { value: 0.0 },
    uHorizonHaze: { value: 0.5 },
  },

  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vRayDir;

    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vRayDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform vec3 uSunPosition;
    uniform vec3 uZenithColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uGroundColor;
    uniform vec3 uCloudColor;
    uniform vec3 uCloudShadowColor;
    uniform float uCloudDensity;
    uniform float uCloudScale;
    uniform float uCloudSpeed;
    uniform float uSunGlow;
    uniform float uStarDensity;
    uniform float uHorizonHaze;

    varying vec3 vWorldPosition;
    varying vec3 vRayDir;

    // Simplex / hash noise functions
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      const float K1 = 0.366025404; // (sqrt(3)-1)/2;
      const float K2 = 0.211324865; // (3-sqrt(3))/6;

      vec2 i = floor(p + (p.x + p.y) * K1);
      vec2 a = p - i + (i.x + i.y) * K2;
      float m = step(a.y, a.x); 
      vec2 o = vec2(m, 1.0 - m);
      vec2 b = a - o + K2;
      vec2 c = a - 1.0 + 2.0 * K2;

      vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
      vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));

      return dot(n, vec3(70.0));
    }

    // Fractional Brownian Motion (fBm) for billowing cloud density
    float fbm(vec2 p) {
      float total = 0.0;
      float amplitude = 0.55;
      float frequency = 1.0;
      for (int i = 0; i < 5; i++) {
        total += noise(p * frequency) * amplitude;
        frequency *= 2.02;
        amplitude *= 0.48;
      }
      return total;
    }

    // Procedural starry night generator with twinkling
    float stars(vec3 rayDir, float time) {
      if (rayDir.y < 0.02 || uStarDensity <= 0.001) return 0.0;
      
      vec2 starUV = rayDir.xz / (rayDir.y + 0.35) * 85.0;
      vec2 grid = floor(starUV);
      vec2 sub = fract(starUV) - 0.5;

      float starHash = fract(sin(dot(grid, vec2(12.9898, 78.233))) * 43758.5453);
      if (starHash > (1.0 - uStarDensity * 0.065)) {
        float size = (starHash - (1.0 - uStarDensity * 0.065)) / (uStarDensity * 0.065);
        float dist = length(sub);
        float twinkle = sin(time * (3.0 + starHash * 8.0) + starHash * 6.28) * 0.4 + 0.6;
        float s = smoothstep(0.18 * size, 0.01, dist) * twinkle;
        return s * smoothstep(0.02, 0.25, rayDir.y);
      }
      return 0.0;
    }

    void main() {
      vec3 ray = normalize(vRayDir);
      float elevation = ray.y;

      // 1. Sky Gradient Base (Ground -> Horizon -> Zenith)
      vec3 skyColor;
      if (elevation >= 0.0) {
        float hFactor = pow(1.0 - elevation, 2.2);
        skyColor = mix(uZenithColor, uHorizonColor, hFactor);
      } else {
        float gFactor = clamp(-elevation * 3.5, 0.0, 1.0);
        skyColor = mix(uHorizonColor, uGroundColor, gFactor);
      }

      // 2. Sun Disc and Corona Glow
      vec3 sunDir = normalize(uSunPosition);
      float sunDot = max(0.0, dot(ray, sunDir));
      
      // Crisp sun disc
      float sunDisc = smoothstep(0.9982, 0.9996, sunDot);
      
      // Sun corona / Mie glow
      float sunCorona = pow(sunDot, 18.0) * 0.45 + pow(sunDot, 120.0) * 0.85;
      vec3 sunColor = vec3(1.0, 0.97, 0.92) * (1.0 + uSunGlow * 0.5);
      
      skyColor += sunColor * (sunDisc * 1.5 + sunCorona * uSunGlow * 0.6);

      // 3. Procedural Starry Night
      if (uStarDensity > 0.01) {
        float starVal = stars(ray, uTime);
        skyColor += vec3(0.92, 0.95, 1.0) * starVal;
      }

      // 4. Procedural Animated Clouds (Planar hemispherical projection)
      if (elevation > 0.01 && uCloudDensity > 0.005) {
        // Project onto cloud ceiling plane
        float planeDist = (1.0 + elevation * 1.2) / max(elevation, 0.06);
        vec2 cloudUV = (ray.xz * planeDist) * 0.22 * uCloudScale;

        // Animated wind velocity
        vec2 wind = vec2(uTime * 0.015 * uCloudSpeed, uTime * 0.008 * uCloudSpeed);
        
        // Multi-layered warped noise for billowing cartoon/anime clouds
        vec2 warp = vec2(
          fbm(cloudUV + wind),
          fbm(cloudUV + wind + vec2(4.3, 2.8))
        ) * 0.65;

        float cloudNoise = fbm(cloudUV + wind + warp);
        
        // Shape cloud coverage & threshold
        float densityThreshold = 1.0 - uCloudDensity;
        float cloudAlpha = smoothstep(densityThreshold, densityThreshold + 0.38, cloudNoise);

        if (cloudAlpha > 0.001) {
          // Cloud shading: Sun alignment lighting on top, ambient shadow underbelly
          float sunCloudDot = max(0.0, dot(vec3(ray.x, 0.5, ray.z), sunDir));
          float cloudLighting = smoothstep(0.2, 0.9, cloudNoise + sunCloudDot * 0.4);
          
          vec3 currentCloudColor = mix(uCloudShadowColor, uCloudColor, cloudLighting);
          
          // Extra sun rim highlight on cloud borders facing the sun
          float sunRim = pow(sunDot, 6.0) * 0.35;
          currentCloudColor += sunColor * sunRim;

          // Horizon fade so clouds don't abruptly hit the ground line
          float horizonFade = smoothstep(0.01, 0.22, elevation);
          float finalCloudAlpha = cloudAlpha * horizonFade * min(1.0, uCloudDensity * 1.5);

          // Blend clouds over sky
          skyColor = mix(skyColor, currentCloudColor, finalCloudAlpha);
        }
      }

      // 5. Atmospheric Horizon Haze
      float hazeBlend = pow(clamp(1.0 - abs(elevation), 0.0, 1.0), 3.0) * uHorizonHaze * 0.4;
      skyColor = mix(skyColor, uHorizonColor, hazeBlend);

      gl_FragColor = vec4(skyColor, 1.0);
    }
  `,
};

/**
 * Helper class to manage the Skydome in Three.js
 */
export class WanderlustSkyDome {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;

  constructor() {
    const geometry = new THREE.SphereGeometry(250, 48, 32);

    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(WanderlustSkyShader.uniforms),
      vertexShader: WanderlustSkyShader.vertexShader,
      fragmentShader: WanderlustSkyShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -100;
  }

  /**
   * Update uniforms with delta time, camera location, and environment parameters
   */
  update(
    timeSec: number,
    cameraPos?: THREE.Vector3 | null,
    sunDir?: THREE.Vector3 | null,
    env?: Partial<EnvironmentConfig> | null
  ) {
    if (cameraPos) {
      this.mesh.position.copy(cameraPos);
    }

    const u = this.material.uniforms;
    u.uTime.value = timeSec;
    if (sunDir) {
      u.uSunPosition.value.copy(sunDir);
    }

    if (env) {
      if (env.skyZenithColor) u.uZenithColor.value.set(env.skyZenithColor);
      if (env.skyHorizonColor) u.uHorizonColor.value.set(env.skyHorizonColor);
      if (env.skyGroundColor) u.uGroundColor.value.set(env.skyGroundColor);
      if (env.cloudColor) u.uCloudColor.value.set(env.cloudColor);
      if (env.cloudShadowColor) u.uCloudShadowColor.value.set(env.cloudShadowColor);

      if (env.cloudDensity !== undefined) u.uCloudDensity.value = env.cloudDensity;
      if (env.cloudScale !== undefined) u.uCloudScale.value = env.cloudScale;
      if (env.cloudSpeed !== undefined) u.uCloudSpeed.value = env.cloudSpeed;
      if (env.sunGlow !== undefined) u.uSunGlow.value = env.sunGlow;
      if (env.starDensity !== undefined) u.uStarDensity.value = env.starDensity;
      if (env.horizonHaze !== undefined) u.uHorizonHaze.value = env.horizonHaze;
    }
  }

  updateConfig(env: Partial<EnvironmentConfig>) {
    const u = this.material.uniforms;
    if (env.skyZenithColor) u.uZenithColor.value.set(env.skyZenithColor);
    if (env.skyHorizonColor) u.uHorizonColor.value.set(env.skyHorizonColor);
    if (env.skyGroundColor) u.uGroundColor.value.set(env.skyGroundColor);
    if (env.cloudColor) u.uCloudColor.value.set(env.cloudColor);
    if (env.cloudShadowColor) u.uCloudShadowColor.value.set(env.cloudShadowColor);

    if (env.cloudDensity !== undefined) u.uCloudDensity.value = env.cloudDensity;
    if (env.cloudScale !== undefined) u.uCloudScale.value = env.cloudScale;
    if (env.cloudSpeed !== undefined) u.uCloudSpeed.value = env.cloudSpeed;
    if (env.sunGlow !== undefined) u.uSunGlow.value = env.sunGlow;
    if (env.starDensity !== undefined) u.uStarDensity.value = env.starDensity;
    if (env.horizonHaze !== undefined) u.uHorizonHaze.value = env.horizonHaze;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
