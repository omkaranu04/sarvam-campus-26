# Mind Sprint: Duolingo for Logic

**One line:** A 10-minute daily logic sprint for Indian kids aged 8-14. Parents get a WhatsApp link, there's no app to install, and it works in the child's own language, powered by Sarvam AI.

*Built by IIT Kharagpur founders.*

## Problem
- Indian kids get plenty of rote practice and very little *thinking* practice: logic, deduction, curiosity, asking "why?".
- The main competitor (LogIQids) needs a **144 MB app install** and punishes kids with **streak loss**. Many parents use shared phones with little storage, so this loses kids in week one.
- Most content is **English-only**. A child who reads slowly in English gets shut out of puzzles they could solve easily in Hindi or Tamil.
- Edtech has a trust problem in India. After WhiteHat Jr and Lumosity were called out for efficacy claims, parents ignore "improves IQ by 30%".

## Solution
One daily link on WhatsApp → a **4-part sprint**, auto-graded:
1. **Fast Math**: quick numeric answers (cricket scores, rupees, trains)
2. **Logic & Matrix**: patterns, sequences and deduction (MCQ)
3. **Riddles**: lateral thinking (MCQ)
4. **Curiosity + Science**: a 3-sentence mini-blog (Chandrayaan-3, monsoon, ripening mangoes) followed by one MCQ

Plus a weekly ungraded **Deep Thought** philosophy prompt ("Is it ever okay to lie to make a friend happy?") that the child answers **out loud**.

**Our edges:** no install · **completion badges, not streak punishment** · 10+ Indian languages · read-aloud for slow readers · **Socratic AI hints that never reveal the answer** · honest parent digest.

## 2-Minute Demo Script
1. **Pick a language.** Choose Tamil and the whole sprint translates instantly.
2. **Hear it.** Tap the speaker and Bulbul reads the puzzle aloud in natural Tamil.
3. **Get it wrong.** Pick a wrong answer on the Logic pattern.
4. **Socratic hint.** The AI asks, "What happens to the gap between each number?" It nudges without giving the answer away.
5. **Solve it.** The child gets it right, earns +10 points and a confetti moment.
6. **Badges.** Finishing the sprint unlocks badges like "First Sprint" or "Clean Sweep". If the child missed yesterday, nothing is lost.
7. **Parent tab.** Generate the weekly **Session Digest** in Hindi: "Aarav did 5 of 7 days, earned 180 points, and cracked the Chandrayaan question." It also arrives as a **voice note** for the parent who'd rather listen.
8. **Deep Thought.** The child *speaks* a reflection in Hindi. Saarika transcribes it and the AI replies with one curious follow-up question. No score, just thinking.

## How Sarvam Powers It
| Feature | Sarvam API | Why it matters |
|---|---|---|
| Fresh daily puzzles, India-flavoured | `sarvam-105b` chat | Unlimited content, culturally local |
| Socratic hints (never the answer) | `sarvam-105b` chat | Kids learn to think instead of copying |
| Weekly parent digest | `sarvam-105b` chat | Warm, factual, in plain language |
| 10+ Indian languages | `/translate` (sarvam-translate / mayura) | Reaches kids beyond English-medium schools |
| Read-aloud puzzles + digest voice note | `/text-to-speech` **bulbul:v3** | Helps slow readers, and parents who prefer listening to reading |
| Spoken Deep Thought reflections | `/speech-to-text` **saarika** | Kids who think faster than they type |

A curated offline puzzle bank keeps the sprint working even if the API is down.

## Why Now / Market
- Roughly **250M school students** in India (UDISE+). Smartphone and WhatsApp reach now extends to Tier-2/3 parents.
- NEP 2020 explicitly calls for **critical thinking and computational skills** from early grades.
- Indic voice and translation are finally good enough (Sarvam) to make *native-language* learning feel natural instead of machine-translated.

## Business Model
- **Free pilot**: the December winter sprint.
- Then a **flat, transparent ₹ price per sprint** (e.g. 31-day challenge). The price is listed on the page, there are **no sales calls**, no EMI traps and no upsell funnel.
- Schools and tuition centres can buy class packs later.

## Compliance by Design (DPDP Act 2023)
- **No profiling of minors (S.9(3))**: we never compute or claim "% cognitive improvement". The digest reports **engagement facts only**: days done, points and one highlight.
- **No behavioural tracking or targeted ads** aimed at children.
- **Verifiable parental consent**: the link goes to the parent, who controls access.
- **Data minimisation**: no child's name or school is required. Voice reflections are transcribed and the audio is not stored.
- **No efficacy claims**: we learned from the Lumosity (FTC) and WhiteHat Jr precedents.

## Roadmap
| When | Milestone |
|---|---|
| **Dec 2026** | Winter Mind Sprint pilot: free, WhatsApp link, 5 languages |
| **Jan 2027** | **New Year 31-Day Challenge**: first paid sprint at a flat ₹ price |
| **Summer 2027** | Full app with sibling profiles, offline packs and school dashboards |

**Mind Sprint: thinking practice in your child's language, with no install and no pressure.**
