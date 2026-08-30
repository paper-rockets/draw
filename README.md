# Feather 3D - Spatial Sketching Studio

High-performance 3D spatial sketching, procedural 3D guides, volumetric brush strokes, and real-time NPR rendering on tablet and desktop.

### Live Web Demo

Access the live web demo:
**https://paper-rockets.github.io/draw/**

---

## Features

- **Volumetric 3D Brush Extrusion**: Real-time extrusion supporting Tube, Ribbon, Marker, and Flat stroke geometries with pressure dynamics and spline smoothing.
- **Procedural 3D Guides & Colliders**: Raycast onto 3D surfaces, planes, cylinders, spheres, loft surfaces, and imported 3D mesh models (GLB/GLTF/OBJ).
- **Cel & Toon NPR Shading**: Real-time non-photorealistic shading pipeline with custom light bands, rim lighting, specular highlights, and procedural patterns (dots, lines, crosses, terrazzo, stipple).
- **Procedural Wanderlust Sky Dome**: Animated day/dusk/night atmospheric sky with procedural clouds, sun glow, and starfields.
- **Progressive Web App (PWA)**: Installable standalone app with offline caching, touch optimization, palm rejection, and stylus barrel button radial squeeze menus.
- **Multi-Format 3D Export**: Export projects to GLTF 2.0 / GLB, OBJ, STL, USDZ, turntable video recording, and high-resolution captures.
- **Spatial Hierarchy & History**: Layer management with visibility, locking, isolation, unlimited undo/redo history, and visual autosave snapshots.

---

## Progressive Web App (PWA)

Feather 3D is configured as an installable Progressive Web App.

- **Desktop (Chrome / Edge / Brave)**: Click the Install icon in the browser address bar to install as a standalone desktop application.
- **iOS / iPadOS (Safari)**: Tap Share -> Add to Home Screen.
- **Android (Chrome)**: Tap the menu -> Install app.

Offline asset caching is handled automatically by the background Service Worker.

---

## Getting Started Locally

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/paper-rockets/draw.git
   cd draw
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Build for production:
   ```bash
   npm run build
   ```

---

## Deployment

Continuous deployment is configured via GitHub Actions in `.github/workflows/deploy.yml`. Pushes to the `main` branch automatically build and publish the distribution bundle to GitHub Pages.

---

## License

MIT License. See project files for details.
