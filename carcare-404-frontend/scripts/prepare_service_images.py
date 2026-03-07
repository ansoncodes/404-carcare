from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "samp_images"
OUTPUT_DIR = ROOT / "carcare-404-frontend" / "public" / "images" / "services"
TARGET_SIZE = (1200, 675)  # 16:9 cover assets for service cards

SERVICE_SOURCE_MAP = {
    "Air freshener": "car_air_freshner.jpg",
    "Carpet shampooing": "carpet shampooing car.jpg",
    "Clay bar treatment": "Clay bar treatment.jpg",
    "Engine bay cleaning": "Engine bay cleaning car.jpg",
    "Exterior wash": "Exterior wash car.jpg",
    "Full detail": "car detailed.jpg",
    "Hand wash": "hand wash car.jpg",
    "Headlight restoration": "headlight_restoration.jpg",
    "Headliner cleaning": "car interior cleaner Headliner.jpg",
    "Interior wipe-down": "interior_wipe_down.jpg",
    "Leather conditioning": "Leather conditioning.jpg",
    "Odor elimination": "odor_elimination.jpg",
    "Paint correction": "paint_correction.jpg",
    "Paint sealant / ceramic coating": "Paint sealant.jpg",
    "Pet hair removal": "pet hair removal.jpg",
    "Rim / wheel cleaning": "rim_cleaning.jpg",
    "Rust proofing": "rust_proofing.jpg",
    "Sanitization": "sanitization car.jpg",
    "Scratch touch-up": "scatch touch up.jpg",
    "Tire shine": "tire shine.jpg",
    "Touchless wash": "touchless car wash.jpg",
    "Vacuuming": "vacumming_car.jpg",
    "Water spot removal": "water_spot.jpg",
    "Waxing & polishing": "waxing polishing.jpg",
    "Window cleaning": "window_cleaning.jpg",
    "Window tinting": "window_tinting.jpg",
    "Windshield treatment": "Windshield treatment.jpg",
}


def slugify_service_name(name: str) -> str:
    value = name.lower().strip().replace("&", "and").replace("/", " ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-{2,}", "-", value).strip("-")


def build_cover(source_path: Path) -> Image.Image:
    with Image.open(source_path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")

        background = ImageOps.fit(image, TARGET_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        background = background.filter(ImageFilter.GaussianBlur(24))
        background = ImageEnhance.Brightness(background).enhance(0.58)

        foreground_max = (int(TARGET_SIZE[0] * 0.94), int(TARGET_SIZE[1] * 0.94))
        foreground = ImageOps.contain(image, foreground_max, method=Image.Resampling.LANCZOS)

        x = (TARGET_SIZE[0] - foreground.width) // 2
        y = (TARGET_SIZE[1] - foreground.height) // 2
        background.paste(foreground, (x, y))
        return background


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    missing_files = [src for src in SERVICE_SOURCE_MAP.values() if not (SOURCE_DIR / src).exists()]
    if missing_files:
        missing = ", ".join(missing_files)
        raise FileNotFoundError(f"Missing source images in {SOURCE_DIR}: {missing}")

    for service_name, source_filename in SERVICE_SOURCE_MAP.items():
        source_path = SOURCE_DIR / source_filename
        output_name = f"{slugify_service_name(service_name)}.jpg"
        output_path = OUTPUT_DIR / output_name

        cover = build_cover(source_path)
        cover.save(output_path, format="JPEG", quality=88, optimize=True, progressive=True)
        print(f"{service_name} -> {output_path.name}")

    print(f"\nPrepared {len(SERVICE_SOURCE_MAP)} service cover images in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
