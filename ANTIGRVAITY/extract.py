import os
import re
import base64

filepath = '/Users/lucasmoitinho/Downloads/ANTIGRVAITY/esquina-digital 2.html'
assets_dir = '/Users/lucasmoitinho/Downloads/ANTIGRVAITY/assets'

os.makedirs(assets_dir, exist_ok=True)

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'data:image\/png;base64,([^"]+)'
matches = re.findall(pattern, content)

for i, match in enumerate(matches):
    img_data = base64.b64decode(match)
    if i == 0:
        filename = 'logo.png'
    elif i == 1:
        filename = 'leader-photo.png'
    else:
        continue
    
    outpath = os.path.join(assets_dir, filename)
    with open(outpath, 'wb') as out_f:
        out_f.write(img_data)
    print(f"Saved {outpath}")
