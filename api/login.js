import { KV } from '@vercel/kv';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { contactMethod, contactValue } = req.body;
  const kv = new KV();
  const userKey = `${contactMethod}:${contactValue}`;
  const ordersKeys = (await kv.get(`orders:${userKey}`)) || [];
  const orders = await Promise.all(
    ordersKeys.map(id => kv.get(`order:${id}`))
  );
  res.status(200).json({
    user:   { contactMethod, contactValue },
    orders
  });
}

