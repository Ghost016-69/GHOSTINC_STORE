"""Run every check for GHOSTINC_STORE in one go.

    python Tests/_run_tests.py

Four stages, none of which need the Django server to be running:

  1. _check_scripts.py  - every .js file has balanced brackets and no string
                          or regex left open.
  2. _verify_frontend.py- every page has balanced tags, a data-page attribute
                          and only asset references that exist on disk.
  3. browser tests      - headless Edge runs the offline engine and compares
                          every cart figure against fixtures produced by
                          Django's own quote().

Stage 3 needs Microsoft Edge. If it is missing, that stage is skipped rather
than failed, so the first two still run anywhere.
"""

import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

BROWSER_TESTS = ["_test_offline.html", "_test_firstcall.html"]


def run_python(script, cwd=ROOT):
    print(f"\n=== {script} " + "=" * (58 - len(script)))
    result = subprocess.run(
        [sys.executable, str(ROOT / script)],
        cwd=str(cwd),
        capture_output=True,
        text=True,
    )
    print(result.stdout.strip())
    if result.stderr.strip():
        print(result.stderr.strip())
    return result.returncode == 0


def find_edge():
    for candidate in EDGE_CANDIDATES:
        if pathlib.Path(candidate).exists():
            return candidate
    return None


def run_browser_tests():
    edge = find_edge()
    if edge is None:
        print("\n=== browser tests SKIPPED (Microsoft Edge not found)")
        return True

    ok = True
    for page in BROWSER_TESTS:
        print(f"\n=== {page} " + "=" * (58 - len(page)))
        url = (HERE / page).as_uri()
        result = subprocess.run(
            [
                edge,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--virtual-time-budget=20000",
                "--dump-dom",
                url,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

        dom = result.stdout
        title = re.search(r"<title>(.*?)</title>", dom, re.S)
        title = title.group(1).strip() if title else "(no title)"

        body = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
        text = body.group(1) if body else ""

        passes = len(re.findall(r"^PASS", text, re.M))
        fails = re.findall(r"^FAIL.*$", text, re.M)

        print(f"    title   : {title}")
        print(f"    passed  : {passes}")
        print(f"    failed  : {len(fails)}")
        for line in fails:
            print(f"      {line}")

        if title != "TESTS_PASSED":
            ok = False

    return ok


def main():
    # Everything is written to a report file as well as printed, because this
    # project is usually checked from a shell that does not capture output.
    report = ROOT / "Tests" / "_last_run.log"

    class Tee:
        def __init__(self, *targets):
            self.targets = targets

        def write(self, text):
            for target in self.targets:
                target.write(text)
                target.flush()

        def flush(self):
            for target in self.targets:
                target.flush()

    with report.open("w", encoding="utf-8") as handle:
        real_stdout = sys.stdout
        sys.stdout = Tee(real_stdout, handle)
        try:
            print("GHOSTINC_STORE checks")
            print("=" * 70)

            results = [
                run_python("_check_scripts.py"),
                run_python("_verify_frontend.py"),
                run_browser_tests(),
            ]

            print("\n" + "=" * 70)
            labels = ["script structure", "page structure", "browser tests"]
            for label, passed in zip(labels, results):
                print(f"{'PASS' if passed else 'FAIL'}  {label}")
            print(f"\nreport written to {report}")
        finally:
            sys.stdout = real_stdout

    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())