import twilio from 'twilio';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { contactValue, code } = req.body;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    const chk = await client
      .verify.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: contactValue, code });
    res.status(200).json({ verified: chk.status === 'approved' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ verified: false, error: e.message });
  }
}
