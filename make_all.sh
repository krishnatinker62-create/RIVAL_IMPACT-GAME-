#!/bin/sh
# Rebuilds models/{madhav,hanuman,narsimha,arjun,rani,xiyou,sumo,danceking,hao,rika,kazura,raghav}.glb from the original FBX files.
# usage: sh make_all.sh /folder/with/the/fbx/files      (needs python3 + numpy + scipy)
set -e
python3 convert.py "${1:-.}"     # binary FBX -> numpy
python3 dec.py                   # ~2.5M tris -> ~35k tris each (edit cell sizes: python3 dec.py madhav=0.7)
python3 buildx.py                # skeleton + skin weights + 10 animations -> ../../models/<id>.glb
