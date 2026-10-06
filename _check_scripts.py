"""Throwaway checker for the front end's JavaScript.

There is no Node in this environment, so instead of a parser this walks each
file and checks the only things that can silently break a script: unbalanced
brackets, and a string or comment that is never closed. Comments and string
literals are blanked out first, so brackets inside them do not count.

    python _check_scripts.py
"""

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SCRIPTS = sorted((ROOT / "Front-end" / "Scripts").glob("*.js"))

PAIRS = {")": "(", "]": "[", "}": "{"}
OPENERS = set("([{")

# data.js is machine generated and very large; it is checked but not printed.
VERBOSE_LIMIT = 20000


def strip_noise(source):
    """Blank out comments, strings and regex literals, preserving newlines.

    Regex literals matter here: escapeHtml() contains .replace(/"/g, ...), and
    a naive scanner reads that quote as the start of a string and then reports
    the rest of the file as unterminated.
    """
    out = []
    i = 0
    n = len(source)
    # The last real code character seen. A "/" only opens a regex when it sits
    # where an expression may begin, not after a value (which would be division).
    last = ""

    def blank(text):
        return "\n" * text.count("\n") + " " * (len(text) - text.count("\n"))

    while i < n:
        ch = source[i]
        nxt = source[i + 1] if i + 1 < n else ""

        if ch == "/" and nxt == "/":
            start = i
            while i < n and source[i] != "\n":
                i += 1
            out.append(blank(source[start:i]))
            continue

        if ch == "/" and nxt == "*":
            start = i
            i += 2
            while i < n and not (source[i] == "*" and source[i + 1 : i + 2] == "/"):
                i += 1
            i = min(i + 2, n)
            out.append(blank(source[start:i]))
            continue

        # A regex literal: "/ ... / flags"
        if ch == "/" and (last in "(,=:[!&|?{};+-*%~^<>" or last == ""):
            start = i
            i += 1
            in_class = False
            closed = False
            while i < n:
                c = source[i]
                if c == "\\":
                    i += 2
                    continue
                if c == "\n":
                    break  # not a regex after all
                if c == "[":
                    in_class = True
                elif c == "]":
                    in_class = False
                elif c == "/" and not in_class:
                    i += 1
                    closed = True
                    break
                i += 1
            if closed:
                while i < n and source[i].isalpha():
                    i += 1
                out.append(blank(source[start:i]))
                last = "/"
                continue
            # Unterminated: fall through and treat the slash as punctuation.
            i = start

        if ch in "\"'`":
            quote = ch
            start = i
            i += 1
            closed = False
            while i < n:
                if source[i] == "\\":
                    i += 2
                    continue
                if source[i] == quote:
                    i += 1
                    closed = True
                    break
                i += 1
            if not closed:
                line = source.count("\n", 0, start) + 1
                return None, f"string opened on line {line} is never closed"
            out.append(blank(source[start:i]))
            last = quote
            continue

        out.append(ch)
        if not ch.isspace():
            last = ch
        i += 1

    return "".join(out), None


def check(path):
    source = path.read_text(encoding="utf-8")
    cleaned, error = strip_noise(source)
    if error:
        return [error]

    problems = []
    stack = []
    line = 1

    for ch in cleaned:
        if ch == "\n":
            line += 1
        elif ch in OPENERS:
            stack.append((ch, line))
        elif ch in PAIRS:
            if not stack:
                problems.append(f"stray {ch!r} on line {line}")
            else:
                opener, opened = stack.pop()
                if opener != PAIRS[ch]:
                    problems.append(
                        f"{ch!r} on line {line} closes {opener!r} opened on line {opened}"
                    )

    for opener, opened in stack:
        problems.append(f"{opener!r} opened on line {opened} is never closed")

    return problems


bad = 0

for script in SCRIPTS:
    problems = check(script)
    size = script.stat().st_size
    name = script.name

    if problems:
        bad += 1
        print(f"FAIL {name} ({size} bytes)")
        for problem in problems[:10]:
            print(f"       - {problem}")
    else:
        suffix = "" if size <= VERBOSE_LIMIT else "  [generated, balanced]"
        print(f"OK   {name} ({size} bytes){suffix}")

print()
print(f"{len(SCRIPTS)} script(s) checked, {bad} with problems.")
sys.exit(1 if bad else 0)