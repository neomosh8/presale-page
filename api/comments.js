import { createClient } from 'redis';

export default async function handler(req, res) {
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // GET request to fetch comments
    if (req.method === 'GET') {
      const commentsStr = await redis.get('product:comments');
      const comments = commentsStr ? JSON.parse(commentsStr) : [];
      
      // For each comment, check if the user has purchased
      const commentsWithVerification = await Promise.all(
        comments.map(async (comment) => {
          const userKey = `${comment.contactMethod}:${comment.contactValue}`;
          const orderKeysStr = await redis.get(`orders:${userKey}`);
          const hasOrders = orderKeysStr && JSON.parse(orderKeysStr).length > 0;
          
          return { 
            ...comment, 
            verified: hasOrders,
            // Mask email/phone for privacy
            contactValue: maskContactValue(comment.contactValue, comment.contactMethod)
          };
        })
      );
      
      return res.status(200).json(commentsWithVerification);
    }
    
    // POST request to add a comment
    if (req.method === 'POST') {
      const { contactMethod, contactValue, text } = req.body;
      
      if (!contactMethod || !contactValue || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get existing comments
      const commentsStr = await redis.get('product:comments');
      const comments = commentsStr ? JSON.parse(commentsStr) : [];
      
      // Add new comment
      const newComment = {
        id: `comment_${Date.now()}`,
        contactMethod,
        contactValue,
        text,
        timestamp: new Date().toISOString()
      };
      
      comments.push(newComment);
      
      // Save updated comments
      await redis.set('product:comments', JSON.stringify(comments));
      
      // Check if user has purchased
      const userKey = `${contactMethod}:${contactValue}`;
      const orderKeysStr = await redis.get(`orders:${userKey}`);
      const hasOrders = orderKeysStr && JSON.parse(orderKeysStr).length > 0;
      
      // Return the new comment with verification status
      return res.status(201).json({
        ...newComment,
        verified: hasOrders,
        contactValue: maskContactValue(contactValue, contactMethod)
      });
    }
    
    return res.status(405).end();
  } catch (error) {
    console.error('Comments API error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}

// Helper function to mask contact information for privacy
function maskContactValue(value, method) {
  if (method === 'email') {
    // Mask email: example@domain.com -> exa***@domain.com
    const [username, domain] = value.split('@');
    if (username.length <= 3) return `${username[0]}***@${domain}`;
    return `${username.substring(0, 3)}***@${domain}`;
  } else {
    // Mask phone: +1234567890 -> +12****7890
    if (value.length <= 6) return value.replace(/\d/g, '*');
    return value.substring(0, 3) + value.substring(3, value.length - 4).replace(/\d/g, '*') + value.substring(value.length - 4);
  }
}
