import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = JSON.parse(req.body);
  const client = twilio(process.env.TWILIO_ACCOUNT_SID,
                        process.env.TWILIO_AUTH_TOKEN);
  try {
    await client
      .verify.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: email, channel: 'email' });
    res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
}

