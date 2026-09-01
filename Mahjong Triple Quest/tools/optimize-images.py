from pathlib import Path
from shutil import copy2
import sys

from PIL import Image

source = Path(sys.argv[1])
target = Path(sys.argv[2])

for path in source.rglob("*"):
    if not path.is_file():
        continue
    output = target / path.relative_to(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() != ".png":
        copy2(path, output)
        continue
    image = Image.open(path)
    if path.name == "game_bg.png":
        image = image.resize((600, 1067), Image.Resampling.LANCZOS)
    method = Image.Quantize.FASTOCTREE if image.mode in ("RGBA", "LA") else Image.Quantize.MEDIANCUT
    image.quantize(colors=192, method=method, dither=Image.Dither.NONE).save(output, optimize=True)
