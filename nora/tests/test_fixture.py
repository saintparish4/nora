from nora import fixture, schema


def test_the_same_seed_gives_the_same_table():
    assert fixture.sample(200, seed=7).equals(fixture.sample(200, seed=7))
    assert not fixture.sample(200, seed=7).equals(fixture.sample(200, seed=8))


def test_the_table_passes_the_schema_and_has_missing_values_to_handle():
    df = fixture.sample(2000, seed=1)
    assert list(df.columns) == schema.COLUMNS
    assert 0.02 < df["hemoglobin"].isna().mean() < 0.08
    assert df.loc[df["died_in_hospital"] == 1, "readmit_30d"].isna().all()


def test_readmission_depends_on_the_features_it_was_built_from():
    df = fixture.sample(8000, seed=1)
    by_group = df.groupby("dx_group")["readmit_30d"].mean()
    assert by_group["heart_failure"] > by_group["ischemic"] + 0.05
    assert df.groupby("ckd")["readmit_30d"].mean()[1] > df.groupby("ckd")["readmit_30d"].mean()[0]
