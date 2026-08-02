# Security policy

Crop Circle Watch is a static site — HTML, CSS, JavaScript and generated data
files served by GitHub Pages. There is no server, no database, no account
system, and no personal data is collected from visitors. That removes most of
the OWASP Top 10 by construction (no injection into a query engine, no broken
access control, no session handling), and it concentrates the real risk in two
places.

## The two things actually worth attacking

**1. Untrusted text reaching the page.** `data.js`, `social.js` and `research.js`
are written by an unattended job at 06:58 each morning that reads third-party
sites — aggregators, forums, Bluesky. Nobody reviews that content before it goes
live. If a hostile string from one of those sources could become markup or a
URL, that is stored XSS on every visitor.

The defences, in order of how much they carry:

- Every script on the site is an external file, so the `Content-Security-Policy`
  meta tag in each page can keep `script-src` at `'self'` plus the one Bluesky
  embed host. **Never add `'unsafe-inline'` to `script-src`** to make an inline
  snippet work — move the snippet into a `.js` file instead. This one directive
  is what makes an injected `<script>` inert.
- Rendering goes through `textContent` and `document.createElement`, not string
  concatenation into `innerHTML`. Where `innerHTML` is unavoidable it takes
  site-authored markup only, or values passed through `escapeHtml()`.
- Every href sourced from data goes through `isPublicUrl()`, which requires an
  `http(s)://` prefix. This is what stops a `javascript:` URL from executing on
  click. Do not assign `a.href` from data without it.

**2. The scan pipeline.** The daily job runs an agent with edit and `git` access
over content it fetched from the open web. A page crafted to be read by that
agent is a prompt-injection route to committing arbitrary JavaScript into a
site that is already public — and CSP is no help there, because a file the
agent edited is a legitimately same-origin script.

The control for this is `hooks/pre-commit`, which restricts unattended commits
(no TTY) to `data.js`, `social.js`, `scan_rejected_log.md` and `research.js`.
Git hooks are not version controlled, so **it must be installed once per
clone**:

```bash
ln -sf ../../hooks/pre-commit .git/hooks/pre-commit
```

Interactive commits are unaffected. See `TODO.md` for the remaining hardening
work on the pipeline.

## Reporting

For anything a visitor could be harmed by before a fix lands — anything in
category 1 above — use the private channel, which is not world-readable:

<https://github.com/eric-henline/crop-circle-watch/security/advisories/new>

For everything else, a public issue is fine:
<https://github.com/eric-henline/crop-circle-watch/issues>

## Known and accepted limits

- `frame-ancestors` is ignored in a CSP `<meta>` tag and GitHub Pages cannot set
  response headers, so there is no clickjacking protection. Accepted: the site
  has no authenticated actions, so there is nothing to trick a click into doing.
  A custom domain behind a CDN would fix it.
- `style-src` allows `'unsafe-inline'`, needed for a handful of `style=""`
  attributes and the styles Bluesky's embed injects. Low value to an attacker
  with `script-src` locked down.
- The Bluesky "Live chatter" widget is the one third party left on the page,
  and only on `index.html`. It is opt-out-able by deleting the widget; until
  then `embed.bsky.app` can run script in the page, so the CSP is only as good
  as Bluesky's own supply chain. Accepted — the alternative is no widget.

## No longer applicable

- ~~Google Fonts~~ — the three typefaces are self-hosted as of 2026-08-01
  (`fonts.css` + `fonts/`). No visitor IP reaches Google, and `font-src` /
  `style-src` no longer name an external host. See the header of `fonts.css`
  before changing a weight.
