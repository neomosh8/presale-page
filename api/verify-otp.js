import twilio from 'twilio';

// Same helper function as in send-otp.js
function formatPhoneNumber(phoneNumber) {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  return `+1${digitsOnly}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { contactMethod, contactValue, code } = req.body;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  try {
    let formattedValue = contactValue;
    
    // Format phone number if the contact method is SMS
    if (contactMethod === 'sms') {
      formattedValue = formatPhoneNumber(contactValue);
    }
    
    const chk = await client
      .verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ 
        to: formattedValue, 
        code 
      });
      
    res.status(200).json({ verified: chk.status === 'approved' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ verified: false, error: e.message });
  }
}