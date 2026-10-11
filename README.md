# Mind Sprint

**A daily logic sprint for Indian children, in their own language, built on Sarvam AI.**

**Live demo:** [sarvam-campus-26.vercel.app](https://sarvam-campus-26.vercel.app/)

Mind Sprint is a 7-minute daily brain-training session for children aged 8–14. A parent receives one link on WhatsApp. The child solves four auto-graded puzzles in any of 11 languages, can have each puzzle read aloud, and gets Socratic hints that guide their reasoning without revealing the answer. Each week the parent receives a factual Session Digest in their own language, with a voice note.

Built for the Sarvam AI Campus Hackathon 2026.

---

## Features

| Area | What it does |
|---|---|
| **Daily Sprint** | Four auto-graded exercises every day: Fast Math (timed, numeric), Logic & Matrix, Riddle, and Curiosity (a short science passage followed by a question). |
| **Multilingual** | English plus Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi and Odia. Switch at any point, even in the middle of a puzzle. |
| **Read-aloud** | Puzzles and options can be played as natural Indic speech, for younger or slower readers. |
| **Socratic hints** | Up to three graded hints per puzzle. The server checks every hint before the child sees it, to make sure it doesn't reveal the answer. |
| **AI-generated sprints** | New sprints on any theme. Every generated item is independently re-solved before it is shown, and items that fail are replaced from a hand-checked bank. |
| **Completion badges** | Badges reward finishing sprints and are never lost. There are no streaks to break. |
| **Parent Session Digest** | A weekly WhatsApp-style summary with a voice note. It reports participation facts only. |
| **Deep Thought** | A weekly, ungraded philosophy question. The child answers by voice in any language and receives a thoughtful follow-up question. |

## Sarvam AI Models

| Capability | Model | Used for |
|---|---|---|
| Chat Completion (LLM) | `sarvam-105b` | Writing themed sprints, blind re-solving of generated items, Socratic hints, hint-leak checks, parent digests, Deep Thought follow-ups |
| Translation | `sarvam-translate:v1` | All puzzle content, hints, digests and prompts in 10 Indian languages |
| Text to Speech | `bulbul:v3` | Puzzle read-aloud and the parent digest voice note |
| Speech to Text | `saarika:v2.5` | Transcribing spoken Deep Thought reflections, with automatic language detection |

### AI pipelines

```
New sprint     theme → sarvam-105b (generate) → format validation → sarvam-105b (blind re-solve)
                     → mismatches replaced with curated items
Puzzle         English item → sarvam-translate:v1 → bulbul:v3 (on request)
Hint           puzzle + answer → sarvam-105b (Socratic hint) → leak checks → sarvam-translate:v1
Parent digest  verified stats → sarvam-105b → fact check against stats → sarvam-translate:v1 → bulbul:v3
Deep Thought   voice → saarika:v2.5 → sarvam-105b (follow-up question) → sarvam-translate:v1
```

## Trust and Safety

- **Verified content.** Generated puzzles are re-solved by an independent model call, and anything that fails is replaced with a hand-checked item. A curated 5-day bank (`public/puzzles.json`) keeps the app working if the API is unavailable.
- **No answer leaks.** Every hint is checked for the answer itself, for number words and intermediate results, and by a model-based judge.
- **Facts-only reporting.** The parent digest may only use numbers that appear in the child's actual stats. If the model writes any other figure, the server sends a factual template instead.
- **Privacy by design (DPDP Act 2023, §9(3)).**
  - No profiling of minors.
  - No claims of cognitive improvement.
  - No comparisons between children.
  - No upselling to children.
  - Voice recordings are transcribed and never stored.
- **Secure by default.**
  - The Sarvam API key stays on the server.
  - Requests are rate-limited per IP and size-capped.
  - Model output is escaped before rendering.
  - Error responses are generic.

## Getting Started

**Requirements:** Node.js 18 or later, and a Sarvam AI API key ([dashboard.sarvam.ai](https://dashboard.sarvam.ai/key-management)). There are no npm dependencies.

```bash
git clone https://github.com/omkaranu04/sarvam-campus-26.git
cd sarvam-campus-26
echo "SARVAM_API_KEY=your_key_here" > .env    # .env is git-ignored
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

When run locally, the server pre-generates and verifies sprints for common themes at startup, so **Generate** responds immediately. This takes about two minutes after launch.

| Environment variable | Default | Purpose |
|---|---|---|
| `SARVAM_API_KEY` | required | Sarvam AI subscription key |
| `PORT` | `3000` | Local server port |
| `SARVAM_API_BASE_URL` | `https://api.sarvam.ai` | API base URL override |
| `NO_PREWARM` | unset | Set to `1` to skip startup pre-generation |

## Deployment (Vercel)

The repository deploys to Vercel without changes. Static files are served from `public/`, and `api/[name].js` exposes the same handlers as serverless functions. The settings are pinned in `vercel.json`.

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Add `SARVAM_API_KEY` under **Settings → Environment Variables**.
3. Deploy.

Using the CLI instead:

```bash
npm i -g vercel
vercel
vercel env add SARVAM_API_KEY
vercel --prod
```

On serverless there is no startup pre-generation, so an AI-generated sprint takes 45–90 seconds. The curated daily sprints load instantly.

## Project Structure

```
├── server.js            Request handler, Sarvam AI integration and local server
├── api/[name].js        Vercel serverless entry point
├── public/
│   ├── index.html       Single-page app (sprint, parent digest, Deep Thought)
│   └── puzzles.json     Curated, hand-checked puzzle bank
├── vercel.json          Vercel configuration
├── PITCH.md             Product pitch and demo script
└── docs/
    └── Mind-Sprint-Pitch.pdf
```

## API

All endpoints accept and return JSON via `POST`.

| Endpoint | Purpose |
|---|---|
| `/api/generate` | Generate and verify a 4-item sprint for a theme |
| `/api/translate` | Translate a batch of strings |
| `/api/tts` | Synthesize speech |
| `/api/hint` | Generate a leak-checked Socratic hint |
| `/api/digest` | Generate the parent Session Digest and voice note |
| `/api/reflect` | Transcribe a spoken reflection and return a follow-up question |

## Roadmap

| Timeline | Milestone |
|---|---|
| December 2026 | Winter Mind Sprint: a free pilot delivered through WhatsApp during the school break |
| January 2027 | New Year 31-Day Challenge: the first paid sprint, at a flat, publicly listed price |
| Summer 2027 | Native app with async weekly leagues, sibling profiles and school packs |

See [PITCH.md](PITCH.md) and [docs/Mind-Sprint-Pitch.pdf](docs/Mind-Sprint-Pitch.pdf) for the full pitch.
