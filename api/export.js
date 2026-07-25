/* Central CSV export across ALL tablets.
   ONE COMBINED FILE (default):
     https://YOUR-DOMAIN/api/export?pin=YOUR_ADMIN_PIN
     -> every visitor, every conversation turn, every guide request,
        in one CSV, sorted by time, with a "type" column
        (visitor | question | guide_request) and a "device" column.
   Separate files still available with ?kind=leads|questions|guides.
   Protected by the ADMIN_PIN environment variable. */
const KEYS = { leads: "amor-leads", questions: "amor-questions", guides: "amor-guide-requests" };
const TYPE = { leads: "visitor", questions: "question", guides: "guide_request" };
const ALL_HEADERS = ["type", "ts", "lang", "name", "country", "org", "email", "phone", "consent", "question", "answer", "device"];

async function fetchRows(url, key, base) {
  const r = await fetch(`${url}/rest/v1/amor_kv?select=key,value&key=like.${encodeURIComponent(base)}*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = await r.json();
  let out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    try {
      const arr = JSON.parse(row.value);
      if (Array.isArray(arr)) out = out.concat(arr.map((x) => ({ ...x, device: row.key.split("::")[1] || "" })));
    } catch (e) {}
  }
  return out;
}

export default async function handler(req, res) {
  const { kind = "all", pin } = req.query || {};
  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) return res.status(401).json({ error: "bad pin" });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(501).json({ error: "central storage not configured" });
  try {
    const kinds = kind === "all" ? ["leads", "questions", "guides"] : [kind];
    if (kinds.some((k) => !KEYS[k])) return res.status(400).json({ error: "kind must be all | leads | questions | guides" });
    let all = [];
    for (const k of kinds) {
      const rows = await fetchRows(url, key, KEYS[k]);
      all = all.concat(
        rows.map((r) => ({
          type: TYPE[k],
          ts: r.ts,
          lang: r.lang,
          name: k === "questions" ? r.visitor : r.name,
          country: r.country,
          org: r.org,
          email: r.email,
          phone: r.phone,
          consent: r.consent,
          question: r.question,
          answer: r.answer,
          device: r.device,
        }))
      );
    }
    all.sort((a, b) => String(a.ts || "").localeCompare(String(b.ts || "")));
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [ALL_HEADERS.map(esc).join(",")]
      .concat(all.map((o) => ALL_HEADERS.map((h) => esc(o[h])).join(",")))
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=amor_${kind === "all" ? "all_data" : kind}.csv`);
    return res.status(200).send("\ufeff" + csv);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
