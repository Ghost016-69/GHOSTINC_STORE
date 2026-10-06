"""Throwaway checker for the GHOSTINC front end.

Verifies that every page has balanced tags, declares a data-page, and that
every local asset it references actually exists on disk.
"""

import html.parser
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
FRONT = ROOT / "Front-end"
TEMPLATES = sorted((FRONT / "Templates").glob("*.html"))

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}

ASSET_RE = re.compile(r'(?:src|href)="([^"#][^"]*)"')


class Checker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"stray </{tag}> on line {self.getpos()[0]}")
            return
        open_tag, line = self.stack.pop()
        if open_tag != tag:
            self.errors.append(
                f"</{tag}> on line {self.getpos()[0]} closes <{open_tag}> "
                f"opened on line {line}"
            )


problems = 0

for page in TEMPLATES:
    text = page.read_text(encoding="utf-8")
    checker = Checker()
    checker.feed(text)
    checker.close()

    for tag, line in checker.stack:
        checker.errors.append(f"<{tag}> on line {line} is never closed")

    if 'data-page="' not in text:
        checker.errors.append("no data-page attribute on <body>")

    for match in ASSET_RE.findall(text):
        if match.startswith(("http://", "https://", "mailto:", "tel:", "#")):
            continue
        # Drop any ?query and #fragment: "shop.html?on_sale=1" is still shop.html.
        local = match.split("#", 1)[0].split("?", 1)[0]
        if not local:
            continue
        target = (page.parent / local).resolve()
        if not target.exists():
            checker.errors.append(f"missing asset: {match}")

    status = "OK  " if not checker.errors else "FAIL"
    print(f"{status} {page.name}")
    for error in checker.errors:
        problems += 1
        print(f"       - {error}")

print()
print(f"{len(TEMPLATES)} pages checked, {problems} problem(s).")
sys.exit(1 if problems else 0)
