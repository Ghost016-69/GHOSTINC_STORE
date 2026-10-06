"""Write _fixtures.js from the JSON that _cart_fixtures.py produced.

Kept separate from the test page so the browser can load it as a plain script,
with no fetch() and therefore no file:// CORS problems.

    python _build_test.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
source = ROOT / "_fixtures.json"
fixtures = json.loads(source.read_text(encoding="utf-8-sig"))

destination = ROOT / "_fixtures.js"
destination.write_text(
    "/* GENERATED from _fixtures.json - do not edit. */\n"
    "window.GHOSTINC_FIXTURES = "
    + json.dumps(fixtures, indent=2)
    + ";\n",
    encoding="utf-8",
)

print(f"wrote {destination} ({len(fixtures)} fixtures)")
