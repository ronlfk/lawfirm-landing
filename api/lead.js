export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, phone, message, timestamp } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'missing fields' });

  try {
    const r = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Phone: phone,
            Message: message || '',
            Time: timestamp || new Date().toISOString()
          }
        })
      }
    );
    if (!r.ok) throw await r.text();
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'airtable error' });
  }
}
