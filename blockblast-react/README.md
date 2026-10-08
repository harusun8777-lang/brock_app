# Block Blast

## Vercel leaderboard setup

The shared top-10 leaderboard uses a Vercel Function and a Neon PostgreSQL database.

1. Import this repository into Vercel and set the project root to `blockblast-react`.
2. Create a Neon PostgreSQL database using the Vercel Marketplace integration.
3. Add the database connection string as the `DATABASE_URL` environment variable for the Vercel project. Keep it server-side; do not prefix it with `VITE_`.
4. Redeploy the project. The API creates the leaderboard table when it receives its first request.

Scores are submitted as the anonymous display name `プレイヤー`. The API accepts client-provided scores, so this leaderboard is for casual play and is not cheat-proof.
