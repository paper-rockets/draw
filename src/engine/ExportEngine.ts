import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Stroke, SpatialGroup, NoteProject, Guide3D, CameraBookmark } from '../types';
import { GeometryEngine } from './GeometryEngine';
import { RenderEngine } from './RenderEngine';

export interface GLTFExportOptions {
  binary?: boolean; // .glb (true) vs .gltf (false)
  includeVertexColors?: boolean; // include COLOR_0 attribute
  includeMaterials?: boolean; // PBR / KHR_materials_unlit
  includeTextures?: boolean; // embed procedural patterns
  includeHierarchy?: boolean; // maintain spatial group hierarchy
  includeCameras?: boolean; // export camera bookmarks as glTF cameras
  includeGuides?: boolean; // export 3D reference guides
  onlyVisibleGroups?: boolean; // export visible groups only
  pbrRoughness?: number; // base roughness factor (0.0 to 1.0)
  pbrMetallic?: number; // base metallic factor (0.0 to 1.0)
}

export interface ExportSceneStats {
  totalStrokes: number;
  totalVertices: number;
  totalTriangles: number;
  totalGroups: number;
}

export class ExportEngine {
  /**
   * Calculates detailed statistics for strokes and group hierarchy
   */
  static computeSceneStats(
    strokes: Stroke[],
    groups: SpatialGroup[],
    onlyVisible: boolean = true
  ): ExportSceneStats {
    const visibleGroupIds = new Set(
      groups.filter((g) => (!onlyVisible || g.visible)).map((g) => g.id)
    );
    const targetStrokes = strokes.filter((s) => visibleGroupIds.has(s.groupId));

    let totalVertices = 0;
    let totalTriangles = 0;

    for (const stroke of targetStrokes) {
      const sampleCount = Math.max(1, (stroke.points?.length || 0) * 4);
      const radialSegments = stroke.brushType === 'ribbon' ? 4 : (stroke.brushType === 'marker' ? 8 : 12);
      
      // Main tube/ribbon vertices & triangles
      const mainVerts = (sampleCount + 1) * (radialSegments + 1);
      const mainTris = sampleCount * radialSegments * 2;

      // End caps for tube strokes
      let capVerts = 0;
      let capTris = 0;
      if (stroke.brushType === 'tube' && sampleCount > 0) {
        const capRings = 4;
        // 2 caps (start + end), each has 3 intermediate rings of (radialSegments+1) + 1 apex vertex
        capVerts = 2 * ((capRings - 1) * (radialSegments + 1) + 1);
        capTris = 2 * ((capRings - 1) * radialSegments * 2 + radialSegments);
      }

      totalVertices += mainVerts + capVerts;
      totalTriangles += mainTris + capTris;
    }

    return {
      totalStrokes: targetStrokes.length,
      totalVertices,
      totalTriangles,
      totalGroups: groups.filter((g) => (!onlyVisible || g.visible)).length,
    };
  }

  /**
   * Creates an industry-standard PBR material for GLTF 2.0 serialization
   */
  static createExportPBRMaterial(
    stroke: Stroke,
    options: GLTFExportOptions
  ): THREE.Material {
    const threeColor = new THREE.Color(stroke.color || '#1c1c1e');
    const opacity = typeof stroke.opacity === 'number' ? stroke.opacity : 1.0;
    const transparent = opacity < 1.0;
    const vertexColors = options.includeVertexColors ?? true;

    // Pattern texture (embedded as canvas image in GLB)
    let patternTexture: THREE.CanvasTexture | null = null;
    if (options.includeTextures && stroke.pattern && stroke.pattern !== 'none') {
      patternTexture = RenderEngine.createPatternTexture(
        stroke.pattern,
        stroke.patternScale || 1.0,
        stroke.patternAngle || 0,
        stroke.patternContrast || 1.0
      );
    }

    switch (stroke.material) {
      case 'shadeless': {
        // Unlit flat graphic material (KHR_materials_unlit in GLTF 2.0)
        return new THREE.MeshBasicMaterial({
          color: vertexColors ? new THREE.Color(0xffffff) : threeColor,
          opacity,
          transparent,
          side: THREE.DoubleSide,
          vertexColors,
          map: patternTexture,
          name: `Unlit_Mat_${stroke.id.slice(-6)}`,
        });
      }

      case 'glow': {
        // Emissive material with standard PBR emission
        return new THREE.MeshStandardMaterial({
          color: vertexColors ? new THREE.Color(0xffffff) : threeColor,
          emissive: threeColor,
          emissiveIntensity: 2.5,
          roughness: 0.15,
          metalness: 0.05,
          opacity,
          transparent,
          side: THREE.DoubleSide,
          vertexColors,
          map: patternTexture,
          name: `Glow_Mat_${stroke.id.slice(-6)}`,
        });
      }

      case 'cutout': {
        return new THREE.MeshStandardMaterial({
          color: vertexColors ? new THREE.Color(0xffffff) : threeColor,
          roughness: 0.8,
          metalness: 0.0,
          opacity: 0.35,
          transparent: true,
          side: THREE.DoubleSide,
          vertexColors,
          name: `Cutout_Mat_${stroke.id.slice(-6)}`,
        });
      }

      case 'shaded':
      default: {
        // Standard PBR Metallic-Roughness Material
        const roughness = options.pbrRoughness ?? (stroke.brushType === 'marker' ? 0.55 : 0.75);
        const metalness = options.pbrMetallic ?? (stroke.brushType === 'ribbon' ? 0.1 : 0.02);

        return new THREE.MeshStandardMaterial({
          color: vertexColors ? new THREE.Color(0xffffff) : threeColor,
          roughness,
          metalness,
          opacity,
          transparent,
          side: THREE.DoubleSide,
          vertexColors,
          map: patternTexture,
          name: `PBR_Mat_${stroke.id.slice(-6)}`,
        });
      }
    }
  }

  /**
   * Builds a full Three.js scene representation of the project strokes and groups
   */
  static buildThreeScene(
    projectOrStrokes: NoteProject | Stroke[],
    groups?: SpatialGroup[],
    options: GLTFExportOptions = {}
  ): THREE.Scene {
    const scene = new THREE.Scene();
    const isProject = !Array.isArray(projectOrStrokes);
    const project = isProject ? (projectOrStrokes as NoteProject) : null;
    const strokes = isProject ? (projectOrStrokes as NoteProject).strokes : (projectOrStrokes as Stroke[]);
    const projectGroups = groups || (project ? project.groups : []);

    const projectName = project?.title?.replace(/[^\w-]/g, '_') || 'Feather3D_Sketch';
    scene.name = `Project_${projectName}`;

    // Root Scene Metadata for DCC software (Blender, Unity, Unreal)
    scene.userData = {
      generator: 'Feather 3D GLTF 2.0 Exporter',
      version: '2.0.0',
      title: project?.title || 'Feather 3D Artwork',
      exportedAt: new Date().toISOString(),
      updatedAt: project?.updatedAt || Date.now(),
    };

    const onlyVisible = options.onlyVisibleGroups ?? true;
    const visibleGroupIds = new Set(
      projectGroups.filter((g) => (!onlyVisible || g.visible)).map((g) => g.id)
    );

    // Build Group Graph
    const groupMap = new Map<string, THREE.Group>();
    projectGroups.forEach((g) => {
      if (onlyVisible && !g.visible) return;

      const sanitizedName = g.name.replace(/[^\w-]/g, '_') || 'Layer';
      const threeGroup = new THREE.Group();
      threeGroup.name = `Group_${sanitizedName}`;
      threeGroup.visible = g.visible;
      threeGroup.userData = {
        id: g.id,
        name: g.name,
        visible: g.visible,
        locked: g.locked,
        isolated: g.isolated,
        colorTag: g.colorTag,
      };

      groupMap.set(g.id, threeGroup);
      scene.add(threeGroup);
    });

    // Default fallback group if stroke has no assigned group
    const defaultGroup = new THREE.Group();
    defaultGroup.name = 'Group_Default';
    defaultGroup.userData = { id: 'default', name: 'Default Layer', visible: true };
    scene.add(defaultGroup);

    // Generate Meshes for Each Stroke
    strokes.forEach((stroke, idx) => {
      if (onlyVisible && !visibleGroupIds.has(stroke.groupId)) {
        return;
      }

      if (!stroke.points || stroke.points.length < 2) {
        return;
      }

      const targetGroup = groupMap.get(stroke.groupId) || defaultGroup;
      const geometry = GeometryEngine.createStrokeMesh(stroke);

      let material: THREE.Material;
      if (options.includeMaterials !== false) {
        material = this.createExportPBRMaterial(stroke, options);
      } else {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(stroke.color || '#1c1c1e'),
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
      }

      const strokeShortId = stroke.id ? stroke.id.slice(-6) : `${idx}`;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `Stroke_${strokeShortId}_${stroke.brushType || 'tube'}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Attach CAD/DCC Stroke Metadata
      mesh.userData = {
        id: stroke.id,
        groupId: stroke.groupId,
        brushType: stroke.brushType,
        materialType: stroke.material,
        sizeMm: stroke.size,
        opacity: stroke.opacity,
        jitter: stroke.jitter || 0,
        pattern: stroke.pattern,
        pressureSensitive: stroke.pressureSensitive,
        pointsCount: stroke.points.length,
        createdAt: stroke.createdAt,
      };

      targetGroup.add(mesh);
    });

    // Optional: Export Camera Bookmarks as glTF Scene Cameras
    if (options.includeCameras && project?.cameraBookmarks && project.cameraBookmarks.length > 0) {
      const cameraFolder = new THREE.Group();
      cameraFolder.name = 'Cameras_Bookmarks';

      project.cameraBookmarks.forEach((bookmark: CameraBookmark) => {
        const cam = new THREE.PerspectiveCamera(bookmark.fov || 50, 16 / 9, 0.1, 1000);
        cam.name = `Camera_${bookmark.name.replace(/[^\w-]/g, '_')}`;
        cam.position.set(bookmark.position[0], bookmark.position[1], bookmark.position[2]);
        cam.lookAt(new THREE.Vector3(bookmark.target[0], bookmark.target[1], bookmark.target[2]));
        cam.userData = { id: bookmark.id, name: bookmark.name };
        cameraFolder.add(cam);
      });

      scene.add(cameraFolder);
    }

    return scene;
  }

  /**
   * Export to Binary GLTF (.glb) or JSON (.gltf 2.0) and trigger browser download
   */
  static async exportToGLTF(
    projectOrStrokes: NoteProject | Stroke[],
    groups?: SpatialGroup[],
    binaryOrOptions: boolean | GLTFExportOptions = true,
    filename: string = 'feather3d_sketch'
  ): Promise<void> {
    const options: GLTFExportOptions = typeof binaryOrOptions === 'boolean'
      ? { binary: binaryOrOptions, includeVertexColors: true, includeMaterials: true, includeTextures: true, includeHierarchy: true }
      : { binary: true, includeVertexColors: true, includeMaterials: true, includeTextures: true, includeHierarchy: true, ...binaryOrOptions };

    const scene = this.buildThreeScene(projectOrStrokes, groups, options);
    const exporter = new GLTFExporter();
    const isBinary = options.binary ?? true;

    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => {
          try {
            if (isBinary && gltf instanceof ArrayBuffer) {
              const blob = new Blob([gltf], { type: 'model/gltf-binary' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.glb`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              resolve();
            } else {
              const output = typeof gltf === 'string' ? gltf : JSON.stringify(gltf, null, 2);
              const blob = new Blob([output], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.gltf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        },
        (error) => {
          console.error('Error exporting GLTF 2.0:', error);
          reject(error);
        },
        {
          binary: isBinary,
          embedImages: options.includeTextures ?? true,
          includeCustomExtensions: true,
          onlyVisible: false, // visibility handled via scene graph
        }
      );
    });
  }
}
