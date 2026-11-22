from PIL import Image
import numpy as np

img = Image.open('public/assets/amitabha_stage.png')
print('Image size:', img.size)

# Convert to RGB numpy array
arr = np.array(img.convert('RGB'))

# Inspect rows at y = 1250, 1400, 1600, 1800
for y in [1250, 1350, 1450, 1600, 1800]:
    row = arr[y, :, :]
    # Red carpet has high R, low G, low B compared to marble floor
    # Let's check R - (G + B)/2
    redness = row[:, 0].astype(int) - ((row[:, 1].astype(int) + row[:, 2].astype(int)) / 2)
    # Carpet indices where redness > 30
    carpet_cols = np.where(redness > 35)[0]
    if len(carpet_cols) > 0:
        min_x, max_x = carpet_cols[0], carpet_cols[-1]
        width = max_x - min_x
        print(f"y={y}: carpet from x={min_x} to x={max_x} (width={width}px, center={(min_x+max_x)//2})")
    else:
        print(f"y={y}: no clear carpet detected")
