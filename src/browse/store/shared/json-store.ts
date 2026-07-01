import { appendLog } from "../../../ytdl";

const { file } = iina;

export interface JsonStoreState<T> {
  data: T | null;
  hydrated: boolean;
  dirty: boolean;
  flushTimer: ReturnType<typeof setTimeout> | null;
}

export function createJsonStore<T>(path: string, empty: () => T, flushMs = 250) {
  const state: JsonStoreState<T> = {
    data: null,
    hydrated: false,
    dirty: false,
    flushTimer: null,
  };

  function read(): T {
    if (!file.exists(path)) {
      return empty();
    }
    try {
      const raw = file.read(path);
      if (!raw) {
        return empty();
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      appendLog(`json-store read error (${path}): ${err}`);
      return empty();
    }
  }

  function hydrate(): void {
    if (state.hydrated) {
      return;
    }
    state.hydrated = true;
    state.data = read();
  }

  function get(): T {
    hydrate();
    return state.data!;
  }

  function write(data: T): void {
    state.data = data;
    state.hydrated = true;
    state.dirty = true;
    if (state.flushTimer !== null) {
      return;
    }
    state.flushTimer = setTimeout(() => {
      state.flushTimer = null;
      flush();
    }, flushMs);
  }

  function flush(): void {
    if (state.flushTimer !== null) {
      clearTimeout(state.flushTimer);
      state.flushTimer = null;
    }
    if (!state.dirty || !state.data) {
      return;
    }
    state.dirty = false;
    try {
      file.write(path, JSON.stringify(state.data, null, 2));
    } catch (err) {
      appendLog(`json-store write error (${path}): ${err}`);
    }
  }

  return { get, write, flush };
}
