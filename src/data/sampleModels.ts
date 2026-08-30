import * as THREE from 'three';
import { PresetModelDefinition } from '../types';

export class SampleModelFactory {
  public static getPresets(): PresetModelDefinition[] {
    return [
      {
        id: 'cyber_helmet',
        name: 'Cyber Helmet',
        category: 'Sci-Fi',
        description: 'Aerodynamic armored visor with sharp facets and compound curved plates.',
        createMesh: () => this.createCyberHelmet(),
      },
      {
        id: 'sculpted_bust',
        name: 'Classical Bust',
        category: 'Sculpture',
        description: 'Smooth organic anatomical contours, ideal for testing conformal normal flow.',
        createMesh: () => this.createSculptedBust(),
      },
      {
        id: 'ceramic_vase',
        name: 'Ceramic Amphora',
        category: 'Pottery',
        description: 'Curved porcelain vase with handles and lathe contour curvature.',
        createMesh: () => this.createCeramicVase(),
      },
      {
        id: 'scifi_drone',
        name: 'Recon Drone',
        category: 'Robotics',
        description: 'Spherical hull with thruster pods and sensor lenses.',
        createMesh: () => this.createSciFiDrone(),
      },
      {
        id: 'torus_knot',
        name: 'Torus Knot Benchmark',
        category: 'Geometric',
        description: 'Complex continuous topology benchmark for zero-clipping validation.',
        createMesh: () => this.createTorusKnot(),
      },
    ];
  }

  public static createCyberHelmet(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'CyberHelmet';

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x22272e,
      roughness: 0.35,
      metalness: 0.65,
      side: THREE.DoubleSide,
    });

    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.1,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b4252,
      roughness: 0.5,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });

    // Main skull dome
    const skullGeom = new THREE.SphereGeometry(1.0, 48, 36);
    const pos = skullGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      let nz = z * 1.15;
      let ny = y * 1.05;
      if (z > 0.3 && y < 0.2) {
        nz += 0.15 * Math.sin(y * Math.PI);
      }
      pos.setXYZ(i, x * 0.95, ny, nz);
    }
    skullGeom.computeVertexNormals();
    const skullMesh = new THREE.Mesh(skullGeom, baseMaterial);
    group.add(skullMesh);

    // Visor Shield
    const visorGeom = new THREE.CylinderGeometry(0.85, 0.82, 0.65, 32, 16, true, -Math.PI * 0.45, Math.PI * 0.9);
    const visorPos = visorGeom.attributes.position;
    for (let i = 0; i < visorPos.count; i++) {
      const z = visorPos.getZ(i);
      visorPos.setZ(i, z + 0.35);
    }
    visorGeom.computeVertexNormals();
    const visorMesh = new THREE.Mesh(visorGeom, visorMaterial);
    visorMesh.position.set(0, 0.05, 0.3);
    group.add(visorMesh);

    // Side ear cowlings
    const earGeom = new THREE.CylinderGeometry(0.28, 0.25, 0.2, 24);
    earGeom.rotateZ(Math.PI / 2);
    const earL = new THREE.Mesh(earGeom, accentMaterial);
    earL.position.set(0.92, -0.05, 0.1);
    group.add(earL);

    const earR = earL.clone();
    earR.position.set(-0.92, -0.05, 0.1);
    group.add(earR);

    // Chin guard
    const chinGeom = new THREE.BoxGeometry(0.55, 0.35, 0.65);
    const chinMesh = new THREE.Mesh(chinGeom, accentMaterial);
    chinMesh.position.set(0, -0.75, 0.6);
    chinMesh.rotation.x = Math.PI * 0.12;
    group.add(chinMesh);

    return group;
  }

  public static createSculptedBust(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'SculptedBust';

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xedebe6,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // Head
    const headGeom = new THREE.SphereGeometry(0.75, 48, 36);
    const pos = headGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      let ny = y * 1.25;
      let nz = z;
      if (y < 0 && z > 0.2) {
        nz += 0.12;
      }
      pos.setXYZ(i, x * 0.85, ny, nz);
    }
    headGeom.computeVertexNormals();
    const head = new THREE.Mesh(headGeom, marbleMat);
    head.position.set(0, 0.6, 0);
    group.add(head);

    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.32, 0.42, 0.7, 32);
    const neck = new THREE.Mesh(neckGeom, marbleMat);
    neck.position.set(0, -0.05, -0.05);
    group.add(neck);

    // Torso and Shoulders
    const torsoGeom = new THREE.CylinderGeometry(0.45, 0.95, 1.1, 32);
    const tPos = torsoGeom.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const x = tPos.getX(i);
      const y = tPos.getY(i);
      const z = tPos.getZ(i);
      tPos.setXYZ(i, x * 1.7, y, z * 0.85);
    }
    torsoGeom.computeVertexNormals();
    const torso = new THREE.Mesh(torsoGeom, marbleMat);
    torso.position.set(0, -0.75, -0.05);
    group.add(torso);

    // Pedestal
    const baseGeom = new THREE.CylinderGeometry(0.7, 0.85, 0.35, 36);
    const pedestal = new THREE.Mesh(baseGeom, marbleMat);
    pedestal.position.set(0, -1.45, -0.05);
    group.add(pedestal);

    return group;
  }

  public static createCeramicVase(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'CeramicVase';

    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1eb,
      roughness: 0.25,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const y = (t - 0.5) * 2.4;
      const r = 0.35 + 0.45 * Math.sin(t * Math.PI) + 0.15 * Math.sin(t * Math.PI * 2.5);
      points.push(new THREE.Vector2(Math.max(0.12, r), y));
    }

    const latheGeom = new THREE.LatheGeometry(points, 48);
    latheGeom.computeVertexNormals();
    const vaseMesh = new THREE.Mesh(latheGeom, ceramicMat);
    group.add(vaseMesh);

    // Handles
    const handleGeom = new THREE.TorusGeometry(0.35, 0.065, 20, 32, Math.PI);
    handleGeom.rotateZ(-Math.PI / 2);

    const handleL = new THREE.Mesh(handleGeom, ceramicMat);
    handleL.position.set(0.72, 0.25, 0);
    group.add(handleL);

    const handleR = new THREE.Mesh(handleGeom, ceramicMat);
    handleR.rotation.y = Math.PI;
    handleR.position.set(-0.72, 0.25, 0);
    group.add(handleR);

    return group;
  }

  public static createSciFiDrone(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'SciFiDrone';

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x2b303c,
      roughness: 0.4,
      metalness: 0.7,
      side: THREE.DoubleSide,
    });

    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.05,
      metalness: 0.9,
      emissive: 0x005577,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xdf8435,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    // Central Sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 36), hullMat);
    group.add(sphere);

    // Front sensor eye
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 24), lensMat);
    eye.position.set(0, 0, 0.75);
    eye.scale.set(1, 1, 0.5);
    group.add(eye);

    // Armor Ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 24, 48), plateMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Thrusters
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.6, 24), hullMat);
      thruster.position.set(Math.cos(angle) * 0.95, -0.4, Math.sin(angle) * 0.95);
      thruster.rotation.x = Math.PI * 0.15 * Math.sin(angle);
      thruster.rotation.z = -Math.PI * 0.15 * Math.cos(angle);
      group.add(thruster);
    }

    return group;
  }

  public static createTorusKnot(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'TorusKnot';

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3f51b5,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });

    const geom = new THREE.TorusKnotGeometry(0.8, 0.26, 128, 32, 2, 3);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    return group;
  }
}
