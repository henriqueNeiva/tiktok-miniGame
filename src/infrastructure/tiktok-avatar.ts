// Prefer a small image: the portrait is displayed in a 60px circle.
export function extractAvatarUrl(user: Record<string, unknown>): string | undefined {
  for (const key of ['avatarThumb', 'avatarMedium', 'avatarLarge']) {
    const image = user[key];
    if (!image || typeof image !== 'object') continue;
    const urls = (image as Record<string, unknown>).urlList;
    if (!Array.isArray(urls)) continue;
    for (const value of urls) {
      if (typeof value !== 'string') continue;
      try {
        const url = new URL(value);
        if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
      } catch { /* Try the next URL from the payload. */ }
    }
  }
  return undefined;
}
