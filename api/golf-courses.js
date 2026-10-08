// Vercel serverless function: a thin, cached relay to GolfCourseAPI so the API key never reaches the browser.
//   GET /api/golf-courses?q=<name>   -> course search
//   GET /api/golf-courses?id=<id>    -> one course with tees and holes
// The key is read from the GOLF_COURSE_API_KEY environment variable (set in Vercel project settings).
const BASE = 'https://api.golfcourseapi.com/v1';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const key = process.env.GOLF_COURSE_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'not_configured' });
    return;
  }

  const { q, id } = req.query || {};
  let url;
  if (id !== undefined) {
    if (!/^\d{1,9}$/.test(String(id))) {
      res.status(400).json({ error: 'bad_id' });
      return;
    }
    url = `${BASE}/courses/${id}`;
  } else if (q !== undefined) {
    const query = String(q).trim().slice(0, 80);
    if (query.length < 3) {
      res.status(400).json({ error: 'query_too_short' });
      return;
    }
    url = `${BASE}/search?search_query=${encodeURIComponent(query)}`;
  } else {
    res.status(400).json({ error: 'missing_params' });
    return;
  }

  try {
    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Identical lookups are served from Vercel's CDN for a day, which keeps us well inside the daily request limit.
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store');
    res.status(upstream.status).send(body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'upstream_unreachable' });
  }
}
