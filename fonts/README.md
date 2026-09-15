# Typefaces

Every font in this directory is licensed under the **SIL Open Font License 1.1**.
Each family's licence — including its copyright line, which is the part that
differs — is in the matching `OFL-<Family>.txt` beside the `.woff2` files.

The OFL requires that the licence and copyright notice travel with any
redistributed copy of the font. This repo is public and serves these files to
every visitor, so those notices have to be here. They were missing until
2026-08-16.

## In use

Set by the `--font-*` tokens in `theme.css`. The `@font-face` rules are in
`fonts.css`.

| Family | Role | Files | Licence |
|---|---|---|---|
| Syne | `--font-display` — headlines, wordmark | `syne-*.woff2` (variable 400–800) | [OFL-Syne.txt](OFL-Syne.txt) |
| Space Grotesk | `--font-body` — prose | `space-grotesk-*.woff2` (variable 300–700) | [OFL-SpaceGrotesk.txt](OFL-SpaceGrotesk.txt) |
| Space Mono | `--font-mono` — data, labels, chrome | `space-mono-*.woff2` (static, 2 weights × 2 styles) | [OFL-SpaceMono.txt](OFL-SpaceMono.txt) |

## Kept, but not currently loaded

These belong to the previous "Listening Post" theme. Nothing references them —
there are no `@font-face` rules for them in `fonts.css`, so no visitor
downloads them. They stay because `theme.css` documents how to restore that
theme, and that restore is only real if the files are still here.

| Family | Files | Licence |
|---|---|---|
| Bricolage Grotesque | `bricolage-grotesque-*.woff2` | [OFL-BricolageGrotesque.txt](OFL-BricolageGrotesque.txt) |
| Newsreader | `newsreader-*.woff2` | [OFL-Newsreader.txt](OFL-Newsreader.txt) |
| Fragment Mono | `fragment-mono-*.woff2` | [OFL-FragmentMono.txt](OFL-FragmentMono.txt) |

If you decide the previous theme is never coming back, delete these ten
`.woff2` files, their three `OFL-*.txt`, this table, and the restore block at
the bottom of `theme.css` together — leaving the restore instructions without
the files is worse than either.

## How these were acquired

From the Google Fonts CSS2 API, `latin` and `latin-ext` subsets only. Each
`OFL-*.txt` is the family's own licence file taken verbatim from
`github.com/google/fonts/ofl/<family>/OFL.txt`.

Two traps, both of which have cost time here before:

- **Fetch the css2 URL with a real browser User-Agent.** The API serves `.ttf`
  to clients it does not recognise and `.woff2` only to modern ones, so a plain
  `curl` silently gets the wrong format.
- **Variable families are one file for the whole weight range.** Google's own
  CSS lists the same URL once per weight; you only need it once. Only Space
  Mono here is static, which is why it has four faces and the others have one.

Regenerating is documented in the header of `fonts.css`.
