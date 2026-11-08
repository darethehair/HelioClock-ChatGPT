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
    polygons_out=[]
    for polygon in polygons:
        # Preserve individual MultiPolygon components and their hole rings.
        # Flattening rings destroys the topology required for seam clipping.
        rings=[]
        for ring in polygon:
            if len(ring)<3:continue
            step=max(1,len(ring)//700)
            reduced=ring[::step]
            if reduced[-1]!=ring[-1]:reduced.append(ring[-1])
            coords=[[round(float(p[0])%360,3),round(float(p[1]),3)]
                    for p in reduced]
            if coords[0]!=coords[-1]:coords.append(coords[0])
            rings.append(coords)
        if rings:polygons_out.append(rings)
    result.append({"id":feature.get("id",""),"polygons":polygons_out})
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(result,separators=(",",":")))
print("Milky Way contours:",len(result),"levels;",dest.stat().st_size,"bytes")
