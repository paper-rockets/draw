import * as THREE from 'three';
import { Point3D, Stroke, Guide3D, GuidePrimitiveType, LiquifyMode } from '../types';
import { ConformalBeadGenerator } from './ConformalBeadGenerator';

export class GeometryEngine {
  private static conformalGenerator = new ConformalBeadGenerator();

  /**
   * Generates a volumetric 3D Tube/Ribbon/Marker/Conformal mesh geometry for a stroke
   */
  static createStrokeMesh(stroke: Stroke, targetMeshes: THREE.Mesh[] = []): THREE.BufferGeometry {
    if (!stroke || !stroke.points) {
      return new THREE.BufferGeometry();
    }

    // If stroke has surface normal alignment, conformal brush type, or explicit profile, use ConformalBeadGenerator
    if (
      stroke.profile ||
      stroke.brushType === 'conformal' ||
      stroke.points.some((p) => p && p.isSurfaceHit && p.normal)
    ) {
      return this.conformalGenerator.generateGeometry(stroke, targetMeshes);
    }

    const rawPoints = stroke.points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number');
    if (rawPoints.length < 2) {
      return new THREE.BufferGeometry();
    }

    // Catmull-Rom smoothing if more than 3 points
    const vectors = rawPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.5);
    
    // Sample curve at adaptive resolution
    const sampleCount = Math.max(16, rawPoints.length * 4);
    const sampledPoints = curve.getPoints(sampleCount);
    
    // Calculate speed and pressure along length
    const pressures: number[] = [];
    const speeds: number[] = [];

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const rawIdx = t * (rawPoints.length - 1);
      const low = Math.floor(rawIdx);
      const high = Math.min(rawPoints.length - 1, Math.ceil(rawIdx));
      const frac = rawIdx - low;
      
      const pLow = rawPoints[low]?.pressure ?? 0.5;
      const pHigh = rawPoints[high]?.pressure ?? 0.5;
      const interpP = pLow + (pHigh - pLow) * frac;
      pressures.push(interpP);

      // Estimate drawing speed from point distance & timestamps
      const ptA = rawPoints[low];
      const ptB = rawPoints[high];
      let speed = 1.0;
      if (ptA && ptB && ptA.timestamp && ptB.timestamp && ptB.timestamp > ptA.timestamp) {
        const dt = (ptB.timestamp - ptA.timestamp) / 1000;
        const dist = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y, ptB.z - ptA.z);
        speed = Math.min(3.0, Math.max(0.3, dist / (dt * 2.0)));
      }
      speeds.push(speed);
    }

    // Convert stroke size in mm to world space scale (1 unit = 1000mm -> radius in units)
    const baseRadius = (stroke.size / 1000) * 0.5;
    const radialSegments = stroke.brushType === 'ribbon' ? 4 : (stroke.brushType === 'marker' ? 8 : 12);

    const strokeColor = new THREE.Color(stroke.color || '#1c1c1e');
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Calculate Frenet-Serret frames
    const frames = curve.computeFrenetFrames(sampleCount, false);

    // Procedural noise jitter parameters for organic, hand-sketched look
    const jitterFactor = stroke.jitter || 0;
    let strokeSeed = 0;
    if (stroke.id) {
      for (let c = 0; c < stroke.id.length; c++) {
        strokeSeed = ((strokeSeed << 5) - strokeSeed + stroke.id.charCodeAt(c)) | 0;
      }
    }

    const pseudoNoise = (seedOffset: number, idx: number, freq: number = 1.0) => {
      const t = idx * freq + (Math.abs(strokeSeed + seedOffset) % 1000) * 0.137;
      return Math.sin(t * 1.414) * 0.5 + Math.cos(t * 2.718) * 0.3 + Math.sin(t * 5.179) * 0.2;
    };

    // Calculate radii along spine
    const spineRadii: number[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      let pressure = stroke.pressureSensitive ? Math.max(0.15, Math.min(1.6, pressures[i] * 1.4)) : 1.0;
      
      // Speed modulation (fast strokes produce subtle ink taper)
      if (stroke.pressureSensitive && speeds[i]) {
        const speedTaper = Math.max(0.7, 1.3 - (speeds[i] - 1.0) * 0.2);
        pressure *= speedTaper;
      }

      let r = baseRadius * pressure;
      if (jitterFactor > 0) {
        const radiusVariance = 1.0 + pseudoNoise(307, i, 2.1) * jitterFactor * 0.45;
        r = Math.max(baseRadius * 0.1, r * radiusVariance);
      }
      spineRadii.push(r);
    }

    // Generate main curve vertices
    for (let i = 0; i <= sampleCount; i++) {
      const origP = sampledPoints[i] || sampledPoints[0] || new THREE.Vector3();
      const normal = frames.normals?.[i] || new THREE.Vector3(0, 1, 0);
      const binormal = frames.binormals?.[i] || new THREE.Vector3(0, 0, 1);
      const currentRadius = spineRadii[i] || baseRadius;

      let posX = origP.x;
      let posY = origP.y;
      let posZ = origP.z;

      if (jitterFactor > 0) {
        const tipTaper = Math.min(1, Math.sin((i / sampleCount) * Math.PI) * 1.5);
        const jitterDisp = baseRadius * jitterFactor * 1.6 * tipTaper;
        const jNorm = pseudoNoise(101, i, 1.4) * jitterDisp;
        const jBinorm = pseudoNoise(203, i, 1.7) * jitterDisp;

        posX += normal.x * jNorm + binormal.x * jBinorm;
        posY += normal.y * jNorm + binormal.y * jBinorm;
        posZ += normal.z * jNorm + binormal.z * jBinorm;
      }

      // Calligraphic chisel angle for Marker
      const chiselAngle = (Math.PI / 4); // 45 degree classic calligraphy nib angle

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        let cx = -Math.cos(v);
        let cy = Math.sin(v);

        if (stroke.brushType === 'ribbon') {
          // Flat tape-like cross-section aligned with surface / drawing plane
          cx *= 1.4;
          cy *= 0.1;
        } else if (stroke.brushType === 'marker') {
          // Asymmetric calligraphic chisel profile with 45° angle orientation
          const rx = cx * 1.8;
          const ry = cy * 0.35;
          cx = rx * Math.cos(chiselAngle) - ry * Math.sin(chiselAngle);
          cy = rx * Math.sin(chiselAngle) + ry * Math.cos(chiselAngle);
        } else if (stroke.brushType === 'flat') {
          // 2D flat cross-section
          cy *= 0.05;
        }

        // Micro-roughness for organic texture feel
        let segRadius = currentRadius;
        if (jitterFactor > 0) {
          const contourRoughness = 1.0 + pseudoNoise(409, i * radialSegments + j, 3.2) * jitterFactor * 0.15;
          segRadius *= contourRoughness;
        }

        const vx = posX + segRadius * (cx * normal.x + cy * binormal.x);
        const vy = posY + segRadius * (cx * normal.y + cy * binormal.y);
        const vz = posZ + segRadius * (cx * normal.z + cy * binormal.z);

        vertices.push(vx, vy, vz);
        colors.push(strokeColor.r, strokeColor.g, strokeColor.b);

        // Normal vector
        const nx = cx * normal.x + cy * binormal.x;
        const ny = cx * normal.y + cy * binormal.y;
        const nz = cx * normal.z + cy * binormal.z;
        const len = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / len, ny / len, nz / len);

        // UV coordinates
        uvs.push(j / radialSegments, i / sampleCount);
      }
    }

    // Build main body indices
    for (let i = 0; i < sampleCount; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = (i + 1) * (radialSegments + 1) + j;
        const c = (i + 1) * (radialSegments + 1) + (j + 1);
        const d = i * (radialSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Spherical End-Caps for 3D Tube Profiles
    if (stroke.brushType === 'tube' && sampleCount > 0 && sampledPoints.length > 0) {
      // Start Cap (hemisphere at i=0)
      const startP = sampledPoints[0] || new THREE.Vector3();
      const startTangent = frames.tangents?.[0] || new THREE.Vector3(1, 0, 0);
      const startNormal = frames.normals?.[0] || new THREE.Vector3(0, 1, 0);
      const startBinormal = frames.binormals?.[0] || new THREE.Vector3(0, 0, 1);
      const startRadius = spineRadii[0] || baseRadius;

      const capRings = 4;
      let prevRingStart = 0; // index of first ring (i=0)

      for (let ring = 1; ring <= capRings; ring++) {
        const ringT = ring / capRings;
        const phi = (ringT * Math.PI) * 0.5; // 0 to PI/2
        const ringScale = Math.cos(phi); // shrinks to 0
        const ringOffset = -Math.sin(phi) * startRadius; // pushes backward along -tangent

        const ringStartIndex = vertices.length / 3;

        if (ring === capRings) {
          // Tip apex point
          const apexX = startP.x + startTangent.x * ringOffset;
          const apexY = startP.y + startTangent.y * ringOffset;
          const apexZ = startP.z + startTangent.z * ringOffset;
          vertices.push(apexX, apexY, apexZ);
          colors.push(strokeColor.r, strokeColor.g, strokeColor.b);
          normals.push(-startTangent.x, -startTangent.y, -startTangent.z);
          uvs.push(0.5, 0);

          // Connect previous ring to apex
          for (let j = 0; j < radialSegments; j++) {
            const a = prevRingStart + j;
            const b = prevRingStart + j + 1;
            indices.push(b, a, ringStartIndex);
          }
        } else {
          for (let j = 0; j <= radialSegments; j++) {
            const v = (j / radialSegments) * Math.PI * 2;
            const cx = -Math.cos(v) * ringScale;
            const cy = Math.sin(v) * ringScale;

            const vx = startP.x + startRadius * (cx * startNormal.x + cy * startBinormal.x) + startTangent.x * ringOffset;
            const vy = startP.y + startRadius * (cx * startNormal.y + cy * startBinormal.y) + startTangent.y * ringOffset;
            const vz = startP.z + startRadius * (cx * startNormal.z + cy * startBinormal.z) + startTangent.z * ringOffset;

            vertices.push(vx, vy, vz);
            colors.push(strokeColor.r, strokeColor.g, strokeColor.b);

            const nx = cx * startNormal.x + cy * startBinormal.x - startTangent.x * Math.sin(phi);
            const ny = cx * startNormal.y + cy * startBinormal.y - startTangent.y * Math.sin(phi);
            const nz = cx * startNormal.z + cy * startBinormal.z - startTangent.z * Math.sin(phi);
            const nLen = Math.hypot(nx, ny, nz) || 1;
            normals.push(nx / nLen, ny / nLen, nz / nLen);
            uvs.push(j / radialSegments, 0);
          }

          // Connect prev ring to this ring
          for (let j = 0; j < radialSegments; j++) {
            const a = prevRingStart + j;
            const b = ringStartIndex + j;
            const c = ringStartIndex + j + 1;
            const d = prevRingStart + j + 1;
            indices.push(d, a, b);
            indices.push(d, b, c);
          }
          prevRingStart = ringStartIndex;
        }
      }

      // End Cap (hemisphere at i=sampleCount)
      const lastIdx = Math.min(sampleCount, sampledPoints.length - 1);
      const endP = sampledPoints[lastIdx] || startP;
      const endTangent = frames.tangents?.[lastIdx] || startTangent;
      const endNormal = frames.normals?.[lastIdx] || startNormal;
      const endBinormal = frames.binormals?.[lastIdx] || startBinormal;
      const endRadius = spineRadii[lastIdx] || baseRadius;

      let prevEndRingStart = sampleCount * (radialSegments + 1);

      for (let ring = 1; ring <= capRings; ring++) {
        const ringT = ring / capRings;
        const phi = (ringT * Math.PI) * 0.5;
        const ringScale = Math.cos(phi);
        const ringOffset = Math.sin(phi) * endRadius; // pushes forward along +tangent

        const ringStartIndex = vertices.length / 3;

        if (ring === capRings) {
          // Tip apex point
          const apexX = endP.x + endTangent.x * ringOffset;
          const apexY = endP.y + endTangent.y * ringOffset;
          const apexZ = endP.z + endTangent.z * ringOffset;
          vertices.push(apexX, apexY, apexZ);
          colors.push(strokeColor.r, strokeColor.g, strokeColor.b);
          normals.push(endTangent.x, endTangent.y, endTangent.z);
          uvs.push(0.5, 1);

          for (let j = 0; j < radialSegments; j++) {
            const a = prevEndRingStart + j;
            const b = prevEndRingStart + j + 1;
            indices.push(a, b, ringStartIndex);
          }
        } else {
          for (let j = 0; j <= radialSegments; j++) {
            const v = (j / radialSegments) * Math.PI * 2;
            const cx = -Math.cos(v) * ringScale;
            const cy = Math.sin(v) * ringScale;

            const vx = endP.x + endRadius * (cx * endNormal.x + cy * endBinormal.x) + endTangent.x * ringOffset;
            const vy = endP.y + endRadius * (cx * endNormal.y + cy * endBinormal.y) + endTangent.y * ringOffset;
            const vz = endP.z + endRadius * (cx * endNormal.z + cy * endBinormal.z) + endTangent.z * ringOffset;

            vertices.push(vx, vy, vz);
            colors.push(strokeColor.r, strokeColor.g, strokeColor.b);

            const nx = cx * endNormal.x + cy * endBinormal.x + endTangent.x * Math.sin(phi);
            const ny = cx * endNormal.y + cy * endBinormal.y + endTangent.y * Math.sin(phi);
            const nz = cx * endNormal.z + cy * endBinormal.z + endTangent.z * Math.sin(phi);
            const nLen = Math.hypot(nx, ny, nz) || 1;
            normals.push(nx / nLen, ny / nLen, nz / nLen);
            uvs.push(j / radialSegments, 1);
          }

          for (let j = 0; j < radialSegments; j++) {
            const a = prevEndRingStart + j;
            const b = ringStartIndex + j;
            const c = ringStartIndex + j + 1;
            const d = prevEndRingStart + j + 1;
            indices.push(a, d, b);
            indices.push(b, d, c);
          }
          prevEndRingStart = ringStartIndex;
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Algorithmic Draw Shape recognition and tension snapping (Line, Arc, Circle)
   */
  static snapStrokeToShape(points: Point3D[], tension: number = 0.5): Point3D[] {
    const validPoints = points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number');
    if (validPoints.length < 3) return validPoints.length > 0 ? validPoints : points;

    const start = validPoints[0];
    const end = validPoints[validPoints.length - 1];
    const totalDist = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);

    // Check if loop/closed circle
    const isClosed = totalDist < 0.2 && validPoints.length > 8;

    if (isClosed) {
      // Calculate center & average radius
      let avgX = 0, avgY = 0, avgZ = 0;
      for (const p of validPoints) {
        avgX += p.x; avgY += p.y; avgZ += p.z;
      }
      avgX /= validPoints.length; avgY /= validPoints.length; avgZ /= validPoints.length;
      
      let avgRadius = 0;
      for (const p of validPoints) {
        avgRadius += Math.hypot(p.x - avgX, p.y - avgY, p.z - avgZ);
      }
      avgRadius /= validPoints.length;

      // Construct a regular circle lying on best-fit plane
      const circlePoints: Point3D[] = [];
      const numPts = 32;
      for (let i = 0; i <= numPts; i++) {
        const theta = (i / numPts) * Math.PI * 2;
        circlePoints.push({
          x: avgX + Math.cos(theta) * avgRadius,
          y: avgY + Math.sin(theta) * avgRadius,
          z: avgZ,
          pressure: 0.8,
        });
      }
      return circlePoints;
    }

    // Measure deviation from straight line
    let maxDev = 0;
    let midPoint = validPoints[Math.floor(validPoints.length / 2)] || start;
    for (const p of validPoints) {
      // Distance from point to line segment (start-end)
      const v = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z).normalize();
      const pt = new THREE.Vector3(p.x - start.x, p.y - start.y, p.z - start.z);
      const proj = pt.dot(v);
      const perp = pt.clone().sub(v.clone().multiplyScalar(proj));
      const d = perp.length();
      if (d > maxDev) maxDev = d;
    }

    // Straight line snap threshold
    if (maxDev < 0.08 * totalDist || tension > 0.85) {
      // Generate clean straight line
      const linePoints: Point3D[] = [];
      const segments = 12;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        linePoints.push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
          z: start.z + (end.z - start.z) * t,
          pressure: (start.pressure || 0.8) + ((end.pressure || 0.8) - (start.pressure || 0.8)) * t,
        });
      }
      return linePoints;
    }

    // Otherwise snap to smooth parametric arc with tension weighting
    const arcPoints: Point3D[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Quadratic bezier through start, control point (pull), end
      const u = 1 - t;
      const x = u * u * start.x + 2 * u * t * midPoint.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * midPoint.y + t * t * end.y;
      const z = u * u * start.z + 2 * u * t * midPoint.z + t * t * end.z;
      arcPoints.push({
        x, y, z,
        pressure: (start.pressure || 0.8) * u + (end.pressure || 0.8) * t,
      });
    }
    return arcPoints;
  }

  /**
   * Center-line intersection test for precision eraser
   */
  static doesRayIntersectCenterline(
    ray: THREE.Ray, 
    strokePoints: Point3D[], 
    tolerance: number = 0.12
  ): boolean {
    if (!strokePoints || strokePoints.length < 2) return false;
    const pts = strokePoints.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number');
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = new THREE.Vector3(pts[i].x, pts[i].y, pts[i].z);
      const p2 = new THREE.Vector3(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      const seg = new THREE.Line3(p1, p2);
      
      const ptOnRay = new THREE.Vector3();
      const ptOnSeg = new THREE.Vector3();
      ray.distanceSqToSegment(seg.start, seg.end, ptOnRay, ptOnSeg);
      
      if (ptOnRay.distanceTo(ptOnSeg) <= tolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Bounding sphere/radius collision test for Vacuum eraser
   */
  static doesRayTouchStrokeEnvelope(
    ray: THREE.Ray, 
    stroke: Stroke, 
    vacuumRadius: number = 0.35
  ): boolean {
    if (!stroke || !stroke.points) return false;
    const totalTolerance = vacuumRadius + ((stroke.size || 10) / 1000) * 0.5;
    return this.doesRayIntersectCenterline(ray, stroke.points, totalTolerance);
  }

  /**
   * Generate a 3D Guide surface mesh (Plane perpendicular to camera or Primitive)
   */
  static createGuideGeometry(guide: Guide3D): THREE.BufferGeometry {
    switch (guide.type) {
      case 'cube':
        return new THREE.BoxGeometry(guide.width, guide.height, guide.depth || guide.width, guide.segments, guide.segments, guide.segments);
      case 'pyramid':
        return new THREE.ConeGeometry(guide.width * 0.5, guide.height, Math.max(3, guide.segments));
      case 'sphere':
        return new THREE.SphereGeometry(guide.width * 0.5, guide.segments * 2, guide.segments);
      case 'tube':
        return new THREE.CylinderGeometry(guide.width * 0.5, guide.width * 0.5, guide.height, guide.segments, 4, true);
      case 'plane':
      default: {
        if (guide.bentPath && guide.bentPath.length >= 2) {
          return this.createBentPlaneGeometry(guide);
        }
        return new THREE.PlaneGeometry(guide.width, guide.height, guide.segments, guide.segments);
      }
    }
  }

  /**
   * Bends a 3D Guide along a secondary drawn trajectory anchored at the origin line
   */
  static createBentPlaneGeometry(guide: Guide3D): THREE.BufferGeometry {
    if (!guide || !guide.bentPath || guide.bentPath.length < 2) {
      return new THREE.PlaneGeometry(guide?.width || 2, guide?.height || 2, guide?.segments || 16, guide?.segments || 16);
    }
    const path = guide.bentPath.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number');
    if (path.length < 2) {
      return new THREE.PlaneGeometry(guide.width || 2, guide.height || 2, guide.segments || 16, guide.segments || 16);
    }
    const segsX = Math.max(12, path.length * 2);
    const segsY = guide.segments || 16;
    const halfH = (guide.height || 2) * 0.5;

    const vectors = path.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const curve = new THREE.CatmullRomCurve3(vectors);
    const sampledPoints = curve.getPoints(segsX);
    const frames = curve.computeFrenetFrames(segsX, false);

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segsX; i++) {
      const pt = sampledPoints[i] || sampledPoints[0] || new THREE.Vector3();
      const binormal = frames.binormals?.[i] || new THREE.Vector3(0, 0, 1);

      for (let j = 0; j <= segsY; j++) {
        const vFrac = (j / segsY) - 0.5;
        const offset = halfH * vFrac * 2;

        const vx = pt.x + binormal.x * offset;
        const vy = pt.y + binormal.y * offset;
        const vz = pt.z + binormal.z * offset;

        vertices.push(vx, vy, vz);
        uvs.push(i / segsX, j / segsY);
      }
    }

    for (let i = 0; i < segsX; i++) {
      for (let j = 0; j < segsY; j++) {
        const a = i * (segsY + 1) + j;
        const b = (i + 1) * (segsY + 1) + j;
        const c = (i + 1) * (segsY + 1) + (j + 1);
        const d = i * (segsY + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Lofting algorithm between two or more curves with tension weighting
   */
  static createLoftGeometry(strokes: Stroke[], tension: number = 0.5): THREE.BufferGeometry {
    if (!strokes || strokes.length < 2) return new THREE.BufferGeometry();

    const samplePerCurve = 24;
    const curvePoints: THREE.Vector3[][] = [];

    for (const s of strokes) {
      if (!s || !s.points) continue;
      const validPoints = s.points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number');
      if (validPoints.length < 2) continue;
      const v = validPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
      const c = new THREE.CatmullRomCurve3(v, false, 'centripetal', tension);
      curvePoints.push(c.getPoints(samplePerCurve));
    }

    if (curvePoints.length < 2) return new THREE.BufferGeometry();

    const numRails = curvePoints.length;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Interpolate across rail curves
    const crossResolution = 16;
    for (let i = 0; i <= samplePerCurve; i++) {
      const railPts = curvePoints.map(pts => pts[i] || pts[0] || new THREE.Vector3());
      const crossCurve = new THREE.CatmullRomCurve3(railPts, false, 'centripetal', tension);
      const crossPts = crossCurve.getPoints(crossResolution);

      for (let j = 0; j <= crossResolution; j++) {
        const pt = crossPts[j] || crossPts[0] || new THREE.Vector3();
        vertices.push(pt.x, pt.y, pt.z);
        uvs.push(i / samplePerCurve, j / crossResolution);
      }
    }

    for (let i = 0; i < samplePerCurve; i++) {
      for (let j = 0; j < crossResolution; j++) {
        const a = i * (crossResolution + 1) + j;
        const b = (i + 1) * (crossResolution + 1) + j;
        const c = (i + 1) * (crossResolution + 1) + (j + 1);
        const d = i * (crossResolution + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * 3D Liquify deformer for curves
   */
  static applyLiquify(
    stroke: Stroke,
    cursorWorld: THREE.Vector3,
    dragDelta: THREE.Vector3,
    mode: LiquifyMode,
    size: number,
    range: number,
    strength: number
  ): Stroke {
    if (!stroke || !stroke.points) return stroke;
    const radius = size;
    const innerRadius = radius * range;
    const updatedPoints = stroke.points.map(p => {
      if (!p || typeof p.x !== 'number') return p;
      const ptVec = new THREE.Vector3(p.x, p.y, p.z);
      const dist = ptVec.distanceTo(cursorWorld);

      if (dist > radius) {
        return { ...p };
      }

      // Calculate smooth falloff
      let falloff = 1.0;
      if (dist > innerRadius) {
        falloff = 1.0 - (dist - innerRadius) / (radius - innerRadius);
        falloff = Math.max(0, Math.min(1, falloff * falloff * (3 - 2 * falloff))); // Smoothstep
      }

      const factor = strength * falloff;
      let newX = p.x;
      let newY = p.y;
      let newZ = p.z;

      if (mode === 'push') {
        newX += (dragDelta?.x ?? 0) * factor;
        newY += (dragDelta?.y ?? 0) * factor;
        newZ += (dragDelta?.z ?? 0) * factor;
      } else if (mode === 'pinch') {
        // Pull towards cursor or push away
        const dir = cursorWorld.clone().sub(ptVec).normalize();
        newX += dir.x * factor * 0.1;
        newY += dir.y * factor * 0.1;
        newZ += dir.z * factor * 0.1;
      } else if (mode === 'comb') {
        // Average along drag tangent
        newX += (dragDelta?.x ?? 0) * factor * 0.5;
        newY += (dragDelta?.y ?? 0) * factor * 0.5;
        newZ += (dragDelta?.z ?? 0) * factor * 0.5;
      }

      return {
        ...p,
        x: newX,
        y: newY,
        z: newZ,
      };
    });

    return {
      ...stroke,
      points: updatedPoints,
    };
  }

  /**
   * Real-time Mirror symmetry duplication across coordinate axes
   */
  static mirrorStroke(stroke: Stroke, axis: 'x' | 'y' | 'z'): Stroke {
    if (!stroke || !stroke.points) return stroke;
    const mirroredPoints = stroke.points.map(p => ({
      ...p,
      x: axis === 'x' ? -(p?.x ?? 0) : (p?.x ?? 0),
      y: axis === 'y' ? -(p?.y ?? 0) : (p?.y ?? 0),
      z: axis === 'z' ? -(p?.z ?? 0) : (p?.z ?? 0),
    }));

    return {
      ...stroke,
      id: 'stroke-' + Math.random().toString(36).substring(2, 9),
      points: mirroredPoints,
      createdAt: Date.now(),
    };
  }

  /**
   * Lighten (Mesh decimation) algorithm: reduces point count by removing redundant co-linear points
   */
  static decimateStroke(stroke: Stroke, tolerance: number = 0.02): Stroke {
    if (!stroke || !stroke.points || stroke.points.length <= 4) return stroke;
    const validPts = stroke.points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number');
    if (validPts.length <= 4) return stroke;

    const filtered: Point3D[] = [validPts[0]];
    for (let i = 1; i < validPts.length - 1; i++) {
      const prev = filtered[filtered.length - 1];
      const curr = validPts[i];
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y, curr.z - prev.z);
      if (dist >= tolerance) {
        filtered.push(curr);
      }
    }
    filtered.push(validPts[validPts.length - 1]);

    return {
      ...stroke,
      points: filtered,
    };
  }

  /**
   * Real-time Radial Symmetry Array generator (3X, 4X, 6X, 8X, 12X)
   * Rotates stroke copies around specified axis and center point
   */
  static createRadialArrayStrokes(
    stroke: Stroke,
    count: number,
    axis: 'x' | 'y' | 'z' = 'y',
    center: Point3D = { x: 0, y: 0, z: 0, pressure: 1 }
  ): Stroke[] {
    if (!stroke || !stroke.points || count <= 1) return [];

    const copies: Stroke[] = [];
    const stepAngle = (Math.PI * 2) / count;
    const cX = center?.x ?? 0;
    const cY = center?.y ?? 0;
    const cZ = center?.z ?? 0;

    for (let i = 1; i < count; i++) {
      const angle = stepAngle * i;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const rotatedPoints = stroke.points.map((p) => {
        if (!p || typeof p.x !== 'number') return p;
        const relX = p.x - cX;
        const relY = p.y - cY;
        const relZ = p.z - cZ;

        let rx = relX;
        let ry = relY;
        let rz = relZ;

        if (axis === 'y') {
          // Rotate around Y (horizontal turntable)
          rx = relX * cosA - relZ * sinA;
          rz = relX * sinA + relZ * cosA;
        } else if (axis === 'z') {
          // Rotate around Z (frontal dial)
          rx = relX * cosA - relY * sinA;
          ry = relX * sinA + relY * cosA;
        } else if (axis === 'x') {
          // Rotate around X (side wheel)
          ry = relY * cosA - relZ * sinA;
          rz = relY * sinA + relZ * cosA;
        }

        return {
          ...p,
          x: rx + cX,
          y: ry + cY,
          z: rz + cZ,
        };
      });

      copies.push({
        ...stroke,
        id: 'radial-' + Math.random().toString(36).substring(2, 9),
        points: rotatedPoints,
        createdAt: Date.now(),
      });
    }

    return copies;
  }

  /**
   * Post-draw curve smoothing / resimplification
   * Applies weighted Laplacian smoothing to remove unwanted hand jitters while keeping curve length & endpoints intact
   */
  static smoothStroke(stroke: Stroke, strength: number = 0.5, iterations: number = 2): Stroke {
    if (!stroke || !stroke.points || stroke.points.length <= 3) return stroke;

    let pts = stroke.points.map((p) => ({ ...p }));
    const n = pts.length;

    for (let iter = 0; iter < iterations; iter++) {
      const nextPts = pts.map((p) => ({ ...p }));
      for (let i = 1; i < n - 1; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const next = pts[i + 1];
        if (!prev || !curr || !next) continue;

        // Weighted centroid between neighbors
        const avgX = ((prev.x ?? 0) + (next.x ?? 0)) * 0.5;
        const avgY = ((prev.y ?? 0) + (next.y ?? 0)) * 0.5;
        const avgZ = ((prev.z ?? 0) + (next.z ?? 0)) * 0.5;

        nextPts[i].x = (curr.x ?? 0) * (1 - strength) + avgX * strength;
        nextPts[i].y = (curr.y ?? 0) * (1 - strength) + avgY * strength;
        nextPts[i].z = (curr.z ?? 0) * (1 - strength) + avgZ * strength;

        // Smooth pressure if sensitive
        if (stroke.pressureSensitive) {
          const avgPress = ((prev.pressure ?? 0.8) + (next.pressure ?? 0.8)) * 0.5;
          nextPts[i].pressure = (curr.pressure ?? 0.8) * (1 - strength) + avgPress * strength;
        }
      }
      pts = nextPts;
    }

    return {
      ...stroke,
      points: pts,
    };
  }

  /**
   * Alias for createStrokeMesh
   */
  static createStrokeGeometry(stroke: Stroke, targetMeshes: THREE.Mesh[] = []): THREE.BufferGeometry {
    return this.createStrokeMesh(stroke, targetMeshes);
  }

  /**
   * Real-time Stable Strokes stabilization filter (weighted moving average & pull string)
   */
  static applyStableStrokeFilter(points: Point3D[], strength: number = 0.5): Point3D[] {
    if (!points || points.length <= 2) return points;
    const factor = Math.max(0.05, Math.min(0.95, strength));
    const smoothed: Point3D[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prev = smoothed[i - 1];
      const curr = points[i];

      const x = (prev.x ?? 0) * factor + (curr.x ?? 0) * (1 - factor);
      const y = (prev.y ?? 0) * factor + (curr.y ?? 0) * (1 - factor);
      const z = (prev.z ?? 0) * factor + (curr.z ?? 0) * (1 - factor);
      const pressure = (prev.pressure ?? 0.8) * factor + (curr.pressure ?? 0.8) * (1 - factor);

      smoothed.push({
        ...curr,
        x,
        y,
        z,
        pressure,
      });
    }

    return smoothed;
  }

  /**
   * Calculates 3D Axis-Aligned Bounding Box for strokes
   */
  static computeStrokesBoundingBox(strokes: Stroke[]): {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
    size: THREE.Vector3;
  } | null {
    if (!strokes || strokes.length === 0) return null;

    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    let hasPoints = false;

    for (const stroke of strokes) {
      if (!stroke || !stroke.points) continue;
      for (const p of stroke.points) {
        if (!p || typeof p.x !== 'number') continue;
        hasPoints = true;
        min.x = Math.min(min.x, p.x);
        min.y = Math.min(min.y, p.y);
        min.z = Math.min(min.z, p.z);

        max.x = Math.max(max.x, p.x);
        max.y = Math.max(max.y, p.y);
        max.z = Math.max(max.z, p.z);
      }
    }

    if (!hasPoints) return null;

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const size = new THREE.Vector3().subVectors(max, min);

    return { min, max, center, size };
  }

  /**
   * Spatial 3D transformation (translation, Euler rotation, scale around pivot)
   */
  static transformStrokes(
    strokes: Stroke[],
    translation: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number },
    pivot: { x: number; y: number; z: number }
  ): Stroke[] {
    if (!strokes) return [];
    const tX = translation?.x ?? 0;
    const tY = translation?.y ?? 0;
    const tZ = translation?.z ?? 0;
    const rX = rotation?.x ?? 0;
    const rY = rotation?.y ?? 0;
    const rZ = rotation?.z ?? 0;
    const sX = scale?.x ?? 1;
    const sY = scale?.y ?? 1;
    const sZ = scale?.z ?? 1;
    const pX = pivot?.x ?? 0;
    const pY = pivot?.y ?? 0;
    const pZ = pivot?.z ?? 0;

    const euler = new THREE.Euler(rX, rY, rZ, 'XYZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);

    return strokes.map((stroke) => {
      if (!stroke || !stroke.points) return stroke;
      const transformedPoints = stroke.points.map((p) => {
        if (!p || typeof p.x !== 'number') return p;
        const v = new THREE.Vector3(p.x - pX, p.y - pY, p.z - pZ);
        // Scale
        v.x *= sX;
        v.y *= sY;
        v.z *= sZ;
        // Rotate
        v.applyQuaternion(quat);
        // Translate + pivot back
        v.x += pX + tX;
        v.y += pY + tY;
        v.z += pZ + tZ;

        return {
          ...p,
          x: v.x,
          y: v.y,
          z: v.z,
        };
      });

      return {
        ...stroke,
        points: transformedPoints,
      };
    });
  }

  /**
   * Screen-Space 2D transformation (translates, rotates, and scales aligned to camera view matrix)
   */
  static transformStrokesScreenSpace(
    strokes: Stroke[],
    screenDelta: { x: number; y: number },
    screenRotationRad: number,
    screenScale: { x: number; y: number; z: number },
    cameraRight: { x: number; y: number; z: number },
    cameraUp: { x: number; y: number; z: number },
    cameraForward: { x: number; y: number; z: number },
    pivot: { x: number; y: number; z: number }
  ): Stroke[] {
    if (!strokes) return [];
    const right = new THREE.Vector3(cameraRight.x, cameraRight.y, cameraRight.z).normalize();
    const up = new THREE.Vector3(cameraUp.x, cameraUp.y, cameraUp.z).normalize();
    const forward = new THREE.Vector3(cameraForward.x, cameraForward.y, cameraForward.z).normalize();

    // Translation vector in 3D world space
    const trans = new THREE.Vector3()
      .addScaledVector(right, screenDelta.x)
      .addScaledVector(up, screenDelta.y);

    // Rotation quaternion around camera forward vector (screen normal)
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(forward, screenRotationRad);

    const pX = pivot?.x ?? 0;
    const pY = pivot?.y ?? 0;
    const pZ = pivot?.z ?? 0;

    return strokes.map((stroke) => {
      if (!stroke || !stroke.points) return stroke;
      const transformedPoints = stroke.points.map((p) => {
        if (!p || typeof p.x !== 'number') return p;
        // Vector relative to screen-space pivot
        const v = new THREE.Vector3(p.x - pX, p.y - pY, p.z - pZ);

        // Project v into camera basis: (compRight, compUp, compForward)
        const compRight = v.dot(right);
        const compUp = v.dot(up);
        const compForward = v.dot(forward);

        // Scale along camera basis
        const scaledV = new THREE.Vector3()
          .addScaledVector(right, compRight * (screenScale.x ?? 1))
          .addScaledVector(up, compUp * (screenScale.y ?? 1))
          .addScaledVector(forward, compForward * (screenScale.z ?? 1));

        // Rotate around camera forward vector
        scaledV.applyQuaternion(rotQuat);

        // Translate + restore pivot
        scaledV.add(trans);
        scaledV.x += pX;
        scaledV.y += pY;
        scaledV.z += pZ;

        return {
          ...p,
          x: scaledV.x,
          y: scaledV.y,
          z: scaledV.z,
        };
      });

      return {
        ...stroke,
        points: transformedPoints,
      };
    });
  }

  /**
   * Export all visible groups to standard OBJ format
   */
  static exportToOBJ(strokes: Stroke[]): string {
    let objText = '# Feather 3D Exported Model\n# Units: 1 unit = 1000mm\n\n';
    let vertexOffset = 1;

    for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
      const stroke = strokes[sIdx];
      const geo = this.createStrokeMesh(stroke);
      const pos = geo.getAttribute('position');
      const norm = geo.getAttribute('normal');
      const idx = geo.getIndex();

      if (!pos || !idx) continue;

      objText += `o Stroke_${stroke.id}\n`;
      objText += `usemtl Mtl_${stroke.material}_${stroke.color.replace('#', '')}\n`;

      // Vertices
      for (let i = 0; i < pos.count; i++) {
        objText += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
      }
      // Normals
      if (norm) {
        for (let i = 0; i < norm.count; i++) {
          objText += `vn ${norm.getX(i).toFixed(4)} ${norm.getY(i).toFixed(4)} ${norm.getZ(i).toFixed(4)}\n`;
        }
      }
      // Faces
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i) + vertexOffset;
        const b = idx.getX(i + 1) + vertexOffset;
        const c = idx.getX(i + 2) + vertexOffset;
        objText += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      }
      vertexOffset += pos.count;
      objText += '\n';
    }

    return objText;
  }
}
