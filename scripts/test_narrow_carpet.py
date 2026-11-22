from PIL import Image
import numpy as np

# Load original amitabha_stage_backup or amitabha_stage
orig = Image.open('public/assets/amitabha_stage.png')
w, h = orig.size
print('Original stage size:', w, h)

# Floor starts around y = 920 in 1672 height (which corresponds to y = 1055 in 1920)
# Dais bottom edge is at y = 938 in 1672 height (y = 1080 in 1920)
y_dais_edge = int(938)

# Let's inspect rows from y_dais_edge to h
# Center of the screen
xc = w / 2.0

# In temple_stage_bg.png or amitabha_stage.png:
# Let's see the marble floor on the left (x: 0 to 180) and right (x: 760 to 941)
# Can we create a narrower carpet runner?
# Width factor kw = 0.55 (55% of current carpet width)

def create_narrow_stage(kw=0.58):
    stage_img = Image.open('public/assets/amitabha_stage.png').convert('RGB')
    stage_arr = np.array(stage_img)
    
    # We only modify y >= y_dais_edge
    floor_section = stage_arr[y_dais_edge:, :, :].copy()
    fh, fw, _ = floor_section.shape
    
    new_floor = np.zeros_like(floor_section)
    
    # For each row y in floor_section:
    for y in range(fh):
        # Progress from 0 (top of floor at dais) to 1 (bottom of screen)
        prog = y / float(fh)
        
        # Original carpet roughly spans from [x_left_orig, x_right_orig]
        # At top: width ~ 430px (from ~255 to ~685)
        # At bottom: width ~ 920px (from ~10 to ~930)
        orig_half_w = (215.0 + prog * 245.0)
        
        # Narrow carpet half width:
        narrow_half_w = orig_half_w * kw
        
        # In new_floor:
        # Between [xc - narrow_half_w, xc + narrow_half_w], we place the squeezed carpet
        # Left of (xc - narrow_half_w): marble floor
        # Right of (xc + narrow_half_w): marble floor
        
        # 1. Fill carpet
        for x in range(fw):
            dx = x - xc
            if abs(dx) <= narrow_half_w:
                # Sample from original carpet
                orig_x = int(round(xc + dx / kw))
                orig_x = max(0, min(fw - 1, orig_x))
                new_floor[y, x] = floor_section[y, orig_x]
            elif dx < -narrow_half_w:
                # Left marble floor:
                # In original, left marble is from 0 to (xc - orig_half_w)
                # In new, left marble is from 0 to (xc - narrow_half_w)
                # Map linearly:
                orig_marble_w = xc - orig_half_w
                new_marble_w = xc - narrow_half_w
                if new_marble_w > 0:
                    orig_x = int(round(x * (orig_marble_w / new_marble_w)))
                    orig_x = max(0, min(fw - 1, orig_x))
                    new_floor[y, x] = floor_section[y, orig_x]
                else:
                    new_floor[y, x] = floor_section[y, 0]
            else:
                # Right marble floor:
                # In original, right marble is from (xc + orig_half_w) to fw
                # In new, right marble is from (xc + narrow_half_w) to fw
                orig_marble_w = fw - (xc + orig_half_w)
                new_marble_w = fw - (xc + narrow_half_w)
                if new_marble_w > 0:
                    dist_from_right = fw - 1 - x
                    orig_dist = dist_from_right * (orig_marble_w / new_marble_w)
                    orig_x = int(round(fw - 1 - orig_dist))
                    orig_x = max(0, min(fw - 1, orig_x))
                    new_floor[y, x] = floor_section[y, orig_x]
                else:
                    new_floor[y, x] = floor_section[y, fw - 1]

    # Combine top + new floor
    result_arr = stage_arr.copy()
    result_arr[y_dais_edge:, :, :] = new_floor
    return Image.fromarray(result_arr)

# Test kw = 0.55, 0.60, 0.65
for kw in [0.52, 0.60]:
    res = create_narrow_stage(kw)
    crop_preview = res.crop((0, y_dais_edge, w, h))
    crop_preview.save(f'C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/test_carpet_kw_{int(kw*100)}.png')
    print(f'Saved test_carpet_kw_{int(kw*100)}.png')
