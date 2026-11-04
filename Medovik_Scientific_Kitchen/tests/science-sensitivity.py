#!/usr/bin/env python3
"""Sensitivity intervals are conditional scenarios, never confidence intervals."""
from math import pi, isclose
area=pi*10**2*8
baked_thickness_cm=.2
vol=area*baked_thickness_cm
for rho in [0.8,1.0,1.2]:
    mass=vol*rho
    assert isclose(mass,area*.2*rho)
lo,hi=vol*.8,vol*1.2
assert hi>lo>0
print(f'PASS: for model density 0.8..1.2 g/cm³, conditional baked mass {lo:.2f}..{hi:.2f} g; no empirical confidence claimed')
