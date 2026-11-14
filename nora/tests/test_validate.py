"""How the validator's output is counted. The validator itself is not run
here: it needs Java and the network, and `nora validate` is where it runs."""

import subprocess
from pathlib import Path

import pytest

from nora import validate

OUTPUT = """Loading
Validating
  Validate a.json
 00:01.799
  Validate b.json
 00:00.313
Done. Times: Loading: 00:19.388, validation: 00:04.171 (#2). Max Memory = 3Gb
----------------------------------------------------------------
bundles/a.json 03:38:25
[7, 8] Bundle.entry[0].resource/*Patient/p1*/: Error - Patient.gender: bad code (codes = x#1)
[9, 8] Bundle.entry[1].resource/*Encounter/e1*/: Warning - should have a performer
[9, 8] Bundle.entry[1]: Error - no profile match for Encounter/e1 among choices
----------------------------------------------------------------
bundles/b.json 03:38:26
[9, 2] Bundle.entry[1]: Information - draft CodeSystem http://x/CodeSystem/observation-category
"""


@pytest.fixture
def bundles(tmp_path, monkeypatch):
    for name in ["a.json", "b.json", "a.key.json"]:
        (tmp_path / name).write_text("{}")
    monkeypatch.setattr(validate, "jar", lambda: Path("validator.jar"))
    return tmp_path


def fake(stdout):
    return lambda command, **_: subprocess.CompletedProcess(command, 0, stdout, "")


def test_messages_are_counted_by_level_and_grouped_by_kind(bundles, monkeypatch):
    monkeypatch.setattr(subprocess, "run", fake(OUTPUT))
    report = validate.run(bundles)
    assert (report["bundles"], report["errors"], report["warnings"]) == (2, 2, 1)
    assert report["information"] == 1
    assert report["messages"]["Error: Patient.gender: bad code"] == 1
    # Ids are taken out of a message so the same problem counts as one kind,
    # but a code system's address is left alone.
    assert "Error: no profile match for Encounter/<id> among choices" in report["messages"]
    assert any(kind.endswith("CodeSystem/observation-category") for kind in report["messages"])


def test_the_report_names_the_bundles_that_had_errors(bundles, monkeypatch):
    monkeypatch.setattr(subprocess, "run", fake(OUTPUT))
    assert validate.run(bundles)["bundles_with_errors"] == ["a"]


def test_answer_keys_are_not_sent_to_the_validator(bundles, monkeypatch):
    seen = []
    monkeypatch.setattr(subprocess, "run", lambda c, **_: seen.append(c) or fake(OUTPUT)(c))
    validate.run(bundles)
    assert [Path(p).name for p in seen[0] if p.endswith(".json")] == ["a.json", "b.json"]


def test_a_run_that_did_not_finish_is_an_error_not_a_result(bundles, monkeypatch):
    monkeypatch.setattr(subprocess, "run", fake("Loading\n  Validate a.json\nOutOfMemoryError\n"))
    with pytest.raises(ValueError, match="did not finish"):
        validate.run(bundles)


def test_a_jar_with_the_wrong_checksum_is_refused(tmp_path, monkeypatch):
    jar = tmp_path / "validator_cli.jar"
    jar.write_bytes(b"not the validator")
    monkeypatch.setattr(validate, "JAR", jar)
    with pytest.raises(ValueError, match="is not validator 7.0.5"):
        validate.jar()
