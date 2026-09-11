# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules
hiddenimports = collect_submodules('uvicorn') + collect_submodules('desktop_agent') + [
 'fastapi','starlette','pydantic','playwright','playwright.async_api','psutil','pytesseract','PIL','send2trash','pynvml'
]
a=Analysis(['run_agent.py'],pathex=[],binaries=[],datas=[],hiddenimports=hiddenimports,hookspath=[],hooksconfig={},runtime_hooks=[],excludes=['tkinter','matplotlib','numpy','pandas','scipy','torch','PyQt5','PyQt6'],noarchive=False)
pyz=PYZ(a.pure)
exe=EXE(pyz,a.scripts,[],exclude_binaries=True,name='vaani-agent',debug=False,bootloader_ignore_signals=False,strip=False,upx=False,console=False)
coll=COLLECT(exe,a.binaries,a.datas,strip=False,upx=False,name='vaani-agent')
