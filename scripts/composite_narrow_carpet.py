from PIL import Image

# 1. Load amitabha_stage_backup (the pristine top with Amitabha statue and dais)
amitabha_top = Image.open('public/assets/amitabha_stage_backup.png')
temple_bg = Image.open('public/assets/temple_stage_bg.png')

w, h = amitabha_top.size
bw, bh = temple_bg.size

# Bottom dais step edge in amitabha_stage_backup is at y = 938
# Floor in temple_stage_bg starts at y = 720 and goes to bh = 1672
y_seam_amitabha = 938
y_seam_temple_bg = 720

# Crop the pristine upper part of amitabha (from y=0 to y_seam_amitabha)
top_part = amitabha_top.crop((0, 0, w, y_seam_amitabha))

# Crop the floor of temple_stage_bg starting at y = y_seam_temple_bg
floor_part = temple_bg.crop((0, y_seam_temple_bg, bw, bh))

# Resize floor_part to exactly match the remaining height (h - y_seam_amitabha)
target_floor_h = h - y_seam_amitabha
floor_part_resized = floor_part.resize((w, target_floor_h), Image.Resampling.LANCZOS)

# Create the composited image
new_stage = Image.new('RGB', (w, h))
new_stage.paste(top_part, (0, 0))
new_stage.paste(floor_part_resized, (0, y_seam_amitabha))

new_stage.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/new_narrow_carpet_stage.png')
print('Successfully created new_narrow_carpet_stage.png')

# Also crop the seam area y: 850 to 1250 to inspect the transition
seam_crop = new_stage.crop((0, 850, w, 1250))
seam_crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/seam_narrow_carpet_crop.png')

# Also crop the lower half y: 900 to 1672 to inspect the carpet and spacious marble floor
floor_crop = new_stage.crop((0, 900, w, h))
floor_crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/floor_narrow_carpet_crop.png')
