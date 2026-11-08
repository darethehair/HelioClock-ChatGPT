#!/usr/bin/env python3
"""Convert BSD-licensed D3-Celestial J2000 Hipparcos catalogue to compact offline data.
Usage: python3 scripts/build-sky-data.py RAW_DIR DIST_DIR
Source: https://github.com/ofrohn/d3-celestial/tree/master/data\nD3-Celestial longitude is already RA in degrees, wrapped to [-180,180].
"""
import json, pathlib, sys
raw=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2])
stars=json.loads((raw/'stars.8.json').read_text())
lines=json.loads((raw/'constellations.lines.json').read_text())
records=[]
for f in stars['features']:
 p=f.get('properties',{})
 try:
  mag=float(p['mag'])
  lon,dec=f['geometry']['coordinates'][:2]
  ra=float(lon)%360
  dec=float(dec)
  if mag>7 or not(-90<=dec<=90):continue
  records.append([round(ra,5),round(dec,5),round(mag,2),round(float(p['bv']),2) if p.get('bv') is not None else None])
 except (ValueError,TypeError,KeyError):continue
segments=[]
for f in lines['features']:
 for part in f['geometry']['coordinates']:
  if len(part)<2:continue
  transformed=[]
  for lon,dec in part:
   transformed.append([round(float(lon)%360,5),round(float(dec),5)])
  segments.append(transformed)
assert len(records)>5000, 'Star atlas unexpectedly small: '+str(len(records))
assert len(segments)>50, 'Constellation lines missing'
out.mkdir(parents=True,exist_ok=True)
(out/'sky-stars.json').write_text(json.dumps(records,separators=(',',':')))
(out/'sky-constellations.json').write_text(json.dumps(segments,separators=(',',':')))
print('Offline sky catalogue:',len(records),'stars down to mag 7,',len(segments),'constellation polylines')
