"""Synthetic heart disease admissions, scored against real data.

The package is a pipeline of small modules, each with one job: `codes` and
`schema` define what an admission is, `mimic` maps real data into that
shape, `split` locks the test set, and `score` judges a synthetic table
against the real one. PROTOCOL.md is the contract all of them implement.
"""
