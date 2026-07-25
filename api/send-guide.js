/* Sends the "All about the FC2" guide by email, immediately, via Resend
   (resend.com - free tier is plenty for an event).
   Needs env vars: RESEND_API_KEY, FROM_EMAIL, and GUIDE_URL
   (a public link to the booklet PDF - you can simply put the PDF at
   public/guide/all-about-fc2.pdf and use https://YOUR-DOMAIN/guide/all-about-fc2.pdf).
   If mail is not configured the request is still stored centrally,
   so nothing is ever lost - the team just sends manually from the CSV. */
const SUBJECTS = {
  en: "Your FC2 guide from Amor 💗",
  pt: "Seu guia da FC2, com carinho da Amor 💗",
  es: "Tu guía de la FC2, con cariño de Amor 💗",
  sw: "Mwongozo wako wa FC2 kutoka kwa Amor 💗",
  fr: "Ton guide FC2 de la part d'Amor 💗",
  sn: "Gwara rako reFC2 kubva kuna Amor 💗",
  nd: "Umhlahlandlela wakho weFC2 ovela ku-Amor 💗",
  yo: "Ìtọ́sọ́nà FC2 rẹ láti ọ̀dọ̀ Amor 💗",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { email, name = "", lang = "en" } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });
  const rk = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!rk || !from) return res.status(200).json({ sent: false, queued: true });
  try {
    const link = process.env.GUIDE_URL || "https://www.fc2femalecondom.com";
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#D81B7F">Hi ${name || "friend"}!</h2>
        <p>Thank you for chatting with Amor at the African Alliance Networking Zone at AIDS2026 in Rio de Janeiro.</p>
        <p>Here is the illustrated step-by-step guide, <b>"All about the FC2"</b>:</p>
        <p><a href="${link}" style="background:#D81B7F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open the guide</a></p>
        <p>Questions about FC2 availability in your country? Write to <a href="mailto:amor@africanalliance.org.za">amor@africanalliance.org.za</a>.</p>
        <p>With love,<br/>Amor &amp; the African Alliance team</p>
      </div>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${rk}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject: SUBJECTS[lang] || SUBJECTS.en, html }),
    });
    return res.status(200).json({ sent: r.ok });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
