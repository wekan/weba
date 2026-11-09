#!/usr/bin/env python3
"""Import only texts used by weba; preserve WeKan translations verbatim."""
import argparse
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('wekan', type=Path, help='WeKan source checkout')
args = parser.parse_args()
source = args.wekan / 'imports/i18n'
english = json.loads((source / 'data/en.i18n.json').read_text())
# Explicit equivalents where weba and WeKan use different English captions.
aliases = {
    'Collapse': 'collapse', 'Uncollapse': 'uncollapse',
    'Workspaces': 'allboards.workspaces', 'Add Workspace': 'allboards.add-workspace',
    'Workspace name': 'allboards.add-workspace-prompt',
    'Workspace icon (markdown)': 'allboards.edit-workspace-icon',
    'Add Subworkspace': 'allboards.add-subworkspace', 'Edit workspace': 'allboards.edit-workspace',
    'Are you sure you want to delete this workspace?': 'allboards.delete-workspace-confirm',
    'Confirm workspace deletion': 'allboards.delete-workspace-confirm-check',
    'Board administrator': 'board-admin', 'Save member': 'save',
    'Role': 'roles-status-role',
    'Normal (assigned cards only)': 'normal-assigned-only',
    'Comment (assigned cards only)': 'comment-assigned-only',
    'Read (assigned cards only)': 'read-assigned-only',
    'Repeat password': 'password-again', 'Create account': 'create-account',
    'Back to login': 'login', 'Archive': 'archived-items', 'Remaining': 'allboards.remaining',
    'Table': 'board-view-table', 'Admin panel': 'admin-panel', 'Admin Panel': 'admin-panel',
    '＋ Add Board': 'add-board', 'My cards': 'my-cards', 'Logout': 'log-out',
    'New card': 'add-card', 'Archive board': 'archive-board',
    'Todo': 'scrum-category-todo', 'Doing': 'scrum-category-doing', 'Done': 'done',
    'Save card': 'save', 'Save profile': 'save',
    'Enforce minimum password length': 'password-min-length-enforce',
    'Save password length settings': 'save',
    'Password length settings saved': 'password-length-saved',
    'Passwords do not match': 'password-mismatch',
    'Mon': 'monday', 'Tue': 'tuesday', 'Wed': 'wednesday', 'Thu': 'thursday',
    'Fri': 'friday', 'Sat': 'saturday', 'Sun': 'sunday',
}
texts = {'Board administrator', 'Normal', 'Normal (assigned cards only)',
         'No comments', 'Comment only', 'Comment (assigned cards only)',
         'Worker', 'Read only', 'Read (assigned cards only)', 'Language', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'}
controls = set()
for path in (root / 'WeKan/.src').glob('*.webform'):
    current = ''
    for line in path.read_text().splitlines():
        match = re.search(r'\{ (\w+) (\w+)', line)
        if match:
            current = match[1]
        match = re.search(r'(?:Text|Tooltip) = \("([^"]+)"\)', line)
        if match:
            texts.add(match[1])
            controls.add(current)
for path in (root / 'WeKan/.src').glob('*.class'):
    texts.update(re.findall(r'\.(?:Text|Tooltip) = "([^"]+)"', path.read_text()))
report = (root / 'WeKan/.public/kanban.js').read_text()
texts.update(re.findall(r"add\([^,]+,\s*'[^']+',\s*'([^']+)'", report))
texts.update(['Todo', 'Doing', 'Done', 'Card', 'Status', 'Swimlane', 'Due date',
              'No due date', 'Previous month', 'Next month', 'Default', 'All cards',
              'Add card', 'Add list', 'Add swimlane', 'Collapse', 'Uncollapse', 'Close', 'Save', 'Cards',
              'Move card', 'Move list', 'Move swimlane',
              'Are you sure you want to archive this board?',
              'Move this list and all its cards to the other swimlane?'])
lookup = {}
for text in sorted(texts):
    key = aliases.get(text)
    if key not in english:
        key = next((k for k,v in english.items() if v.casefold() == text.casefold()), None)
    if key:
        lookup[text] = key
# Never translate identities, user content, stored status values or editor inputs.
controls -= {'AccountToggle', 'PageTitle', 'PaneTitle', 'Status', 'Boards', 'WebLabelVersion', 'ContextTitle', 'ActionTitle', 'DetailsTitle'}
controls.add('MemberRole')
metadata = []
for line in (source / 'languages.js').read_text().splitlines():
    match = re.match(r'\s*(\[".*\]),?\s*$', line)
    if match:
        code, _, tag, name, rtl = json.loads(match[1])
        if (source / 'data' / (tag + '.i18n.json')).is_file():
            metadata.append({'code':tag, 'name':name, 'rtl':rtl})
metadata = list({m['code']:m for m in metadata}.values())
output = root / 'WeKan/.public/i18n'
output.mkdir(exist_ok=True)
keys = sorted(set(lookup.values()))
for language in metadata:
    data = json.loads((source / 'data' / (language['code'] + '.i18n.json')).read_text())
    subset = {key:data[key] for key in keys if data.get(key)}
    (output / (language['code'] + '.json')).write_text(json.dumps(subset, ensure_ascii=False, indent=2)+'\n')
config = {'languages':metadata, 'lookup':lookup, 'controls':sorted(controls),
          'english':{key:english[key] for key in keys}}
(root / 'WeKan/.public/i18n-catalog.js').write_text('window.webaI18nCatalog = '+json.dumps(config, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')+';\n')
manifest = {'source':'wekan/wekan imports/i18n', 'englishSha256':hashlib.sha256((source/'data/en.i18n.json').read_bytes()).hexdigest(),
            'languages':len(metadata), 'keys':len(keys), 'unmapped':sorted(t for t in texts if t not in lookup and re.fullmatch('[A-Za-z][A-Za-z /.-]+',t))}
(output/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print(f'Imported {len(keys)} keys for {len(metadata)} languages')
