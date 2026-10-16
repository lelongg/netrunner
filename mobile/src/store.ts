export interface Store {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const none: Store = { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} };

export function browserStore(): Store {
  try {
    return globalThis.localStorage ?? none;
  } catch {
    return none;
  }
}

export function memoryStore(data: Record<string, string> = {}, onChange?: (data: Record<string, string>) => void): Store {
  return {
    get length() {
      return Object.keys(data).length;
    },
    key: (i) => Object.keys(data)[i] ?? null,
    getItem: (k) => (k in data ? data[k] : null),
    setItem(k, v) {
      data[k] = String(v);
      onChange?.(data);
    },
    removeItem(k) {
      delete data[k];
      onChange?.(data);
    },
  };
}
