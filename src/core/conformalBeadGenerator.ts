import * as THREE from 'three';
import { StrokePoint, BrushSettings, StrokeProfile } from '../types';

/**
 * Volumetric Stroke Geometry Generator
 * Supports 4 distinct geometric profiles:
 * - Tube: 360-degree cylindrical 3D mesh with spherical end-caps (equal volume from all angles)
 * - Ribbon: Flat tape-like cross-section aligned with drawing surface / plane
 * - Marker / Chisel: Asymmetric rectangular profile with calligraphic angle variation
 * - Conformal: Arched dome cross-section snapped to surface curvature
 *
 * Includes real-time Stylus Pressure Dynamics & Catmull-Rom resampling.
 */
export class ConformalBeadGenerator {
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Builds volumetric stroke geometry from sampled points and brush profile settings
   */
  public generateGeometry(
    rawPoints: StrokePoint[],
    settings: BrushSettings,
    targetMeshes: THREE.Mesh[] = []
  ): THREE.BufferGeometry {
    if (!rawPoints || rawPoints.length === 0) {
      return new THREE.BufferGeometry();
    }

    // Filter micro-jitter
    const filteredPoints: StrokePoint[] = [rawPoints[0]];
    for (let i = 1; i < rawPoints.length; i++) {
      const prev = filteredPoints[filteredPoints.length - 1];
      const curr = rawPoints[i];
      if (prev.position.distanceTo(curr.position) > 0.0008) {
        filteredPoints.push(curr);
      }
    }

    const profile: StrokeProfile = settings.profile || 'conformal';

    // Handle single dab
    if (filteredPoints.length === 1) {
      return this.generateDabGeometry(filteredPoints[0], settings, profile, targetMeshes);
    }

    // Interpolate points along centripetal Catmull-Rom curve with surface snapping
    const { positions, normals, pressures } = this.resampleCurve(
      filteredPoints,
      settings.size,
      targetMeshes
    );
    const numPoints = positions.length;

    if (numPoints < 2) {
      return this.generateDabGeometry(filteredPoints[0], settings, profile, targetMeshes);
    }

    // Compute cumulative distances
    const cumulativeDistances: number[] = [0];
    let totalLength = 0;
    for (let i = 1; i < numPoints; i++) {
      totalLength += positions[i].distanceTo(positions[i - 1]);
      cumulativeDistances.push(totalLength);
    }

    const baseOffset = settings.surfaceOffset ?? 0.003;
    const taperLength = Math.max(0.01, settings.taperLength ?? 0.05);

    // Compute continuous tangent frames
    const tangents: THREE.Vector3[] = [];
    const binormals: THREE.Vector3[] = [];

    for (let i = 0; i < numPoints; i++) {
      const normal = normals[i].clone().normalize();

      let tangent = new THREE.Vector3();
      if (i === 0) {
        tangent.subVectors(positions[1], positions[0]);
      } else if (i === numPoints - 1) {
        tangent.subVectors(positions[numPoints - 1], positions[numPoints - 2]);
      } else {
        tangent.subVectors(positions[i + 1], positions[i - 1]);
      }

      if (tangent.lengthSq() < 1e-6) {
        tangent.set(1, 0, 0);
      } else {
        tangent.normalize();
      }

      const binormal = new THREE.Vector3().crossVectors(tangent, normal);
      if (binormal.lengthSq() < 1e-6) {
        binormal.crossVectors(normal, new THREE.Vector3(0, 1, 0));
        if (binormal.lengthSq() < 1e-6) {
          binormal.crossVectors(normal, new THREE.Vector3(1, 0, 0));
        }
      }
      binormal.normalize();
      tangent.crossVectors(normal, binormal).normalize();

      tangents.push(tangent);
      binormals.push(binormal);
    }

    switch (profile) {
      case 'tube':
        return this.buildTubeGeometry(
          positions,
          normals,
          binormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          baseOffset,
          taperLength
        );
      case 'ribbon':
        return this.buildRibbonGeometry(
          positions,
          normals,
          binormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          baseOffset,
          taperLength
        );
      case 'marker':
        return this.buildMarkerGeometry(
          positions,
          normals,
          binormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          baseOffset,
          taperLength
        );
      case 'conformal':
      default:
        return this.buildConformalGeometry(
          positions,
          normals,
          binormals,
          tangents,
          pressures,
          cumulativeDistances,
          totalLength,
          settings,
          targetMeshes,
          baseOffset,
          taperLength
        );
    }
  }

  /**
   * 1. Tube Profile: Full 3D Cylindrical Geometry with equal volume from all angles & spherical end caps
   */
  private buildTubeGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const radialSegments = 12;
    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < taperLength) {
        taper = Math.sin((t / taperLength) * (Math.PI / 2));
      } else if (t > 1.0 - taperLength) {
        taper = Math.sin(((1.0 - t) / taperLength) * (Math.PI / 2));
      }
      taper = Math.max(0.05, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const radius = settings.size * pressureScale * taper;

      const center = pos.clone().addScaledVector(normal, baseOffset + radius);

      for (let j = 0; j < radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const radialDir = binormal.clone().multiplyScalar(cosT).addScaledVector(normal, sinT).normalize();
        const vPos = center.clone().addScaledVector(radialDir, radius);

        vertices.push(vPos.x, vPos.y, vPos.z);
        geomNormals.push(radialDir.x, radialDir.y, radialDir.z);
        uvs.push(j / radialSegments, t);
      }
    }

    // Cylindrical ring faces
    for (let i = 0; i < numPoints - 1; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const nextJ = (j + 1) % radialSegments;
        const a = i * radialSegments + j;
        const b = (i + 1) * radialSegments + j;
        const c = (i + 1) * radialSegments + nextJ;
        const d = i * radialSegments + nextJ;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Spherical Start and End Caps
    this.addSphericalEndCap(vertices, geomNormals, uvs, indices, positions[0], normals[0], binormals[0], tangents[0], 0, radialSegments, settings.size * pressures[0], baseOffset, true);
    this.addSphericalEndCap(vertices, geomNormals, uvs, indices, positions[numPoints - 1], normals[numPoints - 1], binormals[numPoints - 1], tangents[numPoints - 1], (numPoints - 1) * radialSegments, radialSegments, settings.size * pressures[numPoints - 1], baseOffset, false);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * 2. Ribbon Profile: Flat Tape-Like Cross Section
   */
  private buildRibbonGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < taperLength) {
        taper = Math.sin((t / taperLength) * (Math.PI / 2));
      } else if (t > 1.0 - taperLength) {
        taper = Math.sin(((1.0 - t) / taperLength) * (Math.PI / 2));
      }
      taper = Math.max(0.05, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const width = settings.size * pressureScale * taper * 1.5;

      const elevatedPos = pos.clone().addScaledVector(normal, baseOffset);
      const left = elevatedPos.clone().addScaledVector(binormal, -width);
      const right = elevatedPos.clone().addScaledVector(binormal, width);

      vertices.push(left.x, left.y, left.z);
      geomNormals.push(normal.x, normal.y, normal.z);
      uvs.push(0.0, t);

      vertices.push(right.x, right.y, right.z);
      geomNormals.push(normal.x, normal.y, normal.z);
      uvs.push(1.0, t);
    }

    for (let i = 0; i < numPoints - 1; i++) {
      const a = i * 2;
      const b = (i + 1) * 2;
      const c = (i + 1) * 2 + 1;
      const d = i * 2 + 1;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * 3. Marker / Chisel Profile: Asymmetric Calligraphic Rectangular Profile
   */
  private buildMarkerGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const chiselAngleRad = ((settings.chiselAngle ?? 45) * Math.PI) / 180;
    const aspectRatio = settings.aspectRatio ?? 3.5; // width to thickness

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const tangent = tangents[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < taperLength) {
        taper = Math.sin((t / taperLength) * (Math.PI / 2));
      } else if (t > 1.0 - taperLength) {
        taper = Math.sin(((1.0 - t) / taperLength) * (Math.PI / 2));
      }
      taper = Math.max(0.05, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const baseRadius = settings.size * pressureScale * taper;
      const width = baseRadius * aspectRatio * 0.7;
      const height = baseRadius * 0.35;

      // Rotate chisel plane around surface normal by fixed chisel angle
      const chiselDir = binormal.clone().multiplyScalar(Math.cos(chiselAngleRad)).addScaledVector(tangent, Math.sin(chiselAngleRad)).normalize();

      const center = pos.clone().addScaledVector(normal, baseOffset + height);

      // 4 corners of rectangular chisel profile: Top-Left, Top-Right, Bottom-Right, Bottom-Left
      const pTL = center.clone().addScaledVector(chiselDir, -width).addScaledVector(normal, height);
      const pTR = center.clone().addScaledVector(chiselDir, width).addScaledVector(normal, height);
      const pBR = center.clone().addScaledVector(chiselDir, width).addScaledVector(normal, -height);
      const pBL = center.clone().addScaledVector(chiselDir, -width).addScaledVector(normal, -height);

      const corners = [pTL, pTR, pBR, pBL];
      for (let k = 0; k < 4; k++) {
        vertices.push(corners[k].x, corners[k].y, corners[k].z);
        geomNormals.push(normal.x, normal.y, normal.z);
        uvs.push(k / 3, t);
      }
    }

    for (let i = 0; i < numPoints - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const nextK = (k + 1) % 4;
        const a = i * 4 + k;
        const b = (i + 1) * 4 + k;
        const c = (i + 1) * 4 + nextK;
        const d = i * 4 + nextK;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * 4. Conformal Profile: Arched Dome Conformal Cross Section
   */
  private buildConformalGeometry(
    positions: THREE.Vector3[],
    normals: THREE.Vector3[],
    binormals: THREE.Vector3[],
    tangents: THREE.Vector3[],
    pressures: number[],
    cumulativeDistances: number[],
    totalLength: number,
    settings: BrushSettings,
    targetMeshes: THREE.Mesh[],
    baseOffset: number,
    taperLength: number
  ): THREE.BufferGeometry {
    const numPoints = positions.length;
    const segmentsAcross = Math.max(3, settings.archSegments || 5);
    const uValues: number[] = [];
    for (let j = 0; j < segmentsAcross; j++) {
      uValues.push(-1.0 + (2.0 * j) / (segmentsAcross - 1));
    }

    const vertices: number[] = [];
    const geomNormals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const domeFactor = settings.domeFactor || 0.22;

    for (let i = 0; i < numPoints; i++) {
      const pos = positions[i];
      const normal = normals[i];
      const binormal = binormals[i];
      const t = totalLength > 0 ? cumulativeDistances[i] / totalLength : i / (numPoints - 1);

      let taper = 1.0;
      if (t < taperLength) {
        taper = Math.sin((t / taperLength) * (Math.PI / 2));
      } else if (t > 1.0 - taperLength) {
        taper = Math.sin(((1.0 - t) / taperLength) * (Math.PI / 2));
      }
      taper = Math.max(0.02, Math.min(1.0, taper));

      const pressureScale = settings.pressureSensitivity ? Math.max(0.2, pressures[i]) : 1.0;
      const ringRadius = settings.size * pressureScale * taper;

      for (let j = 0; j < segmentsAcross; j++) {
        const u = uValues[j];
        const domeHeight = baseOffset + ringRadius * domeFactor * Math.sqrt(Math.max(0, 1.0 - u * u));
        const lateralOffset = u * ringRadius;

        const idealPos = pos.clone()
          .addScaledVector(binormal, lateralOffset)
          .addScaledVector(normal, domeHeight);

        let finalPos = idealPos;
        let finalNormal = normal.clone();

        if (targetMeshes.length > 0 && settings.silhouetteClamping) {
          const rayOrigin = pos.clone()
            .addScaledVector(binormal, lateralOffset)
            .addScaledVector(normal, ringRadius * 1.5 + baseOffset + 0.02);
          const rayDir = normal.clone().negate().normalize();

          this.raycaster.set(rayOrigin, rayDir);
          this.raycaster.far = ringRadius * 3.5 + baseOffset * 2 + 0.05;
          const hits = this.raycaster.intersectObjects(targetMeshes, false);

          if (hits.length > 0 && hits[0].point) {
            const hit = hits[0];
            const hitNormal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize() : normal;
            finalPos = hit.point.clone().addScaledVector(hitNormal, domeHeight);
            finalNormal = hitNormal;
          } else {
            const clampedLateral = u * ringRadius * 0.4;
            finalPos = pos.clone()
              .addScaledVector(binormal, clampedLateral)
              .addScaledVector(normal, baseOffset * 0.8);
          }
        }

        const archNormal = normal.clone().addScaledVector(binormal, u * 0.4).normalize();

        vertices.push(finalPos.x, finalPos.y, finalPos.z);
        geomNormals.push(archNormal.x, archNormal.y, archNormal.z);
        uvs.push((u + 1.0) * 0.5, t);
      }
    }

    for (let i = 0; i < numPoints - 1; i++) {
      for (let j = 0; j < segmentsAcross - 1; j++) {
        const a = i * segmentsAcross + j;
        const b = (i + 1) * segmentsAcross + j;
        const c = (i + 1) * segmentsAcross + (j + 1);
        const d = i * segmentsAcross + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Add Start and End Caps
    this.addEndCap(vertices, geomNormals, uvs, indices, positions[0], normals[0], binormals[0], tangents[0], 0, segmentsAcross, settings.size * pressures[0], baseOffset, true);
    this.addEndCap(vertices, geomNormals, uvs, indices, positions[numPoints - 1], normals[numPoints - 1], binormals[numPoints - 1], tangents[numPoints - 1], (numPoints - 1) * segmentsAcross, segmentsAcross, settings.size * pressures[numPoints - 1], baseOffset, false);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geomNormals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Adds rounded dome cap for conformal profile
   */
  private addEndCap(
    vertices: number[],
    geomNormals: number[],
    uvs: number[],
    indices: number[],
    centerPos: THREE.Vector3,
    normal: THREE.Vector3,
    binormal: THREE.Vector3,
    tangent: THREE.Vector3,
    ringStartIndex: number,
    segmentsAcross: number,
    radius: number,
    baseOffset: number,
    isStart: boolean
  ): void {
    const tipDir = isStart ? tangent.clone().negate() : tangent.clone();
    const tipPos = centerPos.clone()
      .addScaledVector(tipDir, radius * 0.35)
      .addScaledVector(normal, baseOffset + radius * 0.15);

    const tipVertexIdx = vertices.length / 3;
    vertices.push(tipPos.x, tipPos.y, tipPos.z);
    geomNormals.push(normal.x, normal.y, normal.z);
    uvs.push(0.5, isStart ? 0.0 : 1.0);

    for (let j = 0; j < segmentsAcross - 1; j++) {
      const ringA = ringStartIndex + j;
      const ringB = ringStartIndex + j + 1;
      if (isStart) {
        indices.push(tipVertexIdx, ringB, ringA);
      } else {
        indices.push(tipVertexIdx, ringA, ringB);
      }
    }
  }

  /**
   * Adds spherical cap for tube profile
   */
  private addSphericalEndCap(
    vertices: number[],
    geomNormals: number[],
    uvs: number[],
    indices: number[],
    centerPos: THREE.Vector3,
    normal: THREE.Vector3,
    binormal: THREE.Vector3,
    tangent: THREE.Vector3,
    ringStartIndex: number,
    radialSegments: number,
    radius: number,
    baseOffset: number,
    isStart: boolean
  ): void {
    const tipDir = isStart ? tangent.clone().negate() : tangent.clone();
    const tipPos = centerPos.clone()
      .addScaledVector(normal, baseOffset + radius)
      .addScaledVector(tipDir, radius);

    const tipIdx = vertices.length / 3;
    vertices.push(tipPos.x, tipPos.y, tipPos.z);
    geomNormals.push(tipDir.x, tipDir.y, tipDir.z);
    uvs.push(0.5, isStart ? 0.0 : 1.0);

    for (let j = 0; j < radialSegments; j++) {
      const nextJ = (j + 1) % radialSegments;
      const a = ringStartIndex + j;
      const b = ringStartIndex + nextJ;
      if (isStart) {
        indices.push(tipIdx, b, a);
      } else {
        indices.push(tipIdx, a, b);
      }
    }
  }

  /**
   * Generates a dab geometry for single-point clicks across profiles
   */
  private generateDabGeometry(
    point: StrokePoint,
    settings: BrushSettings,
    profile: StrokeProfile,
    targetMeshes: THREE.Mesh[] = []
  ): THREE.BufferGeometry {
    const normal = point.normal.clone().normalize();
    const pressureScale = settings.pressureSensitivity ? Math.max(0.3, point.pressure) : 1.0;
    const radius = settings.size * pressureScale;
    const baseOffset = settings.surfaceOffset ?? 0.0025;

    let tangent = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.y) > 0.9) {
      tangent.set(1, 0, 0);
    }
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    tangent.crossVectors(binormal, normal).normalize();

    const radialSegments = profile === 'marker' ? 4 : 12;
    const rings = 3;
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const apexHeight = baseOffset + radius * (profile === 'tube' ? 1.0 : 0.18);
    const apex = point.position.clone().addScaledVector(normal, apexHeight);
    vertices.push(apex.x, apex.y, apex.z);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(0.5, 0.5);

    for (let r = 1; r <= rings; r++) {
      const ringFraction = r / rings;
      const ringRadius = radius * ringFraction;
      const domeHeight = baseOffset + radius * 0.18 * Math.sqrt(Math.max(0, 1.0 - ringFraction * ringFraction));

      for (let s = 0; s < radialSegments; s++) {
        const theta = (s / radialSegments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const vPos = point.position.clone()
          .addScaledVector(tangent, cosT * ringRadius)
          .addScaledVector(binormal, sinT * ringRadius)
          .addScaledVector(normal, domeHeight);

        const vNorm = normal.clone()
          .addScaledVector(tangent, cosT * 0.3)
          .addScaledVector(binormal, sinT * 0.3)
          .normalize();

        vertices.push(vPos.x, vPos.y, vPos.z);
        normals.push(vNorm.x, vNorm.y, vNorm.z);
        uvs.push(0.5 + cosT * ringFraction * 0.5, 0.5 + sinT * ringFraction * 0.5);
      }
    }

    for (let s = 0; s < radialSegments; s++) {
      const nextS = (s + 1) % radialSegments;
      indices.push(0, 1 + nextS, 1 + s);
    }

    for (let r = 0; r < rings - 1; r++) {
      const r1 = 1 + r * radialSegments;
      const r2 = 1 + (r + 1) * radialSegments;
      for (let s = 0; s < radialSegments; s++) {
        const nextS = (s + 1) % radialSegments;
        const a = r1 + s;
        const b = r1 + nextS;
        const c = r2 + nextS;
        const d = r2 + s;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Resamples raw points using centripetal Catmull-Rom spline interpolation
   */
  private resampleCurve(
    points: StrokePoint[],
    brushSize: number,
    targetMeshes: THREE.Mesh[] = []
  ): { positions: THREE.Vector3[]; normals: THREE.Vector3[]; pressures: number[] } {
    if (points.length < 2) {
      return {
        positions: points.map((p) => p.position.clone()),
        normals: points.map((p) => p.normal.clone()),
        pressures: points.map((p) => p.pressure),
      };
    }

    const vectorPoints = points.map((p) => p.position);
    const curve = new THREE.CatmullRomCurve3(vectorPoints, false, 'centripetal', 0.5);

    const stepSize = Math.max(0.005, brushSize * 0.35);
    const length = curve.getLength();
    const divisions = Math.max(4, Math.min(180, Math.ceil(length / stepSize)));

    const rawPoints = curve.getPoints(divisions);
    const sampledPositions: THREE.Vector3[] = [];
    const sampledNormals: THREE.Vector3[] = [];
    const sampledPressures: number[] = [];

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      const rawIndex = t * (points.length - 1);
      const idxA = Math.floor(rawIndex);
      const idxB = Math.min(points.length - 1, idxA + 1);
      const frac = rawIndex - idxA;

      const normA = points[idxA].normal;
      const normB = points[idxB].normal;
      const interpNorm = new THREE.Vector3().copy(normA).lerp(normB, frac).normalize();
      const pos = rawPoints[i].clone();

      sampledPositions.push(pos);
      sampledNormals.push(interpNorm);

      const pressA = points[idxA].pressure || 1.0;
      const pressB = points[idxB].pressure || 1.0;
      sampledPressures.push(pressA + (pressB - pressA) * frac);
    }

    return {
      positions: sampledPositions,
      normals: sampledNormals,
      pressures: sampledPressures,
    };
  }
}

