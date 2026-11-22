from PIL import Image

bg = Image.open('public/assets/temple_stage_bg.png')
w, h = bg.size

# Let's crop from y=750 to y=850 to find where the step ends and marble floor begins
crop = bg.crop((0, 750, w, 850))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_step_to_floor.png')
print('Saved temple_bg_step_to_floor.png')
