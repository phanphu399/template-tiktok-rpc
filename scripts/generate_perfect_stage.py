from PIL import Image
import numpy as np

# Load amitabha_stage_backup and temple_stage_bg
am = Image.open('public/assets/amitabha_stage_backup.png' if Image.open('public/assets/amitabha_stage.png') else 'public/assets/amitabha_stage.png')
# Use amitabha_stage_backup for clean top dais
try:
    am = Image.open('public/assets/amitabha_stage_backup.png')
except:
    am = Image.open('public/assets/amitabha_stage.png')

bg = Image.open('public/assets/temple_stage_bg.png')

w, h = am.size
bw, bh = bg.size

y_am = 1038
y_bg = 904

top_part = am.crop((0, 0, w, y_am))
floor_part = bg.crop((0, y_bg, bw, bh))

target_h = h - y_am
floor_resized = floor_part.resize((w, target_h), Image.Resampling.LANCZOS)

# Now, in floor_resized:
# Let's inspect the carpet width at each row and slightly compress the carpet horizontally 
# towards the bottom to make it an elegant slender runner that leaves MAXIMUM spacious marble floor!
arr = np.array(floor_resized)
fh, fw, _ = arr.shape
xc = fw / 2.0

new_arr = arr.copy()

for y in range(fh):
    prog = y / float(fh)
    # At top (prog=0), scale factor = 1.0 (already narrow at 220px)
    # At bottom (prog=1), scale factor = 0.78 (compress bottom width from ~570px down to ~440px)
    scale_x = 1.0 - prog * 0.22
    
    # Original carpet roughly spans [xc - half_w, xc + half_w]
    orig_half_w = (110.0 + prog * 175.0)
    narrow_half_w = orig_half_w * scale_x
    
    # Reconstruct row:
    row = arr[y]
    new_row = new_arr[y]
    
    for x in range(fw):
        dx = x - xc
        if abs(dx) <= narrow_half_w:
            # Inside carpet
            src_x = int(round(xc + dx / scale_x))
            src_x = max(0, min(fw - 1, src_x))
            new_row[x] = row[src_x]
        elif dx < -narrow_half_w:
            # Left marble
            orig_marble_w = xc - orig_half_w
            new_marble_w = xc - narrow_half_w
            # Sample from the left marble
            t = (xc - abs(dx)) / new_marble_w # 0 at edge of carpet, 1 at x=0
            src_x = int(round(xc - orig_half_w - (1.0 - t) * 0 - (t * orig_marble_w)))
            src_x = max(0, min(int(xc - orig_half_w), int(round(x * (orig_marble_w / new_marble_w)))))
            new_row[x] = row[src_x]
        else:
            # Right marble
            orig_marble_w = fw - (xc + orig_half_w)
            new_marble_w = fw - (xc + narrow_half_w)
            dist = x - (xc + narrow_half_w)
            src_dist = dist * (orig_marble_w / new_marble_w)
            src_x = int(round(xc + orig_half_w + src_dist))
            src_x = max(int(xc + orig_half_w), min(fw - 1, src_x))
            new_row[x] = row[src_x]

new_floor_img = Image.fromarray(new_arr)

final_stage = Image.new('RGB', (w, h))
final_stage.paste(top_part, (0, 0))
final_stage.paste(new_floor_img, (0, y_am))

final_stage.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/perfect_narrow_stage.png')

# Save crop of lower half
crop = final_stage.crop((0, 950, w, h))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/perfect_narrow_floor_crop.png')
print('Generated perfect_narrow_floor_crop.png')
