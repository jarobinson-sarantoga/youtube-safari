declare const iina: {
  postMessage: (name: string, data?: unknown) => void;
  onMessage: (name: string, handler: (data: unknown) => void) => void;
};

export function postToPlugin(name: string, data: Record<string, unknown> = {}): void {
  if (typeof iina === "undefined" || !iina.postMessage) {
    return;
  }
  try {
    iina.postMessage(name, JSON.parse(JSON.stringify(data)));
  } catch {
    iina.postMessage(name, data);
  }
}

export function waitForIina(callback: () => void): void {
  if (typeof iina !== "undefined" && iina.postMessage && iina.onMessage) {
    callback();
    return;
  }
  setTimeout(() => waitForIina(callback), 50);
}

export function onPluginMessage(name: string, handler: (data: unknown) => void): void {
  iina.onMessage(name, handler);
}