"""Audit portrait geometry against preserved originals; reconstruct distorted crops uniformly."""
from pathlib import Path
import cv2,numpy as np,json,sys
from PIL import Image,ImageOps,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'image/character';sift=cv2.SIFT_create(nfeatures=5000)
cache={};rows=[]
for p in sorted((base/'portraits').glob('*.png')):
 key=p.stem.split('-')[0]
 candidates=list((base/'originals').glob(key+'.*'))
 candidates=[q for q in candidates if q.suffix.lower() in ['.png','.jpg','.avif','.webp']]
 if not candidates:candidates=[q for q in base.glob(key+'.*') if q.suffix.lower() in ['.png','.jpg','.avif','.webp']]
 if not candidates:
  aliases={'ayaka':'originals/ayaka-2021.png','mokuai':'originals/mokuai-ceshi.jpg','zibai':'originals/zibai-2026.avif','yaemiko':'yaemiko-original.jpg','xianyun':'闲云2026.png','mualani':'mualani-portrait.png'}
  if key in aliases:candidates=[base/aliases[key]]
 if not candidates:rows.append(dict(path=p.name,status='no matching original'));continue
 source=candidates[0]
 if source not in cache:
  im=Image.open(source).convert('RGB');scale=min(1,1800/max(im.size));gray=cv2.cvtColor(np.array(im.resize((round(im.width*scale),round(im.height*scale)))) ,cv2.COLOR_RGB2GRAY)
  kp,desc=sift.detectAndCompute(gray,None);cache[source]=(im,scale,kp,desc)
 im,scale,kp,desc=cache[source]
 target=Image.open(p).convert('RGB');kp2,desc2=sift.detectAndCompute(np.array(target),None)
 if desc is None or desc2 is None:continue
 matches=cv2.BFMatcher().knnMatch(desc,desc2,k=2);good=[a for a,b in matches if a.distance<.68*b.distance]
 if len(good)<15:rows.append(dict(path=p.name,status='insufficient matches'));continue
 src=np.float32([kp[m.queryIdx].pt for m in good]);dst=np.float32([kp2[m.trainIdx].pt for m in good]);M,inliers=cv2.estimateAffine2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=1.8)
 if M is None or inliers.sum()<15:continue
 sx,sy=np.linalg.norm(M[:,0]),np.linalg.norm(M[:,1]);ratio=float(sx/sy)
 row=dict(path=p.name,source=str(source.relative_to(ROOT)),ratio=ratio,inliers=int(inliers.sum()),status='ok')
 if abs(ratio-1)>.025 and abs(M[0,1])/sx<.02 and abs(M[1,0])/sy<.02:
  inv=cv2.invertAffineTransform(M);corners=cv2.transform(np.float32([[[0,0],[target.width,target.height]]]),inv)[0]/scale
  box=[float(corners[0,0]),float(corners[0,1]),float(corners[1,0]),float(corners[1,1])]
  # Keep the original field of view and fix the output aspect, never distort pixels.
  crop=im.crop(tuple(round(x) for x in box));width=target.width;height=round(width*crop.height/crop.width)
  if '--repair' in sys.argv:crop.resize((width,height),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.35)).save(p)
  row.update(status='reconstructed' if '--repair' in sys.argv else 'distortion detected',box=box,size=[width,height])
 rows.append(row)
 print(p.name,row['status'],round(ratio,4),flush=True)
(ROOT/'docs/portrait-geometry-audit.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
