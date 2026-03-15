import os
import time
from os import walk
from PIL import Image

start = time.time()

f = []
for (dirpath, dirnames, filenames) in walk("static/mods/"):
    f.extend(dirnames)
    break


for mapid in f:
    if mapid == "tb":
        continue

    if mapid == "pak":
        continue

    if not os.path.exists("static/mods/tb/" + mapid):
        os.makedirs("static/mods/tb/" + mapid)
    
    image = Image.open("static/mods/" + mapid + "/0")
    image.thumbnail((450, 300))
    image = image.convert('RGB')
    image.save("static/mods/tb/" + str(mapid) + "/0", "JPEG")
    image.close()

    print("Converted " + mapid)

print("Completed!")
