import twilio from 'twilio';

// Helper function to format phone numbers to E.164 format
function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if the number already has a country code (starts with '+')
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Add US country code (+1) if not present
  // You may need to adjust this for international numbers
  return `+1${digitsOnly}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { contactMethod, contactValue } = req.body;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  try {
    let formattedValue = contactValue;
    
    // Format phone number if the contact method is SMS
    if (contactMethod === 'sms') {
      formattedValue = formatPhoneNumber(contactValue);
    }
    
    await client
      .verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedValue,
        channel: contactMethod === 'sms' ? 'sms' : 'email'
      });
      
    res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
}