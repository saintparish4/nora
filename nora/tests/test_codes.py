import pytest

from nora import codes


@pytest.mark.parametrize(
    ("code", "version"),
    [
        ("I5023", 10),
        ("I214", 10),
        ("I480", 10),
        ("I110", 10),
        ("I050", 10),
        ("I2699", 10),
        ("4280", 9),
        ("41401", 9),
        ("42731", 9),
        ("3962", 9),
        ("40291", 9),
    ],
)
def test_codes_inside_the_nchs_definition_are_heart_disease(code, version):
    assert codes.is_heart_disease(code, version)


@pytest.mark.parametrize(
    ("code", "version"),
    [
        ("I10", 10),
        ("I129", 10),
        ("I6350", 10),
        ("I739", 10),
        ("E119", 10),
        ("J449", 10),
        ("4019", 9),
        ("4359", 9),
        ("25000", 9),
        ("V4581", 9),
        ("E8490", 9),
    ],
)
def test_codes_outside_the_nchs_definition_are_not(code, version):
    # I10 and I12 (hypertension without heart involvement) and I60-I69
    # (stroke) are circulatory but are not "diseases of heart".
    assert not codes.is_heart_disease(code, version)


@pytest.mark.parametrize(
    ("code", "version", "group"),
    [
        ("I5023", 10, "heart_failure"),
        ("I110", 10, "heart_failure"),
        ("I132", 10, "heart_failure"),
        ("I119", 10, "other"),
        ("I2510", 10, "ischemic"),
        ("I214", 10, "ischemic"),
        ("I480", 10, "arrhythmia"),
        ("I442", 10, "arrhythmia"),
        ("I350", 10, "other"),
        ("4280", 9, "heart_failure"),
        ("40491", 9, "heart_failure"),
        ("40290", 9, "other"),
        ("41071", 9, "ischemic"),
        ("42731", 9, "arrhythmia"),
        ("4241", 9, "other"),
    ],
)
def test_dx_group_puts_each_code_in_one_group(code, version, group):
    assert codes.dx_group(code, version) == group


def test_dx_group_refuses_a_code_outside_the_cohort():
    with pytest.raises(ValueError, match="not a heart disease code"):
        codes.dx_group("E119", 10)


def test_comorbidities_match_on_prefix_in_the_right_revision():
    assert codes.has_comorbidity("diabetes", "E1165", 10)
    assert codes.has_comorbidity("diabetes", "25000", 9)
    assert codes.has_comorbidity("afib", "42731", 9)
    assert not codes.has_comorbidity("afib", "4270", 9)
    # "585" is chronic kidney disease in ICD-9 only.
    assert codes.has_comorbidity("ckd", "5859", 9)
    assert not codes.has_comorbidity("ckd", "5859", 10)
