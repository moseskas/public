/* Mirrors every save (visitors, conversations, guide requests) from every
   tablet into one central Supabase table. If Supabase env vars are not set,
   the app quietly falls back to on-device storage only. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(501).json({ error: "central storage not configured" });
  try {
    const { key: k, value } = req.body || {};
    if (!k) return res.status(400).json({ error: "key required" });
    const r = await fetch(`${url}/rest/v1/amor_kv`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ key: k, value, updated_at: new Date().toISOString() }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
