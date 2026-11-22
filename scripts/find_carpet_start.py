from PIL import Image
import numpy as np

img = Image.open('public/assets/temple_stage_bg.png')
w, h = img.size
arr = np.array(img.convert('RGB'))

# Find the first row y where red carpet appears in center (x between 350 and 600)
for y in range(0, h, 10):
    center_redness = arr[y, 450:490, 0].astype(int) - ((arr[y, 450:490, 1].astype(int) + arr[y, 450:490, 2].astype(int)) / 2)
    mean_red = np.mean(center_redness)
    if mean_red > 30:
        print(f"Red carpet first appears around y = {y} (mean_redness = {mean_red:.1f})")
        break

# Let's inspect rows around that y
for y_check in range(y - 20, y + 40, 5):
    center_redness = arr[y_check, 450:490, 0].astype(int) - ((arr[y_check, 450:490, 1].astype(int) + arr[y_check, 450:490, 2].astype(int)) / 2)
    print(f"y={y_check}: mean redness={np.mean(center_redness):.1f}")
