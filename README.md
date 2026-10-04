# Lied-Cybertober-2026

A middle-school-friendly cybersecurity adventure with six custom earned badges, a full Sunday–Saturday monthly calendar, daily activity previews, progress tracking, collectible badges (Recruit, Ghost, Gadget, Lock N’ Key, Scout, and Cyber Defender), and a cyber-safety pledge. Includes filters for available and completed missions, responsive layouts, and an expandable resource library. The original project is untouched.

The 2026 calendar, scoring, and saved-progress format are preserved. School-specific branding has been removed, and examples now use fictional school addresses. The former registration bonus is now a cyber-pledge bonus; existing bonus credit is preserved. Linked videos, PDFs, and provider modules remain third-party resources and have not all been rewritten for a middle-school reading level.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No npm install, build service, database, or account is required. All 31 challenges are visible in their October 2026 weekday positions. Cards summarize the activities; future dates open a read-only preview with activity titles, quiz counts, and the unlock date. Lessons unlock on their October 2026 dates. Status filters preserve date positions. On smaller screens, scroll horizontally inside the calendar to see the full week. To review all lessons now, temporarily set `unlockAll: true` in `js/content.js`; restore it to `false` for the scheduled course.

## Build a web-hosting package

```sh
python3 scripts/package.py
```

This creates `dist/Lied-Cybertober-2026-web.zip`. Extract it for static web hosting; `index.html` is at the root. The editable project itself can also be published directly.

Progress is saved in this browser on this device. GitHub Pages does not provide centralized grades, accounts, or cross-device synchronization. Videos and linked KnowBe4 modules still require internet access and may depend on provider access or availability. They are not bundled into the ZIP.

SCORM packaging is deferred until needed. The original optional LMS adapter remains in `js/scorm.js`; the standalone app uses its browser-storage fallback and requires no Canvas account or LMS.

## Publish later on GitHub Pages

1. Create a repository named `Lied-Cybertober-2026` on your GitHub account.
2. Commit this folder's contents with `index.html` at the repository root. Do not commit `dist/`.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/(root)**.
4. The site will be available at `https://YOUR-USERNAME.github.io/Lied-Cybertober-2026/` after deployment.

Relative asset paths support a repository subpath. `.nojekyll` is included. Nothing has been published automatically.

GitHub's setup documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Edit next

- `js/content.js`: lessons, games, quizzes, resources, course year, unlock rules, attribution.
- `index.html`: main page, branding, registration panel.
- `css/app.css`: layout and visual design.
- `js/app.js`: calendar, lesson panels, scoring, badges, certificate.
- `js/games.js`: interactive activities.
- `js/scorm.js`: LMS communication and local progress storage.

Future curriculum work can simplify the longer readings and review linked activities with a teacher. Third-party attribution remains preserved.

## Original attribution

Created by Lily Morningstar, Cybersecurity Instructor. Content includes credited adaptations and materials from KnowBe4, CISA, NIST, the National Cybersecurity Alliance, and the FTC; those materials remain the property of their owners. See the in-app Sources & Citations for details.

The supplied badge artwork is included unchanged. The previous hero robot has been removed pending replacement artwork. Badge IDs and earning requirements remain unchanged, preserving existing progress.

## Uploaded Week 1 posters

The supplied PNG artwork is included unchanged, with descriptive image text and full-size links in upcoming mission previews:

- October 5: Don't Get Hooked.
- October 6: Question the Message.
- October 7: See Something? Say Something!
- October 8: Be Cyber Ready.
- October 9: Same Look, Higher Risk.
- October 10: See Something? Say Something! plus Don't Get Hooked for the red-flag game.

The request to select new middle-school video lessons for every day remains outstanding; the existing video assignments are unchanged by this poster update.

## Uploaded Week 2 posters

- October 12: AI-Powered Phishing (rendered poster plus unchanged original PDF).
- October 13: Deepfakes — common signs.
- October 14: Prompt Smart.
- October 15: Smart Prompts, Safer Results.
- October 16: Gadget — Keep Your Tools Sharp.
- October 17: Deepfakes — Pause, Verify, Protect.
- October 18: Deepfakes — Always Verify Before You Trust.

All seven appear in lessons and upcoming-day previews. Supplied artwork is preserved; images have descriptive alternative text.

## Neon look + new art (October 4)

- Theme: cyberpunk kids-anime neon (dark night background, cyan / magenta / violet glow, Chakra Petch headings from Google Fonts with local fallbacks). All colors live in the `NEON THEME` block at the end of `css/app.css` (`<html data-theme="neon">`). The certificate stays white for printing.
- `img/logo-pigeon.webp`: header logo (transparent background).
- `img/hero-cyber-kids.webp`: full-width banner at the top of the home page.
- `img/cyber-pigeon-round.webp`: mascot in the hero with a speech bubble.
- `img/favicon-pigeon.png`: browser-tab icon.
- Backup of the site before this change: `../../backups/Lied-Cybertober-2026_pre-neon_2026-10-04.zip`.

## Accessibility (ADA / WCAG 2.1 AA), October 4

Tested on all 31 lessons, the home page, previews, games and poster viewer with axe-core (WCAG 2.0/2.1/2.2 A and AA rules): 0 violations. Manual checks: keyboard-only play, focus trap and focus return in dialogs, Esc to close, reflow at 320px, contrast math for every theme color pair.

- `js/poster-text.js`: full text of all 22 posters, shown under each poster as "Read the poster text". Update it whenever a poster changes.
- Posters can be enlarged with the keyboard (Enter/Space). The enlarged view has a Close button and returns focus.
- Word search: arrow keys + Enter/Space, plus a "Show where each word starts" hint list for screen-reader users.
- YouTube videos open with captions on (`cc_load_policy=1`).
- The calendar becomes a single list on phones (no sideways scrolling).
- Mascot animation stops after 4 seconds; all motion is off with "reduce motion".
- An Accessibility statement is at the bottom of the page (`#accessibility`).
