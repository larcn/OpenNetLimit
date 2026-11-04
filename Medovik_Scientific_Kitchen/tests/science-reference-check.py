#!/usr/bin/env python3
"""Independent physical identities; does not copy the JS model implementation."""
from math import isclose, pi

def retained_mass(raw, water_evaporated, other_evaporated=0):
    if min(raw, water_evaporated, other_evaporated) < 0 or water_evaporated+other_evaporated > raw:
        raise ValueError('impossible mass budget')
    return raw-water_evaporated-other_evaporated

assert isclose(retained_mass(100,0),100)
assert isclose(retained_mass(200,80),120)
assert isclose(100-80-0-20,0)
assert isclose((26/20)**2*(9/8),1.90125)
# area in cm², 1 layer, density in g/cm³ -> thickness cm -> mm
assert isclose((100/(1*100))*10,10)
assert isclose((pi*13**2)/(pi*10**2),1.69)
print('PASS: independent mass accounting and geometry identities (not oven validation)')
