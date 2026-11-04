#!/usr/bin/env python3
"""Larpcord cat icon generator (Windows ICO and in-app PNG).
The SVG is the editable master; this Pillow renderer avoids Windows SVG dependencies.
SPDX-License-Identifier: GPL-3.0-or-later.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
S = 4
image = Image.new("RGBA", (256 * S, 256 * S), (0, 0, 0, 0))
d = ImageDraw.Draw(image)

def point(x, y):
    return (int(x * S), int(y * S))

def polygon(points, color):
    d.polygon([point(x, y) for x, y in points], fill=color)

def stroke(points, color, width):
    d.line([point(x, y) for x, y in points], fill=color, width=width*S, joint="curve")
    r = width*S//2
    for x, y in (points[0], points[-1]):
        px, py = point(x,y)
        d.ellipse((px-r,py-r,px+r,py+r), fill=color)

d.rounded_rectangle((0,0,256*S-1,256*S-1), radius=52*S, fill="#1d1622")
outline=[(49,110),(57,46),(68,42),(111,72),(145,72),(188,42),(199,46),(207,110),(226,151),(225,178),(209,206),(175,226),(128,233),(81,226),(47,206),(30,178),(30,151)]
inside=[(56,115),(64,56),(109,85),(146,85),(192,56),(199,115),(214,154),(212,176),(199,194),(171,214),(128,222),(85,214),(57,194),(44,176),(42,154)]
polygon(outline, "#f58eaf")
polygon(inside, "#fff2f5")
polygon([(64,69),(92,85),(56,111)], "#ffc1d3")
polygon([(192,69),(164,85),(200,111)], "#ffc1d3")
for x in (109,128,147):
    stroke([(x,83),(x,104)], "#ffacc8", 7)
stroke([(74,135),(99,154),(74,174)], "#2b1c2c", 9)
stroke([(182,135),(157,154),(182,174)], "#2b1c2c", 9)
d.arc((109*S,151*S,129*S,180*S), 0, 184, fill="#2b1c2c", width=8*S)
d.arc((127*S,151*S,147*S,180*S), 356, 180, fill="#2b1c2c", width=8*S)
for points in ([(19,139),(43,147)],[(17,162),(39,164)],[(237,139),(213,147)],[(239,162),(217,164)]):
    stroke(points, "#ffc6d9", 7)
for points in ([(66,188),(79,182)],[(190,188),(177,182)]):
    stroke(points, "#ff9dbf", 7)
(root/"static").mkdir(parents=True, exist_ok=True)
(root/"build").mkdir(parents=True, exist_ok=True)
image.save(root/"static/icon.png")
for path in (root/"build/icon.ico", root/"static/icon.ico"):
    image.save(path, format="ICO", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print("Generated pink cat icon: build/icon.ico, static/icon.png, static/icon.ico")
