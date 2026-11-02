from pathlib import Path
import urllib.request,json
D=Path(r'C:/Users/22697/.codex/visualizations/2026/10/18/01a14dac-a388-7572-a32b-ceefa8495d67')
urls={'UVR_MDXNET_KARA_2.onnx':'https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR_MDXNET_KARA_2.onnx'}
for name,url in urls.items():
 p=D/name
 if not p.exists():
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=90) as response:p.write_bytes(response.read())
 print(name,p.stat().st_size,flush=True)

