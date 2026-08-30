import { NoteProject, ProjectSnapshot, SessionRecoveryState, SnapshotReason } from '../types';
import { defaultProjects } from '../data/sampleProjects';

const DB_NAME = 'feather3d_database';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_SESSION = 'session_recovery';
const ACTIVE_SLOT_KEY = 'feather3d_active_project_id';
const LAST_SNAPSHOT_KEY = 'feather3d_last_snapshot_time';
const MAX_SNAPSHOTS_PER_PROJECT = 25;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store 1: Projects
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }

      // Store 2: Immutable Project Snapshots for version history & recovery
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        snapshotStore.createIndex('projectId', 'projectId', { unique: false });
        snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store 3: Session Recovery State for instantaneous post-refresh restore
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const StorageEngine = {
  /**
   * Loads all projects from IndexedDB or initializes with default sample projects
   */
  async loadProjects(): Promise<NoteProject[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.getAll();

        request.onsuccess = () => {
          const results: NoteProject[] = request.result || [];
          if (results.length === 0) {
            // Seed default samples on initial run
            this.seedDefaults(defaultProjects).then(() => {
              resolve(defaultProjects);
            });
          } else {
            // Sort by updatedAt descending
            results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            resolve(results);
          }
        };

        request.onerror = () => {
          resolve(defaultProjects);
        };
      });
    } catch (err) {
      console.warn('Failed to load projects from IndexedDB, falling back to defaults:', err);
      return defaultProjects;
    }
  },

  /**
   * Seeds initial projects if DB is empty
   */
  async seedDefaults(projects: NoteProject[]): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      projects.forEach((p) => store.put(p));
      return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {
      console.error('Error seeding default projects:', e);
    }
  },

  /**
   * Saves a single project to IndexedDB
   */
  async saveProject(project: NoteProject): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.put({
          ...project,
          updatedAt: Date.now(),
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Failed to save project to IndexedDB:', err);
    }
  },

  /**
   * Deletes a project by ID and prunes its associated snapshots
   */
  async deleteProject(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PROJECTS, STORE_SNAPSHOTS], 'readwrite');
        const projectStore = tx.objectStore(STORE_PROJECTS);
        projectStore.delete(id);

        // Delete associated snapshots
        const snapshotStore = tx.objectStore(STORE_SNAPSHOTS);
        const index = snapshotStore.index('projectId');
        const req = index.getAllKeys(id);
        req.onsuccess = () => {
          const keys = req.result;
          keys.forEach((key) => snapshotStore.delete(key));
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('Failed to delete project from IndexedDB:', err);
    }
  },

  // =========================================================================
  // AUTOMATIC INDEXEDDB PROJECT SNAPSHOTS (INACTIVITY 30s & RECOVERY)
  // =========================================================================

  /**
   * Creates an immutable IndexedDB snapshot of the current project state.
   * Typically invoked after 30 seconds of user inactivity or prior to destructive actions.
   */
  async createSnapshot(
    project: NoteProject,
    reason: SnapshotReason = 'inactivity_30s'
  ): Promise<ProjectSnapshot | null> {
    if (!project || !project.id) return null;

    try {
      const db = await openDB();
      const timestamp = Date.now();
      const snapshotId = `snap_${project.id}_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;

      // Deep clone project data to ensure immutability
      const clonedProject: NoteProject = JSON.parse(JSON.stringify(project));

      const snapshot: ProjectSnapshot = {
        id: snapshotId,
        projectId: project.id,
        projectTitle: project.title || 'Untitled Sketch',
        timestamp,
        reason,
        strokeCount: project.strokes?.length || 0,
        layerCount: project.groups?.length || 0,
        projectData: clonedProject,
        thumbnail: project.thumbnail,
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
        const store = tx.objectStore(STORE_SNAPSHOTS);
        const req = store.put(snapshot);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // Update last snapshot time tracking
      try {
        localStorage.setItem(LAST_SNAPSHOT_KEY, timestamp.toString());
      } catch {
        // ignore
      }

      // Automatically prune older snapshots to maintain high database efficiency
      this.pruneSnapshots(project.id, MAX_SNAPSHOTS_PER_PROJECT).catch(() => {});

      return snapshot;
    } catch (err) {
      console.warn('Failed to create IndexedDB project snapshot:', err);
      return null;
    }
  },

  /**
   * Retrieves all snapshots for a given project (or all projects), ordered newest to oldest
   */
  async getSnapshots(projectId?: string): Promise<ProjectSnapshot[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
        const store = tx.objectStore(STORE_SNAPSHOTS);

        let request: IDBRequest;
        if (projectId) {
          const index = store.index('projectId');
          request = index.getAll(projectId);
        } else {
          request = store.getAll();
        }

        request.onsuccess = () => {
          const results: ProjectSnapshot[] = request.result || [];
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results);
        };

        request.onerror = () => resolve([]);
      });
    } catch (err) {
      console.warn('Failed to get snapshots from IndexedDB:', err);
      return [];
    }
  },

  /**
   * Gets the most recent snapshot for a specific project
   */
  async getLatestSnapshot(projectId: string): Promise<ProjectSnapshot | null> {
    const snapshots = await this.getSnapshots(projectId);
    return snapshots.length > 0 ? snapshots[0] : null;
  },

  /**
   * Deletes a specific snapshot by ID
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
        const store = tx.objectStore(STORE_SNAPSHOTS);
        const req = store.delete(snapshotId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to delete snapshot:', err);
    }
  },

  /**
   * Cleans up older snapshots exceeding the maximum retention quota
   */
  async pruneSnapshots(projectId: string, keepCount: number = MAX_SNAPSHOTS_PER_PROJECT): Promise<void> {
    try {
      const snapshots = await this.getSnapshots(projectId);
      if (snapshots.length <= keepCount) return;

      const snapshotsToDelete = snapshots.slice(keepCount);
      const db = await openDB();
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);

      snapshotsToDelete.forEach((s) => store.delete(s.id));
    } catch (err) {
      console.warn('Failed to prune older snapshots:', err);
    }
  },

  // =========================================================================
  // SESSION RECOVERY STATE (BROWSER REFRESH & CRASH RECOVERY)
  // =========================================================================

  /**
   * Saves the active working session state into IndexedDB for instant zero-loss recovery
   */
  async saveSessionRecovery(state: Omit<SessionRecoveryState, 'key'>): Promise<void> {
    try {
      const db = await openDB();
      const payload: SessionRecoveryState = {
        ...state,
        key: 'last_active_session',
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SESSION, 'readwrite');
        const store = tx.objectStore(STORE_SESSION);
        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to save session recovery state to IndexedDB:', err);
    }
  },

  /**
   * Retrieves the last active working session state from IndexedDB
   */
  async getSessionRecovery(): Promise<SessionRecoveryState | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SESSION, 'readonly');
        const store = tx.objectStore(STORE_SESSION);
        const req = store.get('last_active_session');

        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn('Failed to get session recovery state:', err);
      return null;
    }
  },

  /**
   * Clears the session recovery slot
   */
  async clearSessionRecovery(): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SESSION, 'readwrite');
        const store = tx.objectStore(STORE_SESSION);
        const req = store.delete('last_active_session');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to clear session recovery state:', err);
    }
  },

  // =========================================================================
  // LOCALSTORAGE ACTIVE SLOT HELPERS
  // =========================================================================

  /**
   * Get active project id from localStorage
   */
  getActiveProjectId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_SLOT_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Set active project id in localStorage
   */
  setActiveProjectId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_SLOT_KEY, id);
    } catch {
      // ignore
    }
  },

  /**
   * Get timestamp of last snapshot
   */
  getLastSnapshotTime(): number {
    try {
      const val = localStorage.getItem(LAST_SNAPSHOT_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },
};
