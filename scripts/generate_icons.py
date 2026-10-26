import os
from PIL import Image, ImageDraw

SOURCE_IMAGE_PATH = '/Users/technoexponent_m4/.gemini/antigravity-ide/brain/75d29d2f-aa9e-4762-b6f9-205c28e98000/hello_icon_fullbleed_1792737563267.jpg'

IOS_DIR = 'ios/WEmanipur/Images.xcassets/AppIcon.appiconset'
ANDROID_RES_DIR = 'android/app/src/main/res'

IOS_SIZES = {
    'Icon-App-20x20@1x.png': (20, 20),
    'Icon-App-20x20@2x.png': (40, 40),
    'Icon-App-20x20@3x.png': (60, 60),
    'Icon-App-29x29@1x.png': (29, 29),
    'Icon-App-29x29@2x.png': (58, 58),
    'Icon-App-29x29@3x.png': (87, 87),
    'Icon-App-40x40@1x.png': (40, 40),
    'Icon-App-40x40@2x.png': (80, 80),
    'Icon-App-40x40@3x.png': (120, 120),
    'Icon-App-60x60@2x.png': (120, 120),
    'Icon-App-60x60@3x.png': (180, 180),
    'Icon-App-76x76@1x.png': (76, 76),
    'Icon-App-76x76@2x.png': (152, 152),
    'Icon-App-83.5x83.5@2x.png': (167, 167),
    'ItunesArtwork@2x.png': (1024, 1024),
}

ANDROID_MIPMAPS = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

def create_rounded_mask(size, radius_ratio=0.22):
    w, h = size
    scale = 4
    large_w, large_h = w * scale, h * scale
    radius = int(large_w * radius_ratio)
    
    mask = Image.new('L', (large_w, large_h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, large_w - 1, large_h - 1], radius=radius, fill=255)
    return mask.resize((w, h), Image.Resampling.LANCZOS)

def create_circular_mask(size):
    w, h = size
    scale = 4
    large_w, large_h = w * scale, h * scale
    
    mask = Image.new('L', (large_w, large_h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([0, 0, large_w - 1, large_h - 1], fill=255)
    return mask.resize((w, h), Image.Resampling.LANCZOS)

def main():
    src = Image.open(SOURCE_IMAGE_PATH).convert('RGB')
    print(f"Loaded source image: {src.size}")

    # 1. Generate iOS Icons
    os.makedirs(IOS_DIR, exist_ok=True)
    for filename, (w, h) in IOS_SIZES.items():
        out_path = os.path.join(IOS_DIR, filename)
        resized = src.resize((w, h), Image.Resampling.LANCZOS)
        # Apple icons must be 24-bit RGB PNG without transparency
        resized.save(out_path, format='PNG')
        print(f"Generated iOS icon: {filename} ({w}x{h})")

    # 2. Generate Android Icons
    for folder, size in ANDROID_MIPMAPS.items():
        target_dir = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(target_dir, exist_ok=True)

        # Standard launcher icon (squircle / rounded rect)
        sq_icon = src.resize((size, size), Image.Resampling.LANCZOS).convert('RGBA')
        round_mask = create_rounded_mask((size, size))
        sq_icon.putalpha(round_mask)
        sq_path = os.path.join(target_dir, 'ic_launcher.png')
        sq_icon.save(sq_path, format='PNG')

        # Round launcher icon (circular)
        circ_icon = src.resize((size, size), Image.Resampling.LANCZOS).convert('RGBA')
        circ_mask = create_circular_mask((size, size))
        circ_icon.putalpha(circ_mask)
        circ_path = os.path.join(target_dir, 'ic_launcher_round.png')
        circ_icon.save(circ_path, format='PNG')

        print(f"Generated Android {folder}: ic_launcher.png & ic_launcher_round.png ({size}x{size})")

    print("\nAll iOS and Android app icons generated successfully!")

if __name__ == '__main__':
    main()
