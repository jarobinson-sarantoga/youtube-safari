/** Shared feed row fixture for batch tests. */
export const validShortItem = {
  videoId: "abc123xyz12",
  title: "Short",
  channelTitle: "Channel",
  thumbnailUrl: "https://example.com/thumb.jpg",
  isShort: true,
};

export function feedItem(videoId, title = "T") {
  return {
    videoId,
    title,
    channelTitle: "C",
    thumbnailUrl: "https://example.com/t.jpg",
  };
}

export function shortItem(videoId) {
  return { ...validShortItem, videoId };
}
