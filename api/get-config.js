// api/get-config.js
export default function handler(req, res) {
  // Only expose specific environment variables that are safe for client-side
  res.status(200).json({
    MAX_SPOTS: process.env.MAX_SPOTS || '10'
  });
}