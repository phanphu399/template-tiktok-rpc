from PIL import Image
import os

artifact_dir = r'C:\Users\phanp\.gemini\antigravity-cli\brain\bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8'

# 1. Crop Marquee ticker from marquee_ticker_verify.png
marquee_img_path = os.path.join(artifact_dir, 'marquee_ticker_verify.png')
if os.path.exists(marquee_img_path):
    img = Image.open(marquee_img_path)
    # Top region x: 0 to 1080, y: 0 to 220
    crop_marquee = img.crop((0, 0, 1080, 220))
    crop_marquee.save(os.path.join(artifact_dir, 'marquee_ticker_crop.png'))
    print('Cropped marquee_ticker_crop.png')

# 2. Crop Modal center from temple_guide_modal_verify.png
modal_img_path = os.path.join(artifact_dir, 'temple_guide_modal_verify.png')
if os.path.exists(modal_img_path):
    img = Image.open(modal_img_path)
    # Center modal x: 40 to 1040, y: 150 to 1750
    crop_modal = img.crop((40, 150, 1040, 1750))
    crop_modal.save(os.path.join(artifact_dir, 'temple_guide_modal_crop.png'))
    print('Cropped temple_guide_modal_crop.png')

# 3. Crop Dais with 7 worshippers from multi_devotees_dais_verify.png
dais_img_path = os.path.join(artifact_dir, 'multi_devotees_dais_verify.png')
if os.path.exists(dais_img_path):
    img = Image.open(dais_img_path)
    # Dais region x: 50 to 1030, y: 900 to 1550
    crop_dais = img.crop((50, 900, 1030, 1550))
    crop_dais.save(os.path.join(artifact_dir, 'seven_devotees_dais_crop.png'))
    print('Cropped seven_devotees_dais_crop.png')

# 4. Crop Dais deep bow from multi_devotees_dais_deep_bow.png
dais_deep_path = os.path.join(artifact_dir, 'multi_devotees_dais_deep_bow.png')
if os.path.exists(dais_deep_path):
    img = Image.open(dais_deep_path)
    crop_deep = img.crop((50, 900, 1030, 1550))
    crop_deep.save(os.path.join(artifact_dir, 'seven_devotees_deep_bow_crop.png'))
    print('Cropped seven_devotees_deep_bow_crop.png')

print('All verification crops generated successfully!')
