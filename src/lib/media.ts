export function mediaKey(filename: string) {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `media/${crypto.randomUUID()}-${safe || "upload"}`;
}

export function mediaUrl(key: string) {
  return `/api/media/${encodeURIComponent(key)}`;
}
