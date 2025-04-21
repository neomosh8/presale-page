// api/admin-delete-comment.js
import { createClient } from 'redis';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  
  // Get admin token and comment ID from headers and query
  const token = req.headers.authorization?.split(' ')[1];
  const { commentId } = req.query;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!commentId) {
    return res.status(400).json({ error: 'Comment ID is required' });
  }
  
  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL,
  });
  await redis.connect();
  
  try {
    // Verify admin token
    const isAdmin = await redis.get(`admin:${token}`);
    
    if (!isAdmin) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get all comments
    const commentsStr = await redis.get('product:comments');
    const comments = commentsStr ? JSON.parse(commentsStr) : [];
    
    // Find comment index
    const commentIndex = comments.findIndex(comment => comment.id === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Remove comment from array
    comments.splice(commentIndex, 1);
    
    // Save updated comments
    await redis.set('product:comments', JSON.stringify(comments));
    
    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await redis.disconnect();
  }
}
