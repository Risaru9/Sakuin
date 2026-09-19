import glob, os, subprocess, tempfile, pathlib
from PIL import Image
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
here = pathlib.Path(__file__).resolve().parent
(here / "png").mkdir(exist_ok=True)
for html in sorted((here / "render").glob("*.html")):
    name = html.stem
    size = int(name.split("-")[-1])
    # Headless Chromium has a minimum window size, so render large and crop.
    win = max(size, 200)
    out = here / "png" / f"{name}.png"
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", "--default-background-color=00000000",
            f"--user-data-dir={profile}", f"--window-size={win},{win}",
            f"--screenshot={out}", html.as_uri()], capture_output=True, timeout=120)
    im = Image.open(out).convert("RGBA").crop((0, 0, size, size))
    im.save(out)
    print(name, im.size, im.getpixel((0, 0)), im.getpixel((size // 2, size // 2)))
