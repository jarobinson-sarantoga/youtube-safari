export type FeedFetchResult = {
  items: import("../types").FeedItem[];
  error?: string;
  emptyHint?: string;
  continuation?: string;
};

export const feedInflight = new Map<string, Promise<FeedFetchResult>>();

export function clearFeedInflight(): void {
  feedInflight.clear();
}
