#!/usr/bin/env python3
"""Génère js/nikon-catalog.js : la liste des Picture Controls Nikon (.NP3) du dépôt
shouryan01/Nikon-Recipes, à un commit figé.

Seuls les noms, créateurs et chemins sont écrits : les fichiers eux-mêmes ne sont pas copiés dans
Fuji Looks. L'app les télécharge depuis le dépôt d'origine (raw.githubusercontent.com) quand on les
affiche ou qu'on les ouvre.

    git clone https://github.com/shouryan01/Nikon-Recipes.git /tmp/Nikon-Recipes
    python3 tools/build-nikon-catalog.py /tmp/Nikon-Recipes
"""
import json
import pathlib
import subprocess
import sys

REPO = "shouryan01/Nikon-Recipes"
OUT = pathlib.Path(__file__).resolve().parent.parent / "js" / "nikon-catalog.js"


def entry(rel):
    parts = rel.parts
    stem = rel.stem
    if parts[0] == "Nikon Creators":
        bits = stem.split("_")
        name, creator = (" ".join(bits[:-1]), bits[-1]) if len(bits) > 1 else (stem, "")
        return "Nikon Creators", name, creator or "Nikon Creators"
    if parts[0] == "Color Grading":
        return "Color Grading", stem.replace("_", " "), "Nikon"
    if parts[0] == "NikonPC":
        return "NikonPC", stem, "nikonpc.com"
    if parts[0] == "Third Party Creators":
        creator = parts[1]
        return creator, stem.replace("_", " "), creator
    return parts[0], stem, ""


def main():
    root = pathlib.Path(sys.argv[1]).resolve()
    commit = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
    # Collections officielles Nikon d'abord, puis les créateurs indépendants (ordre alphabétique).
    rank = {"Nikon Creators": 0, "Color Grading": 1, "NikonPC": 2}
    files = sorted(
        (p.relative_to(root) for p in root.rglob("*") if p.suffix.lower() == ".np3" and ".git" not in p.parts),
        key=lambda rel: (rank.get(rel.parts[0], 3), rel.as_posix().lower()),
    )
    sets = []
    items = []
    for rel in files:
        set_label, name, creator = entry(rel)
        if set_label not in sets:
            sets.append(set_label)
        items.append([sets.index(set_label), rel.as_posix(), name.strip(), creator])
    doc = {"repo": REPO, "commit": commit, "sets": sets, "items": items}
    OUT.write_text(
        "/* Fuji Looks — Catalogue des Picture Controls Nikon (généré par tools/build-nikon-catalog.py).\n"
        f" * Source : https://github.com/{REPO} (commit {commit[:7]}). Noms, créateurs et chemins seulement :\n"
        " * chaque .NP3 est téléchargé depuis le dépôt d'origine quand l'app en a besoin. */\n"
        f"window.NIKON_CATALOG = {json.dumps(doc, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print(f"{len(items)} presets, {len(sets)} collections -> {OUT}")


if __name__ == "__main__":
    main()
