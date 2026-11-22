from PIL import Image
import os

artifact_dir = r'C:\Users\phanp\.gemini\antigravity-cli\brain\bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8'

def crop_and_save(img_name, out_name, bbox):
    p = os.path.join(artifact_dir, img_name)
    if os.path.exists(p):
        img = Image.open(p)
        cropped = img.crop(bbox)
        cropped.save(os.path.join(artifact_dir, out_name))
        print(f'Saved {out_name}')

# 1. Overview floor: x: 0 to 1080, y: 1100 to 1850
crop_and_save('narrow_carpet_overview.png', 'crop_narrow_floor_overview.png', (0, 1100, 1080, 1850))

# 2. Walking up: x: 80 to 1000, y: 1150 to 1750
crop_and_save('pilgrim_walking_up.png', 'crop_pilgrim_walking_up.png', (80, 1150, 1000, 1750))

# 3. Prostrating deep: x: 100 to 980, y: 1100 to 1600
crop_and_save('pilgrim_prostrating_deep.png', 'crop_pilgrim_prostrating_deep.png', (100, 1100, 980, 1600))

# 4. Returning face front: x: 150 to 930, y: 1150 to 1750
crop_and_save('pilgrim_returning_face_front.png', 'crop_pilgrim_returning_face_front.png', (150, 1150, 930, 1750))

print('All crops completed successfully!')
