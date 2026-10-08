import { neon } from '@neondatabase/serverless'

const getTopScores = async (sql) => {
  const rows = await sql`
    SELECT position, player_name AS name, score
    FROM (
      SELECT
        ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC, id ASC) AS position,
        player_name,
        score
      FROM leaderboard_scores
    ) ranked_scores
    WHERE position <= 10
    ORDER BY position
  `

  return rows.map((row) => ({
    position: Number(row.position),
    name: row.name,
    score: Number(row.score),
  }))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured')
    return res.status(503).json({ error: 'Leaderboard database is not configured' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    await sql`
      CREATE TABLE IF NOT EXISTS leaderboard_scores (
        id BIGSERIAL PRIMARY KEY,
        player_name TEXT NOT NULL DEFAULT 'プレイヤー',
        score INTEGER NOT NULL CHECK (score >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    if (req.method === 'POST') {
      const { score } = req.body ?? {}

      if (!Number.isSafeInteger(score) || score < 0 || score > 2147483647) {
        return res.status(400).json({ error: 'Score must be a non-negative integer' })
      }

      await sql`
        INSERT INTO leaderboard_scores (player_name, score)
        VALUES ('プレイヤー', ${score})
      `
    }

    const scores = await getTopScores(sql)
    return res.status(200).json({ scores })
  } catch (error) {
    console.error('Leaderboard request failed:', error)
    return res.status(500).json({ error: 'Unable to load the leaderboard' })
  }
}
