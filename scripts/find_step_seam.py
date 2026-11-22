from PIL import Image

# Load original amitabha_stage (which has the beautiful Amitabha statue & upper temple)
amitabha = Image.open('public/assets/amitabha_stage_backup.png' if Image.open('public/assets/amitabha_stage.png') else 'public/assets/amitabha_stage.png')
# Actually let's check amitabha_stage_backup.png
try:
    amitabha = Image.open('public/assets/amitabha_stage_backup.png')
    print('Using amitabha_stage_backup.png')
except:
    amitabha = Image.open('public/assets/amitabha_stage.png')
    print('Using amitabha_stage.png')

temple_bg = Image.open('public/assets/temple_stage_bg.png')
w, h = amitabha.size
bw, bh = temple_bg.size
print(f'Amitabha size: {w}x{h}, Temple BG size: {bw}x{bh}')

# In amitabha, the dais step bottom edge:
# Let's inspect rows around y=900-950 in amitabha
# In temple_bg, the dais step bottom edge:
# Let's inspect rows around y=680-750 in temple_bg

# We want the floor of temple_bg starting from where the floor meets the bottom dais step!
# In temple_bg, let's find the exact y where the wood step meets the marble floor:
# Let's crop from y=700 to y=760 in temple_bg to find the exact seam
crop_bg_step = temple_bg.crop((0, 680, bw, 760))
crop_bg_step.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_step_crop.png')

# In amitabha, find exact bottom step
crop_am_step = amitabha.crop((0, 910, w, 970))
crop_am_step.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/amitabha_step_crop.png')

print('Saved step crops')
