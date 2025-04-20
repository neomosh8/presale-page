// api/update-user-profile.js
import { createClient } from 'redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { currentContactMethod, currentContactValue, updatedInfo, token } = req.body;
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Validate token
    const storedUserKey = await redis.get(`token:${token}`);
    if (!storedUserKey) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get current user key and data
    const userKey = `${currentContactMethod}:${currentContactValue}`;
    let userData = await redis.get(`user:${userKey}`);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    userData = JSON.parse(userData);
    
    // Update user data with new contact information
    const updatedUserData = {
      ...userData,
      email: updatedInfo.email || userData.email,
      phone: updatedInfo.phone || userData.phone,
      lastUpdated: new Date().toISOString()
    };
    
    // Save updated user data
    await redis.set(`user:${userKey}`, JSON.stringify(updatedUserData));
    
    // If user verified with one method but provided another contact method,
    // create a reference between them for future lookups
    if (currentContactMethod === 'email' && updatedInfo.phone) {
      const phoneKey = `sms:${updatedInfo.phone}`;
      await redis.set(`userRef:${phoneKey}`, userKey);
    } else if (currentContactMethod === 'sms' && updatedInfo.email) {
      const emailKey = `email:${updatedInfo.email}`;
      await redis.set(`userRef:${emailKey}`, userKey);
    }
    
    res.status(200).json({ success: true, user: updatedUserData });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}