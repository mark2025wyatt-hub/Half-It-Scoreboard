# Half It Darts

A React/Vite Half It darts scorer with:

- Multiplayer games (2+ players)
- Competitive leaderboard using multiplayer scores only
- Solo Practice
- Personal high scores sorted highest-to-lowest
- Personal average score and games played
- Mobile numeric keypad with Enter and Half It (Bust)
- Optional Supabase shared database
- localStorage fallback if Supabase is not connected

## Run locally

```bash
npm install
npm run dev
```

## Connect Supabase

1. Create a Supabase project.
2. Open SQL Editor and run `supabase-setup.sql`.
3. Copy `.env.example` to `.env.local`.
4. Add your project URL and publishable key.
5. Restart `npm run dev`.

Without Supabase credentials the app still works, but scores are stored only in the current browser/device.

## Deploy to Vercel

Push this folder to a GitHub repository, import it into Vercel, and add these project environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Vercel should detect Vite automatically. Build command: `npm run build`; output directory: `dist`.
