#!/usr/bin/env python3
"""Refresh the color preset snapshot from a local WeKan source checkout."""
import argparse
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('wekan', type=Path)
args = parser.parse_args()
constants = (args.wekan / 'config/const.js').read_text()
card_css = (args.wekan / 'client/components/cards/cardDetails.css').read_text()
board_css = (args.wekan / 'client/components/boards/boardColors.css').read_text()


def names(key):
    return re.findall("'([^']+)'", re.search(
        r'export const ' + key + r' = \[(.*?)\];', constants, re.S)[1])


def hex_color(value):
    value = value.lower()
    if len(value) == 4:
        value = '#' + ''.join(c * 2 for c in value[1:])
    if not re.fullmatch('#[0-9a-f]{6}', value):
        raise ValueError(value)
    return value


items, boards = [], []
for name in names('ALLOWED_COLORS'):
    match = re.search(r'\.card-details-' + name +
                      r'\s*\{[^}]*background:\s*(#[0-9a-fA-F]+)', card_css)
    if not match:
        raise ValueError('Missing card color: ' + name)
    items.append({'name': name, 'hex': hex_color(match[1])})
for name in names('ALLOWED_BOARD_COLORS'):
    # Weba currently stores solid colors. For gradient/special themes, offer
    # the first solid stop from WeKan's swatch, without claiming full themes.
    match = re.search(r'\.board-color-' + name +
                      r'\s*\{[^}]*--board-theme-accent:\s*(#[0-9a-fA-F]+)', board_css)
    if not match:
        match = re.search(r'\.board-color-' + name +
                          r'\.background-box[^{}]*\{[^}]*?background(?:-color)?:[^;}]*?(#[0-9a-fA-F]+)', board_css)
    if not match:
        raise ValueError('Missing board color: ' + name)
    boards.append({'name': name, 'hex': hex_color(match[1])})
output = Path(__file__).resolve().parent.parent / 'WeKan/.public/color-presets.json'
output.write_text(json.dumps({
    'source': 'wekan/wekan config/const.js and client/components/{cards/cardDetails,boards/boardColors}.css',
    'items': items, 'boards': boards,
}, indent=2) + '\n')
print(f'Imported {len(items)} item colors and {len(boards)} board color samples')
