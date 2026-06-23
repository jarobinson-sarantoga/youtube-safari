/** Optional push to phone/Mac via ntfy.sh (subscribe to the same topic in the ntfy app). */
export async function notify(title, message, priority = "default") {
  const topic = process.env.SARANTOGA_NTFY_TOPIC?.trim();
  if (!topic) {
    console.log(`[notify] ${title}: ${message}`);
    return;
  }
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: {
        Title: title,
        Priority: priority,
        Tags: "robot",
      },
      body: message,
    });
  } catch (err) {
    console.warn("[notify] failed:", err);
  }
}
