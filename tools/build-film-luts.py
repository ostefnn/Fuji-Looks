#!/usr/bin/env python3
"""Builds js/film-luts-data.js from a checkout of https://github.com/YahiaAngelo/Film-Luts (MIT).

Usage: python3 tools/build-film-luts.py /path/to/Film-Luts

Every LUT used here is 13x13x13 (G'MIC film CLUTs, sRGB in, sRGB out). Each one is stored as
13^3 RGB triplets in 8 bits (red fastest, like the .cube file), all films concatenated, in base64.
The app interpolates between the nodes, so 8 bits per node is well below what the eye sees.
"""
import base64
import pathlib
import sys

# Film key in js/films.js -> path of the .cube in Film-Luts (without the extension).
LUTS = {
    "portra400": "negative_new/kodak_portra_400",
    "ektar100": "negative_color/kodak_ektar_100",
    "superia400": "negative_old/fuji_superia_400",
    "portra160": "negative_new/kodak_portra_160",
    "portra800": "negative_new/kodak_portra_800",
    "portra160nc": "negative_old/kodak_portra_160_nc",
    "portra160vc": "negative_old/kodak_portra_160_vc",
    "portra400nc": "negative_old/kodak_portra_400_nc",
    "portra400vc": "negative_old/kodak_portra_400_vc",
    "portra400uc": "negative_old/kodak_portra_400_uc",
    "elite200": "negative_color/kodak_elite_color_200",
    "elite400": "negative_color/kodak_elite_color_400",
    "pro160c": "negative_new/fuji_160c",
    "pro400h": "negative_new/fuji_400h",
    "pro800z": "negative_new/fuji_800z",
    "reala100": "negative_color/fuji_superia_reala_100",
    "superia100": "negative_old/fuji_superia_100",
    "superia200": "negative_color/fuji_superia_200",
    "superia800": "negative_old/fuji_superia_800",
    "superia1600": "negative_old/fuji_superia_1600",
    "xtra800": "negative_color/fuji_superia_x-tra_800",
    "vista200": "negative_color/agfa_vista_200",
    "ultra100": "negative_color/agfa_ultra_color_100",
    "redscale100": "negative_color/lomography_redscale_100",
    "velvia50": "colorslide/fuji_velvia_50",
    "velvia100": "colorslide/fuji_velvia_100_generic",
    "provia100f": "colorslide/fuji_provia_100f",
    "provia400f": "colorslide/fuji_provia_400f",
    "provia400x": "colorslide/fuji_provia_400x",
    "astia100f": "colorslide/fuji_astia_100f",
    "sensia100": "colorslide/fuji_sensia_100",
    "kodachrome25": "colorslide/kodak_kodachrome_25",
    "kodachrome64": "colorslide/kodak_kodachrome_64",
    "kodachrome200": "colorslide/kodak_kodachrome_200",
    "e100gx": "colorslide/kodak_e-100_gx_ektachrome_100",
    "e100vs": "colorslide/kodak_ektachrome_100_vs",
    "elitechrome200": "colorslide/kodak_elite_chrome_200",
    "elitechrome400": "colorslide/kodak_elite_chrome_400",
    "extracolor100": "colorslide/kodak_elite_extracolor_100",
    "precisa100": "colorslide/agfa_precisa_100",
    "elite100xpro": "negative_color/kodak_elite_100_xpro",
    "superia200xpro": "colorslide/fuji_superia_200_xpro",
    "xproslide200": "colorslide/lomography_x-pro_slide_200",
    "hp5": "bw/ilford_hp_5_plus_400",
    "trix400": "bw/kodak_tri-x_400",
    "tmax100": "bw/kodak_t-max_100",
    "tmax400": "bw/kodak_t-max_400",
    "tmax3200": "bw/kodak_t-max_3200",
    "bw400cn": "bw/kodak_bw_400_cn",
    "hie": "bw/kodak_hie_hs_infra",
    "delta100": "bw/ilford_delta_100",
    "delta400": "bw/ilford_delta_400",
    "delta3200": "bw/ilford_delta_3200",
    "fp4": "bw/ilford_fp_4_plus_125",
    "panf50": "bw/ilford_pan_f_plus_50",
    "hps800": "bw/ilford_hps_800",
    "xp2": "bw/ilford_xp_2",
    "acros100": "bw/fuji_neopan_acros_100",
    "neopan1600": "bw/fuji_neopan_1600",
    "apx25": "bw/agfa_apx_25",
    "apx100": "bw/agfa_apx_100",
    "retro80s": "bw/rollei_retro_80s",
    "retro100": "bw/rollei_retro_100_tonal",
    "ortho25": "bw/rollei_ortho_25",
    "ir400": "bw/rollei_ir_400",
    "kodak2383": "print/kodak_2383_constlmap",
    "kodak2393": "print/kodak_2393_constlmap",
    "fuji3510": "print/fuji_3510_constlmap",
    "fuji3513": "print/fuji_3513_constlmap",
}
N = 13


def read_cube(path):
    size, rows = None, []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("LUT_3D_SIZE"):
            size = int(line.split()[1])
        elif line[0] in "-.0123456789":
            rows.append([float(v) for v in line.split()[:3]])
    if size != N or len(rows) != N ** 3:
        raise SystemExit(f"{path}: expected a {N}^3 LUT")
    return rows


def main():
    root = pathlib.Path(sys.argv[1]) / "luts"
    out = bytearray()
    for key, rel in LUTS.items():
        for r, g, b in read_cube(root / f"{rel}.cube"):
            out += bytes(max(0, min(255, round(v * 255))) for v in (r, g, b))
    keys = ",".join(f'"{k}"' for k in LUTS)
    data = base64.b64encode(bytes(out)).decode()
    target = pathlib.Path(__file__).resolve().parent.parent / "js" / "film-luts-data.js"
    target.write_text(
        "/* Fuji Looks — Couleurs des pellicules : LUT 3D 13³ de la collection Film-Luts\n"
        " * (https://github.com/YahiaAngelo/Film-Luts, MIT, voir vendor/THIRD-PARTY-NOTICES.md).\n"
        " * Généré par tools/build-film-luts.py : ne pas modifier à la main. */\n"
        f"self.FILM_LUTS = {{ n: {N}, keys: [{keys}],\n  data: \"{data}\" }};\n"
    )
    print(f"{len(LUTS)} LUTs, {len(out)} bytes -> {target}")


main()
