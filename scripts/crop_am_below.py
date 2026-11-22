from PIL import Image

am = Image.open('public/assets/amitabha_stage_backup.png')
w, h = am.size

crop = am.crop((0, 950, w, 1150))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/amitabha_backup_below_step.png')
print('Saved amitabha_backup_below_step.png')
