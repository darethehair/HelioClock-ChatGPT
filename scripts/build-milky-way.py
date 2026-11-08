#!/usr/bin/env python3
"""Convert the D3-Celestial/Jose R. Vieira Milky Way outline catalogue to
small J2000 RA/Dec contour arrays for the offline HelioClock PWA.

Source: https://github.com/ofrohn/d3-celestial (BSD license)
Data: Jose R. Vieira, Milky Way Outline Catalog, five brightness levels.
GeoJSON celestial longitude is already RA expressed as signed degrees.
"""
import json,sys
from pathlib import Path
src,dest=map(Path,sys.argv[1:3])
data=json.loads(src.read_text())
result=[]
for feature in data["features"]:
    polygons=feature["geometry"]["coordinates"]
    rings=[]
    for polygon in polygons:
        for ring in polygon:
            if len(ring)<3:continue
            # Keep sufficient detail without shipping 500KB of points; at most
            # 1° typical catalogue sampling is enough for screen-space lines.
            step=max(1,len(ring)//700)
            reduced=ring[::step]
            if reduced[-1]!=ring[-1]:reduced.append(ring[-1])
            rings.append([[round(float(p[0])%360,3),round(float(p[1]),3)]
                          for p in reduced])
    result.append({"id":feature.get("id",""),"rings":rings})
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(result,separators=(",",":")))
print("Milky Way contours:",len(result),"levels;",dest.stat().st_size,"bytes")
