export class AvatarCache {
  constructor() {
    this.entries = new Map();
  }

  get(url) {
    if (!url) return undefined;
    const existing = this.entries.get(url);
    if (existing) {
      this.entries.delete(url);
      this.entries.set(url, existing);
      return existing.ready ? existing.image : undefined;
    }
    const image = new Image();
    const entry = { image, ready: false };
    this.entries.set(url, entry);
    if (this.entries.size > 128) this.entries.delete(this.entries.keys().next().value);
    image.referrerPolicy = 'no-referrer';
    image.onload = () => { entry.ready = image.naturalWidth > 0 && image.naturalHeight > 0; };
    // Cache failures too: a broken photo must not trigger a request every frame.
    image.onerror = () => { entry.ready = false; };
    image.src = url;
    return undefined;
  }
}
