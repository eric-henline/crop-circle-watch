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

Open an issue: <https://github.com/eric-henline/crop-circle-watch/issues>

If the report is something a visitor could be harmed by before a fix lands —
anything in category 1 above — please say so in the title and skip the proof of
concept in the public issue; a description of the injection point is enough to
act on.

## Known and accepted limits

- `frame-ancestors` is ignored in a CSP `<meta>` tag and GitHub Pages cannot set
  response headers, so there is no clickjacking protection. Accepted: the site
  has no authenticated actions, so there is nothing to trick a click into doing.
  A custom domain behind a CDN would fix it.
- No Subresource Integrity on the Google Fonts stylesheet — its content is
  versioned and changes, so a pinned hash would break the site instead of
  protecting it. The font hosts are pinned in CSP instead.
- `style-src` allows `'unsafe-inline'`, needed for a handful of `style=""`
  attributes and the styles Bluesky's embed injects. Low value to an attacker
  with `script-src` locked down.
