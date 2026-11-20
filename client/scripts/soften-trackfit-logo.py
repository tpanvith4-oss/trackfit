"""Apply blunt/rounded outer edges to TrackFit logo assets (keeps original artwork)."""

from pathlib import Path

from PIL import Image, ImageDraw

SRC = Path(
    r"C:\Users\tpanv\.cursor\projects\c-personal-projects-Food-Tracking-app\assets\image-1fe7f733-5c26-4ace-a836-7675e26fddb6.png"
)
ASSETS = Path(r"C:\Users\tpanv\.cursor\projects\c-personal-projects-Food-Tracking-app\assets")
CLIENT = Path(__file__).resolve().parents[1]
RES = CLIENT / "android" / "app" / "src" / "main" / "res"
PUBLIC = CLIENT / "public"
IOS_ICON = CLIENT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"


def apply_rounded_rect_mask(img: Image.Image, radius_ratio: float = 0.2) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    radius = max(8, int(min(w, h) * radius_ratio))
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    out = rgba.copy()
    out.putalpha(mask)
    return out


def apply_circle_mask(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, w - 1, h - 1), fill=255)
    out = rgba.copy()
    out.putalpha(mask)
    return out


def to_opaque_rgb(img: Image.Image, bg=(255, 255, 255, 255)) -> Image.Image:
    base = Image.new("RGBA", img.size, bg)
    base.alpha_composite(img.convert("RGBA"))
    return base.convert("RGB")


def fit_on_canvas(img: Image.Image, size: int, bg=(255, 255, 255, 255), scale=0.72) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    max_side = int(size * scale)
    fitted = img.copy()
    fitted.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted if fitted.mode == "RGBA" else None)
    return canvas


def fit_splash(img: Image.Image, width: int, height: int, bg=(255, 255, 255, 255), scale=0.42) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), bg)
    max_w = int(width * scale)
    max_h = int(height * scale)
    fitted = img.copy()
    fitted.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    x = (width - fitted.width) // 2
    y = (height - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted if fitted.mode == "RGBA" else None)
    return canvas


def main():
    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    ASSETS.mkdir(parents=True, exist_ok=True)
    master = apply_rounded_rect_mask(fit_on_canvas(logo, 1024, scale=0.88), radius_ratio=0.2)
    to_opaque_rgb(master).save(ASSETS / "trackfit-logo-blunt.png", optimize=True)

    PUBLIC.mkdir(parents=True, exist_ok=True)
    apply_rounded_rect_mask(fit_on_canvas(logo, 512, scale=0.9), 0.2).save(
        PUBLIC / "trackfit-logo.png", optimize=True
    )
    apply_rounded_rect_mask(fit_on_canvas(logo, 192, scale=0.85), 0.22).save(
        PUBLIC / "favicon.png", optimize=True
    )
    apply_rounded_rect_mask(fit_on_canvas(logo, 512, scale=0.85), 0.22).save(
        PUBLIC / "apple-touch-icon.png", optimize=True
    )

    if IOS_ICON.parent.exists():
        ios = apply_rounded_rect_mask(fit_on_canvas(logo, 1024, scale=0.82), 0.223)
        to_opaque_rgb(ios).save(IOS_ICON, optimize=True)

    launcher = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    foreground = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }

    for folder, size in launcher.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        square = apply_rounded_rect_mask(fit_on_canvas(logo, size, scale=0.82), 0.22)
        to_opaque_rgb(square).save(out_dir / "ic_launcher.png", optimize=True)
        round_icon = apply_circle_mask(fit_on_canvas(logo, size, scale=0.78))
        to_opaque_rgb(round_icon).save(out_dir / "ic_launcher_round.png", optimize=True)

    for folder, size in foreground.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        fg = fit_on_canvas(logo, size, bg=(0, 0, 0, 0), scale=0.66)
        fg.save(out_dir / "ic_launcher_foreground.png", optimize=True)

    splashes = {
        "drawable": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (1080, 1920),
        "drawable-port-xxxhdpi": (1440, 2560),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1920, 1080),
        "drawable-land-xxxhdpi": (2560, 1440),
    }
    for folder, (width, height) in splashes.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        splash = fit_splash(logo, width, height).convert("RGB")
        splash.save(out_dir / "splash.png", optimize=True)

    print("Rounded TrackFit logo edges and refreshed public/ + android/ios assets")


if __name__ == "__main__":
    main()
