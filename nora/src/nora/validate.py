"""Run the official HL7 FHIR validator over rendered bundles.

PROTOCOL.md section 13 asks for evidence other than our word: the HL7
validator reporting 0 errors against US Core. The validator is a Java
program published by HL7; this module pins one release by version and
sha256, downloads it once into `data/tools/`, and counts what it reports.

The validator checks codes against HL7's public terminology server, so a
run needs network access and Java 17 or newer. A run that cannot complete
is an error, never a result (PROTOCOL.md section 13).
"""

from __future__ import annotations

import hashlib
import re
import subprocess
import urllib.request
from collections import Counter
from pathlib import Path

VERSION = "7.0.5"
SHA256 = "9dfe9f305b0f9389eceade2a4a1c9a2740d7b0e614066fdf07a78b571c76d92f"
URL = f"https://github.com/hapifhir/org.hl7.fhir.core/releases/download/{VERSION}/validator_cli.jar"
JAR = Path("data/tools/validator_cli.jar")
FHIR_VERSION = "4.0.1"
US_CORE = "hl7.fhir.us.core#6.1.0"
MESSAGE = re.compile(r"^(?:\[\d+, \d+\] )?.*?: (Fatal|Error|Warning|Information) - (.*)$")
RESOURCE = re.compile(r"\b(Patient|Encounter|Condition|Observation|DocumentReference)/[\w.-]+")
FILE = re.compile(r"^(\S+\.json) \d\d:\d\d:\d\d$")  # the line that opens a file's messages


def jar() -> Path:
    """The pinned validator, downloaded on first use and checked every time."""
    if not JAR.exists():
        JAR.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, JAR)
    digest = hashlib.sha256(JAR.read_bytes()).hexdigest()
    if digest != SHA256:
        raise ValueError(f"{JAR} is not validator {VERSION}: sha256 {digest}")
    return JAR


def run(bundles: Path) -> dict:
    """Validate every `*.json` bundle in a directory and count the messages."""
    files = sorted(p for p in bundles.glob("*.json") if not p.name.endswith(".key.json"))
    if not files:
        raise ValueError(f"no bundles in {bundles}")
    command = ["java", "-jar", str(jar()), *map(str, files), "-version", FHIR_VERSION]
    command += ["-ig", US_CORE, "-output-style", "compact"]
    done = subprocess.run(command, capture_output=True, text=True, check=False)
    levels, kinds, failed, current = Counter(), Counter(), set(), None
    for line in done.stdout.splitlines():
        if opened := FILE.match(line):
            current = Path(opened.group(1)).name.removesuffix(".json")
        elif match := MESSAGE.match(line):
            level, text = match.groups()
            levels[level] += 1
            if level in ("Fatal", "Error") and current:
                failed.add(current)
            # Drop what differs between bundles, to count kinds of message.
            text = re.sub(r" \(codes = .*", "", text)
            kinds[f"{level}: {RESOURCE.sub(r'\1/<id>', text)}"] += 1
    validated = done.stdout.count("\n  Validate ")
    if validated != len(files) or "Done. Times:" not in done.stdout:
        tail = "\n".join((done.stdout + done.stderr).splitlines()[-5:])
        raise ValueError(
            f"the validator did not finish ({validated} of {len(files)} files):\n{tail}"
        )
    return {
        "validator": VERSION,
        "fhir_version": FHIR_VERSION,
        "implementation_guide": US_CORE,
        "bundles": len(files),
        "errors": levels["Fatal"] + levels["Error"],
        "warnings": levels["Warning"],
        "information": levels["Information"],
        "messages": dict(sorted(kinds.items())),
        "bundles_with_errors": sorted(failed),
    }
