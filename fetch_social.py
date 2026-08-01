#!/usr/bin/env python3
"""Fetch public Bluesky posts about crop circles and write dashboard/social.js.

TODO item 5b. The site is static with no backend, so there is nowhere to run a
live query from — but there does not need to be. This runs at BUILD time, as a
step in the daily scan, and commits a plain `window.SOCIAL_FEED` global next to
`data.js`. No runtime keys, no new hosting, no third-party JS on the page.

Why Bluesky and not X: Bluesky's AppView answers `app.bsky.feed.searchPosts`
unauthenticated over plain HTTPS. X charges roughly $200/month for read access.
X therefore stays a link-out, exactly as TODO.md decided.

Two findings from building this, both of which shaped the filtering below:

  1. Use `api.bsky.app`, NOT `public.api.bsky.app`. The latter returns a styled
     403 HTML page for the searchPosts route while happily serving other routes,
     so a naive health check on the host passes and the actual query still fails.

  2. `sort=latest` on the bare phrase "crop circle" is almost entirely noise —
     a word-game meme was posting the phrase in random word lists, and it
     drowned out every real post. `sort=top` plus the corroboration gate in
     `is_on_topic()` is what makes the results worth showing. This is why the
     script is picky rather than just taking the first N results.

Nothing here is presented as research. The widget labels the feed as public
chatter fetched by the scan, which is what it is.

Re-runnable any time; safe to run by hand:

    python3 dashboard/fetch_social.py
"""

import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "social.js")

# Searched in order; results are pooled and de-duplicated by post URI.
QUERIES = ['"crop circle"', '"crop circles"', "cropcircle", "cropcircles"]

WANT = 8            # posts written to social.js
PER_QUERY = 40      # results requested per query before filtering
# Without this one prolific account fills the whole widget — on the first real
# run, six of eight slots came from a single poster working through a series.
MAX_PER_AUTHOR = 2
TIMEOUT = 25
MAX_AGE_DAYS = 120  # older than this and "live chatter" is a stretch

# A post has to name the subject...
SUBJECT = re.compile(r"crop\s*-?\s*circle", re.I)

# ...and then corroborate it with something that suggests an actual formation
# rather than the phrase used as a punchline. Deliberately broad: the widget is
# "chatter", not a literature review, and over-tight filtering empties it.
#
# NOTE: this is matched against the text with the subject phrase REMOVED. An
# earlier version listed "crop" here and tested the raw text, so the word inside
# "crop circle" corroborated itself and the gate passed on literally everything.
CORROBORATE = re.compile(
    r"\b(wiltshire|avebury|silbury|stonehenge|barbury|hackpen|milk\s+hill|"
    r"formation|glyph|wheat|barley|rapeseed|farmer|field|harvest|aerial|drone|"
    r"geometry|geometric|fractal|sacred|ufo|uap|aliens?|"
    r"cereolog|hoax|photograph|photo|season)\b",
    re.I,
)

# The word-game memes that poison this search. Two of them run: one posts a bare
# list of unrelated noun phrases, the other lists words "added to the dictionary
# in 1988". Both put "crop circle" in a list with no sentence around it, and
# together they were most of what the raw search returned.
MEME_TOKENS = re.compile(
    r"\b(f-bomb|mosh\s+pit|queer\s+theory|non-avian\s+dinosaur|breakbeat|"
    r"oppositional\s+defiant\s+disorder|killer\s+app|heteroglossia|stress\s+ball|"
    r"service\s+animal|declinist|joypad|cold\s+brew|himbo|hoverboard|swole|"
    r"adaptive\s+cruise\s+control|unibrow|gangsta)\b",
    re.I,
)


def looks_like_a_word_list(text):
    """True for posts that are a list of terms rather than something said.

    Catches the meme family generically, so a new variant with different words
    does not need a new entry in MEME_TOKENS.
    """
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 3:
        return False
    short = sum(1 for ln in lines if len(ln.split()) <= 3)
    sentences = sum(1 for ln in lines if ln.rstrip().endswith((".", "!", "?")))
    return short >= len(lines) * 0.7 and sentences == 0


def get_json(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "crop-circle-watch/1.0 (+https://github.com/eric-henline/crop-circle-watch)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.load(resp)


def search(query):
    qs = urllib.parse.urlencode({"q": query, "limit": PER_QUERY, "sort": "top"})
    return get_json(API + "?" + qs).get("posts", [])


def is_on_topic(text):
    if not SUBJECT.search(text):
        return False
    if MEME_TOKENS.search(text) or looks_like_a_word_list(text):
        return False
    # Corroborate against the text with the subject phrase stripped out, so the
    # phrase cannot vouch for itself.
    if not CORROBORATE.search(SUBJECT.sub(" ", text)):
        return False
    # A post that is nothing but hashtags carries no chatter worth quoting.
    words = [w for w in text.split() if not w.startswith(("#", "@"))]
    return len(words) >= 4


def post_url(post):
    handle = (post.get("author") or {}).get("handle")
    rkey = post.get("uri", "").rsplit("/", 1)[-1]
    if not handle or not rkey:
        return None
    return "https://bsky.app/profile/{}/post/{}".format(handle, rkey)


def collect():
    seen, out, errors = set(), [], []
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=MAX_AGE_DAYS)

    for query in QUERIES:
        try:
            posts = search(query)
        except (urllib.error.URLError, ValueError, TimeoutError) as exc:
            errors.append("{}: {}".format(query, exc))
            continue

        for post in posts:
            uri = post.get("uri")
            if not uri or uri in seen:
                continue
            record = post.get("record") or {}
            text = (record.get("text") or "").strip()
            if not is_on_topic(text):
                continue

            created = record.get("createdAt") or ""
            try:
                when = datetime.datetime.fromisoformat(created.replace("Z", "+00:00"))
            except ValueError:
                continue
            # Bluesky timestamps are author-supplied and occasionally sit in the
            # future; those sort to the top forever, so drop them.
            if when < cutoff or when > datetime.datetime.now(datetime.timezone.utc):
                continue

            url = post_url(post)
            if not url:
                continue

            seen.add(uri)
            author = post.get("author") or {}
            out.append({
                "platform": "bluesky",
                "url": url,
                "author": author.get("displayName") or author.get("handle"),
                "handle": "@" + (author.get("handle") or ""),
                "text": text if len(text) <= 280 else text[:277].rstrip() + "…",
                "postedAt": when.isoformat().replace("+00:00", "Z"),
                "likes": post.get("likeCount") or 0,
            })

    # Newest first: this is a chatter feed, so recency beats engagement once a
    # post has already cleared the topic gate.
    out.sort(key=lambda p: p["postedAt"], reverse=True)

    picked, per_author = [], {}
    for post in out:
        handle = post["handle"]
        if per_author.get(handle, 0) >= MAX_PER_AUTHOR:
            continue
        per_author[handle] = per_author.get(handle, 0) + 1
        picked.append(post)
        if len(picked) >= WANT:
            break
    return picked, errors


def write(posts, errors):
    header = (
        "/* ==========================================================================\n"
        "   social.js — GENERATED, do not hand-edit.\n"
        "\n"
        "   Written by dashboard/fetch_social.py as a step in the daily scan. Holds\n"
        "   public Bluesky posts matching crop-circle terms, filtered for on-topic\n"
        "   content (see the docstring in fetch_social.py for why the filtering is\n"
        "   as picky as it is).\n"
        "\n"
        "   This is PUBLIC CHATTER, not verified research. Nothing here has been\n"
        "   checked against a source, and the widget labels it accordingly. Never\n"
        "   promote an entry from here into STORIES without running it through the\n"
        "   normal verification in dashboard_scan_prompt.md first.\n"
        "\n"
        "   Regenerate:  python3 dashboard/fetch_social.py\n"
        "   ==========================================================================\n"
        " */\n"
    )
    payload = {
        "fetchedAt": datetime.datetime.now(datetime.timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
        "source": "bluesky",
        "posts": posts,
    }
    if errors:
        payload["errors"] = errors

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("window.SOCIAL_FEED = ")
        fh.write(json.dumps(payload, indent=2, ensure_ascii=False))
        fh.write(";\n")


def main():
    posts, errors = collect()

    # A transient network failure must not blank a feed that was fine
    # yesterday. Only overwrite social.js when there is something to put in it.
    if not posts and os.path.exists(OUT):
        print("fetch_social: no posts passed the filter; keeping existing social.js")
        for err in errors:
            print("  error:", err)
        return 0

    write(posts, errors)
    print("fetch_social: wrote {} post(s) to {}".format(len(posts), OUT))
    for err in errors:
        print("  error:", err)
    return 0


if __name__ == "__main__":
    sys.exit(main())
