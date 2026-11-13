import json

import pandas as pd
import pytest

from nora import split


def table(n_patients=400, per_patient=3):
    rows = [
        {"patient_id": str(p), "admission_id": f"{p}-{a}", "age": 60.0 + a}
        for p in range(n_patients)
        for a in range(per_patient)
    ]
    return pd.DataFrame(rows)


@pytest.fixture
def protocol(tmp_path):
    path = tmp_path / "PROTOCOL.md"
    path.write_text("the protocol\n")
    return path


def test_a_patient_is_never_on_both_sides():
    train, test = split.split(table())
    assert not set(train["patient_id"]) & set(test["patient_id"])
    assert len(train) + len(test) == 1200


def test_about_a_fifth_of_patients_are_held_out():
    _, test = split.split(table(n_patients=5000, per_patient=1))
    assert 0.18 < len(test) / 5000 < 0.22


def test_membership_depends_only_on_the_patient_id():
    # Adding patients, or reordering rows, must not move anyone.
    small, large = table(n_patients=50), table(n_patients=400).sample(frac=1, random_state=3)
    in_small = set(split.split(small)[1]["patient_id"])
    in_large = set(split.split(large)[1]["patient_id"])
    assert in_small == {p for p in in_large if int(p) < 50}


def test_digest_ignores_row_order_and_float_noise_but_not_values():
    df = table()
    assert split.digest(df) == split.digest(df.sample(frac=1, random_state=1))
    assert split.digest(df) == split.digest(df.assign(age=df["age"] + 1e-12))
    assert split.digest(df) != split.digest(df.assign(age=df["age"] + 1))


def test_verify_passes_on_the_locked_table(tmp_path, protocol):
    lock_path = tmp_path / "protocol" / "lock.json"
    entry = split.lock(table(), "toy", lock_path, protocol)
    assert entry["rows"] == 1200
    assert json.loads(lock_path.read_text())["toy"] == entry
    split.verify(table(), "toy", lock_path, protocol)


def test_verify_names_what_changed(tmp_path, protocol):
    lock_path = tmp_path / "lock.json"
    split.lock(table(), "toy", lock_path, protocol)
    with pytest.raises(ValueError, match="rows, table_sha256"):
        split.verify(table(n_patients=401), "toy", lock_path, protocol)
    protocol.write_text("the protocol, edited after the fact\n")
    with pytest.raises(ValueError, match="protocol_sha256 changed"):
        split.verify(table(), "toy", lock_path, protocol)


def test_a_lock_is_never_rewritten(tmp_path, protocol):
    lock_path = tmp_path / "lock.json"
    split.lock(table(), "toy", lock_path, protocol)
    with pytest.raises(ValueError, match="already locked"):
        split.lock(table(n_patients=10), "toy", lock_path, protocol)


def test_verify_refuses_a_dataset_that_was_never_locked(tmp_path, protocol):
    with pytest.raises(ValueError, match="not locked"):
        split.verify(table(), "toy", tmp_path / "lock.json", protocol)
