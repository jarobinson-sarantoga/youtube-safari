import fs from "node:fs";
import {
  hasBrowseAuthCookies,
  hasYouTubeAuthCookies,
  parseNetscapeCookies,
} from "./youtube-cookies.mjs";

export const REFRESH_COOKIES_HINT =
  "No feed — refresh Safari cookies from the menu, then try again";
export const PARTIAL_COOKIES_HINT =
  "Cookies are partial — Plugin → Refresh YouTube (IINA needs Full Disk Access)";

export function authEmptyHint(cookiePath) {
  if (!fs.existsSync(cookiePath)) {
    return REFRESH_COOKIES_HINT;
  }
  const cookies = parseNetscapeCookies(fs.readFileSync(cookiePath, "utf8"));
  if (!cookies.some((cookie) => cookie.domain.includes("youtube.com"))) {
    return REFRESH_COOKIES_HINT;
  }
  if (!hasYouTubeAuthCookies(cookies) || !hasBrowseAuthCookies(cookies)) {
    return PARTIAL_COOKIES_HINT;
  }
  return REFRESH_COOKIES_HINT;
}

export function feedNeedsSignIn(feed) {
  const promoText = (node) =>
    node?.backgroundPromoRenderer?.bodyText?.runs?.[0]?.text ||
    node?.backgroundPromoRenderer?.title?.runs?.[0]?.text ||
    "";

  for (const shelf of feed.shelves || []) {
    for (const entry of shelf.contents || []) {
      const text = promoText(entry);
      if (text.toLowerCase().includes("sign in")) {
        return true;
      }
    }
  }

  const sections = feed.page_contents?.contents || feed.contents?.contents || [];
  for (const section of sections) {
    const content = section.content || section.richSectionRenderer?.content;
    if (content?.type === "FeedNudge") {
      continue;
    }
    const text = promoText(section) || promoText(content);
    if (text.toLowerCase().includes("sign in")) {
      return true;
    }
  }

  return false;
}
