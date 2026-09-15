/**
 * Environnement minimal pour tester la couche demo sans navigateur :
 * un localStorage en memoire et un window qui accepte les ecouteurs.
 */

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = new MemoryStorage();
if (!g.window) {
  g.window = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setTimeout,
    clearTimeout,
  };
}
