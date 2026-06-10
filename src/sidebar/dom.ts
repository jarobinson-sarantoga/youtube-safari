export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el;
}

import { formatClock } from "../format";
import { TRY_AGAIN_LABEL } from "./copy";

export { formatClock };

export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDuration(seconds: number): string {
  return formatClock(seconds);
}

export interface ErrorRetryOptions {
  containerClassName?: string;
  retryClassName?: string;
  retryLabel?: string;
}

export function createRetryButton(
  onRetry: () => void,
  className = "feed-retry",
  label = TRY_AGAIN_LABEL,
): HTMLButtonElement {
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = className;
  retry.textContent = label;
  retry.addEventListener("click", onRetry);
  return retry;
}

export function createErrorWithRetry(
  message: string,
  onRetry: () => void,
  options: ErrorRetryOptions = {},
): HTMLElement {
  const err = document.createElement("div");
  err.className = options.containerClassName ?? "feed-error";
  err.textContent = message;
  err.appendChild(
    createRetryButton(onRetry, options.retryClassName ?? "feed-retry", options.retryLabel),
  );
  return err;
}