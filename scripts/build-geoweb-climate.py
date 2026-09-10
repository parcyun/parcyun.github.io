#!/usr/bin/env python3
"""Build GeoWeb's browser-ready six-zone climate texture from public rasters."""

from argparse import ArgumentParser
from pathlib import Path

import numpy as np
from PIL import Image, PngImagePlugin


COLORS = {
    0: (0, 0, 0),
    1: (245, 160, 111),  # tropical
    2: (142, 200, 139),  # temperate
    3: (156, 164, 214),  # cold
    4: (229, 235, 245),  # polar
    5: (242, 212, 107),  # dry
    6: (105, 196, 199),  # highland
}


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("koppen", type=Path, help="Beck et al. 1991–2020 0.1° GeoTIFF")
    parser.add_argument("mountains", type=Path, help="USGS K3 .tif.ovr file")
    parser.add_argument("elevation", type=Path, help="NOAA ETOPO 2022 0.5° ERDDAP CSV")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    Image.MAX_IMAGE_PIXELS = None
    koppen = np.asarray(Image.open(args.koppen), dtype=np.uint8)
    if koppen.shape != (1800, 3600):
        raise ValueError(f"expected a 3600x1800 Köppen raster, got {koppen.shape[::-1]}")

    zones = np.zeros_like(koppen)
    zones[(koppen >= 1) & (koppen <= 3)] = 1
    zones[(koppen >= 8) & (koppen <= 16)] = 2
    zones[(koppen >= 17) & (koppen <= 28)] = 3
    zones[(koppen >= 29) & (koppen <= 30)] = 4
    zones[(koppen >= 4) & (koppen <= 7)] = 5

    mountains_image = Image.open(args.mountains)
    # The 1:64 overview is 0.133° and preserves the K3 source's irregular mountain footprint.
    mountains_image.seek(5)
    mountains = np.asarray(mountains_image, dtype=np.uint8)

    lon = -179.95 + np.arange(3600) * 0.1
    lat = 89.95 - np.arange(1800) * 0.1
    source_pixel = 0.0020833333
    source_x0, source_y0, overview_factor = -179.9990972222, 83.6238194444, 64
    source_col = np.rint((lon - source_x0) / (source_pixel * overview_factor)).astype(int)
    source_row = np.rint((source_y0 - lat) / (source_pixel * overview_factor)).astype(int)
    valid_rows = (source_row >= 0) & (source_row < mountains.shape[0])
    source_col = np.clip(source_col, 0, mountains.shape[1] - 1)
    source_row = np.clip(source_row, 0, mountains.shape[0] - 1)
    mountain_mask = mountains[source_row[:, None], source_col[None, :]] == 1
    mountain_mask &= valid_rows[:, None]

    elevation_rows = np.loadtxt(args.elevation, delimiter=",", skiprows=2, usecols=2, dtype=np.float32)
    if elevation_rows.size != 360 * 720:
        raise ValueError(f"expected a 720x360 ETOPO subset, got {elevation_rows.size} samples")
    elevation = elevation_rows.reshape(360, 720)  # south-to-north, longitude 0–360
    elevation_col = np.rint((np.mod(lon, 360) - 0.0083333333) / 0.5).astype(int) % 720
    elevation_row = np.clip(np.rint((lat + 89.9916666667) / 0.5).astype(int), 0, 359)
    high_elevation = elevation[elevation_row[:, None], elevation_col[None, :]] >= 1500
    # Classroom highland = K3 mountain terrain at 1,500 m or above. Preserve the
    # genuinely polar high latitudes, while allowing cold high plateaus such as Tibet.
    non_polar_latitude = (lat > -60) & (lat < 66.5)
    zones[mountain_mask & high_elevation & non_polar_latitude[:, None] & (zones != 0)] = 6

    output = Image.fromarray(zones, mode="P")
    palette = []
    for index in range(256):
        palette.extend(COLORS.get(index, (0, 0, 0)))
    output.putpalette(palette)
    output.info["transparency"] = bytes([0] + [255] * 255)
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Climate source", "Beck et al. (2023), Köppen-Geiger 1991-2020, CC BY 4.0")
    metadata.add_text("Mountain source", "USGS Global Mountains K3, Public Domain; NOAA ETOPO 2022")
    metadata.add_text("Processing", "Major groups A/B/C/D/E plus K3 terrain at >=1500 m; polar retained")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output, optimize=True, pnginfo=metadata, transparency=output.info["transparency"])

    labels = ["transparent", "tropical", "temperate", "cold", "polar", "dry", "highland"]
    counts = np.bincount(zones.ravel(), minlength=7)
    print(f"wrote {args.output} ({output.width}x{output.height})")
    print(dict(zip(labels, counts.tolist())))


if __name__ == "__main__":
    main()
