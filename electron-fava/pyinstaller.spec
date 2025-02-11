# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

hidden_imports = [
    'cheroot',
    'fava.cli',
    'fava.ext.auto_commit',
    'fava.ext.portfolio_list',
    'fava.ext.fava_ext_test',
    'fava.plugins',
    'fava.plugins.link_documents',
    'fava.plugins.tag_discovered_documents',
    'beancount.plugins',
    'beancount.ops.balance',
    'beancount.ops.basicops',
    'beancount.ops.compress',
    'beancount.ops.documents',
    'beancount.ops.find_prices',
    'beancount.ops.lifetimes',
    'beancount.ops.pad',
    'beancount.parser.context',
    'beancount.parser.version',
]

a = Analysis(
    ['fava_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('example.beancount', '.'),
        ('venv/lib/python3.9/site-packages/fava', 'fava'),
        ('venv/lib/python3.9/site-packages/beancount', 'beancount'),
        ('venv/lib/python3.9/site-packages/fava/static', 'fava/static'),
        ('venv/lib/python3.9/site-packages/fava/templates', 'fava/templates'),
        ('venv/lib/python3.9/site-packages/fava/translations', 'fava/translations'),
    ],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='fava',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='fava',
)
