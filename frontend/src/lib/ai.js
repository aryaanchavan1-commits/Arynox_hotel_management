// AI Assistant powered by Groq (function calling) - helps hotel staff
import { db } from './db';

const MODEL = 'llama-3.3-70b-versatile';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description: 'Get live hotel dashboard summary (occupancy, today revenue, check-ins today, available rooms)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_room_availability',
      description: 'Get available rooms for a date range',
      parameters: {
        type: 'object',
        properties: {
          check_in: { type: 'string', description: 'check-in date YYYY-MM-DD' },
          check_out: { type: 'string', description: 'check-out date YYYY-MM-DD' },
        },
        required: ['check_in', 'check_out'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_revenue',
      description: 'Get total revenue for a date',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'date YYYY-MM-DD' } },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_guest',
      description: 'Find a guest by name or phone',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_bookings',
      description: 'Get recent bookings',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_menu_items',
      description: 'Get best selling restaurant items',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function runTool(name, args) {
  switch (name) {
    case 'get_dashboard_summary': {
      const total = await db.execute('SELECT COUNT(*) c FROM rooms');
      const occupied = await db.execute("SELECT COUNT(*) c FROM rooms WHERE status='occupied'");
      const today = new Date().toISOString().slice(0, 10);
      const rev = await db.execute("SELECT COALESCE(SUM(total),0) s FROM bills WHERE substr(created_at,1,10)=?", [today]);
      const checkins = await db.execute("SELECT COUNT(*) c FROM bookings WHERE status='checked_in'");
      const avail = await db.execute("SELECT COUNT(*) c FROM rooms WHERE status='available'");
      return {
        total_rooms: Number(total.rows[0].c),
        occupied_rooms: Number(occupied.rows[0].c),
        occupancy_percent: Math.round((Number(occupied.rows[0].c) / Math.max(1, Number(total.rows[0].c))) * 100),
        revenue_today: Number(rev.rows[0].s),
        checked_in_guests: Number(checkins.rows[0].c),
        available_rooms: Number(avail.rows[0].c),
      };
    }
    case 'get_room_availability': {
      const r = await db.execute(
        `SELECT r.number, t.name AS type, t.price FROM rooms r JOIN room_types t ON t.id=r.room_type_id
         WHERE r.status='available' AND r.id NOT IN (
           SELECT room_id FROM bookings WHERE status IN ('confirmed','checked_in') AND check_out > ? AND check_in < ?
         ) LIMIT 15`,
        [args.check_in, args.check_out]
      );
      return r.rows;
    }
    case 'get_daily_revenue': {
      const r = await db.execute('SELECT COALESCE(SUM(total),0) s, COUNT(*) n FROM bills WHERE substr(created_at,1,10)=?', [args.date]);
      return { date: args.date, revenue: Number(r.rows[0].s), bills: Number(r.rows[0].n) };
    }
    case 'search_guest': {
      const r = await db.execute("SELECT id, name, phone, email FROM guests WHERE name LIKE ? OR phone LIKE ? LIMIT 5", [`%${args.query}%`, `%${args.query}%`]);
      return r.rows;
    }
    case 'get_recent_bookings': {
      const r = await db.execute(
        `SELECT b.id, g.name, r.number, b.check_in, b.check_out, b.status, b.total
         FROM bookings b JOIN guests g ON g.id=b.guest_id JOIN rooms r ON r.id=b.room_id
         ORDER BY b.id DESC LIMIT ?`, [args.limit || 10]
      );
      return r.rows;
    }
    case 'get_top_menu_items': {
      const r = await db.execute(
        `SELECT item_name, SUM(qty) q, SUM(price*qty) s FROM order_items GROUP BY item_name ORDER BY q DESC LIMIT 5`
      );
      return r.rows;
    }
    default:
      return { error: 'unknown tool' };
  }
}

const SYSTEM = `You are "Hotel Lakshmi Deluxe AI", the smart assistant of the Hotel Lakshmi Deluxe ERP system (hotel + restaurant + POS).
Answer hotel staff questions concisely using the tools when you need live data.
If you have no answer, say so honestly. Keep answers short and friendly.
IMPORTANT formatting rules:
- Always write currency as "Rs." (never use the rupee symbol ₹ or any other special symbol — ASCII only).
- Format numbers with thousands separators, e.g. Rs.10,498.95.
- When listing rooms, group them in a clean list with room type and price.`;

export async function chat(message, client) {
  if (!client) {
    return {
      reply: 'AI assistant is not configured yet. Set GROQ_API_KEY in .env (get a free key at https://console.groq.com), then restart the backend.',
      needsKey: true,
    };
  }
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: message },
  ];
  for (let round = 0; round < 3; round++) {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.3,
    });
    const msg = res.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { reply: msg.content || '...' };
    }
    messages.push(msg);
    for (const call of msg.tool_calls) {
      const result = await runTool(call.function.name, JSON.parse(call.function.arguments || '{}'));
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
  return { reply: 'I could not finish computing an answer. Please try again.' };
}

function buildSitePrompt(ctx) {
  const rooms = (ctx.rooms || [])
    .map((r) => `- ${r.name}: ${ctx.currency}${r.price}/night${r.amenities && r.amenities.length ? ' (amenities: ' + r.amenities.join(', ') + ')' : ''}`)
    .join('\n');
  const facilities = (ctx.facilities || []).map((f) => `- ${f.title || ''}: ${f.text || ''}`).join('\n');
  const social = (ctx.social && Object.keys(ctx.social).length ? '\nSocial: ' + Object.entries(ctx.social).map(([k, v]) => `${k}: ${v}`).join(', ') : '');
  return `You are the friendly website assistant of "${ctx.hotel_name || 'Hotel Lakshmi Deluxe'}".
Help website visitors with questions about the hotel, rooms, rates, amenities, booking, location and contact.
ONLY answer using the hotel facts below. If the visitor asks something not covered, politely point them to the contact details provided.

HOTEL FACTS:
Name: ${ctx.hotel_name || 'Hotel Lakshmi Deluxe'}
Tagline: ${ctx.tagline || ''}
Address: ${ctx.address || ''}
Phone: ${ctx.phone || ''}
Email: ${ctx.email || ''}
Welcome message: ${ctx.welcome || ''}
About: ${ctx.about || ''}
Currency: ${ctx.currency || '₹'}

ROOMS & RATES:
${rooms || '(no room info available)'}

FACILITIES:
${facilities || '(no facility info available)'}${social}

RULES:
- Be warm, concise (under 120 words). Suggest the visitor book online (Rooms -> Book Now).
- Do not mention that you are an AI, do not mention Groq or internal systems.
- Do not answer anything unrelated to this hotel.`;
}

export async function websiteChat(message, history, ctx, client) {
  const fallback = `Thank you for reaching out to ${ctx.hotel_name || 'Hotel Lakshmi Deluxe'}!
We would love to help. You can call us at ${ctx.phone || 'our front desk'} or email ${ctx.email || 'us'} for room rates, availability and bookings. For instant booking, visit the Rooms section and click "Book now".`;
  if (!client) return { reply: fallback };
  const messages = [
    { role: 'system', content: buildSitePrompt(ctx) },
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: message },
  ];
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 300,
    });
    return { reply: res.choices[0]?.message?.content || fallback };
  } catch (e) {
    console.error('[public-chat]', e.message);
    return { reply: fallback };
  }
}