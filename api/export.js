/* Central CSV export across ALL tablets.
   Usage (in any browser):
     https://YOUR-DOMAIN/api/export?kind=questions&pin=YOUR_ADMIN_PIN
     kind = leads | questions | guides
   Protected by the ADMIN_PIN environment variable. */
const HEADERS = {
  leads: ["ts", "name", "country", "org", "email", "phone", "consent", "lang"],
  questions: ["ts", "lang", "visitor", "country", "question", "answer"],
  guides: ["ts", "name", "country", "email", "lang"],
};
const KEYS = { leads: "amor-leads", questions: "amor-questions", guides: "amor-guide-requests" };

export default async function handler(req, res) {
  const { kind = "questions", pin } = req.query || {};
  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) return res.status(401).json({ error: "bad pin" });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(501).json({ error: "central storage not configured" });
  const base = KEYS[kind];
  const hs = HEADERS[kind];
  if (!base) return res.status(400).json({ error: "kind must be leads | questions | guides" });
  try {
    const r = await fetch(`${url}/rest/v1/amor_kv?select=key,value&key=like.${encodeURIComponent(base)}*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await r.json();
    let all = [];
    for (const row of rows) {
      try {
        const arr = JSON.parse(row.value);
        if (Array.isArray(arr)) all = all.concat(arr.map((x) => ({ ...x, device: (row.key.split("::")[1] || "") })));
      } catch (e) {}
    }
    all.sort((a, b) => String(a.ts || "").localeCompare(String(b.ts || "")));
    const cols = hs.concat("device");
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.map(esc).join(",")]
      .concat(all.map((o) => cols.map((h) => esc(o[h])).join(",")))
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=amor_${kind}.csv`);
    return res.status(200).send("\ufeff" + csv);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
