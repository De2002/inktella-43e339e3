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

export async function uploadMedia(file: File, token: string, purpose: "poster" | "avatar") {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  const response = await fetch("/api/media", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as { key?: string; error?: string };
  if (!response.ok || !body.key) throw new Error(body.error ?? "Upload failed.");
  return body.key;
}
