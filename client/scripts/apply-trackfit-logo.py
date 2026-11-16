"""Generate TrackFit launcher, splash, and web logo assets from the brand PNG."""

from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\tpanv\.cursor\projects\c-personal-projects-Food-Tracking-app\assets\image-1fe7f733-5c26-4ace-a836-7675e26fddb6.png"
)
CLIENT = Path(__file__).resolve().parents[1]
RES = CLIENT / "android" / "app" / "src" / "main" / "res"
PUBLIC = CLIENT / "public"


def fit_on_canvas(img, size, bg=(255, 255, 255, 255), scale=0.72):
    canvas = Image.new("RGBA", (size, size), bg)
    max_side = int(size * scale)
    fitted = img.copy()
    fitted.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def fit_splash(img, width, height, bg=(255, 255, 255, 255), scale=0.42):
    canvas = Image.new("RGBA", (width, height), bg)
    max_w = int(width * scale)
    max_h = int(height * scale)
    fitted = img.copy()
    fitted.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    x = (width - fitted.width) // 2
    y = (height - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def main():
    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    PUBLIC.mkdir(parents=True, exist_ok=True)
    logo_web = logo.copy()
    logo_web.thumbnail((512, 512), Image.Resampling.LANCZOS)
    logo_web.save(PUBLIC / "trackfit-logo.png", optimize=True)
    fit_on_canvas(logo, 192, scale=0.85).save(PUBLIC / "favicon.png", optimize=True)
    fit_on_canvas(logo, 512, scale=0.85).save(PUBLIC / "apple-touch-icon.png", optimize=True)

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
        icon = fit_on_canvas(logo, size, scale=0.82).convert("RGB")
        icon.save(out_dir / "ic_launcher.png", optimize=True)
        icon.save(out_dir / "ic_launcher_round.png", optimize=True)

    for folder, size in foreground.items():
        out_dir = RES / folder
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

    print("Wrote TrackFit logo assets to public/ and android res/")


if __name__ == "__main__":
    main()
