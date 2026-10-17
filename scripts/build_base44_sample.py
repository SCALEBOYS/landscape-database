"""base44 の叩き台に取り込むサンプル CSV を作る（docs/base44-prompt.md 参照）。

使い方:
    python3 scripts/build_base44_sample.py

- species.csv: supabase/seed_species.sql の樹種マスタをそのまま CSV にしたもの（実データ）
- projects.csv: 候補リストのうち受賞一覧で確認済み・設計者判明の物件 12 件（実データ。座標は概算）
- plantings_dummy.csv / components_dummy.csv: 画面確認用のダミー。実際の植栽・素材ではないので本番に持ち込まない
"""

import csv
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "base44_sample"

# 候補 no → (slug, 緯度, 経度)。座標は地図表示確認用の概算で、現地確認時に修正する
PICK = {
    "1": ("higashi-yuenchi", 34.6895, 135.1960),
    "4": ("nakanoshima-park", 34.6930, 135.5060),
    "3": ("ama-iseki-park", 34.8530, 135.6340),
    "5": ("isogami-park", 34.6920, 135.2000),
    "7": ("amagasaki-ekimae-chuo-park", 34.7340, 135.4210),
    "22": ("kusatsugawa-atochi-park-5", 35.0190, 135.9590),
    "35": ("grand-front-osaka", 34.7050, 135.4950),
    "60": ("shijo-dori", 35.0037, 135.7650),
    "86": ("shin-daibiru-dojima-no-mori", 34.6950, 135.4960),
    "99": ("oeda-park", 34.7390, 135.5640),
    "20": ("kitora-kofun-area", 34.4520, 135.8050),
    "24": ("sheepath-park", 34.5000, 135.4060),
}
# 親子構造の画面確認用（グランフロント大阪の中の広場）
CHILD = {
    "slug": "umekita-hiroba", "parent_slug": "grand-front-osaka", "name_ja": "うめきた広場", "name_en": "Umekita Plaza",
    "use_category": "plaza", "prefecture": "大阪府", "municipality": "大阪市北区", "latitude": 34.7036, "longitude": 135.4960,
}

DUMMY_PLANTINGS = [
    ("higashi-yuenchi", "zelkova-serrata", "tall_tree"), ("higashi-yuenchi", "zoysia-japonica", "ground_cover"),
    ("nakanoshima-park", "cinnamomum-camphora", "tall_tree"), ("nakanoshima-park", "rhododendron-pulchrum", "shrub"),
    ("grand-front-osaka", "zelkova-serrata", "tall_tree"), ("grand-front-osaka", "ophiopogon-japonicus", "ground_cover"),
    ("umekita-hiroba", "zelkova-serrata", "tall_tree"),
    ("oeda-park", "cerasus-yedoensis", "tall_tree"), ("shin-daibiru-dojima-no-mori", "machilus-thunbergii", "tall_tree"),
]
DUMMY_COMPONENTS = [
    ("higashi-yuenchi", "paving", "インターロッキングブロック"), ("higashi-yuenchi", "furniture", "ベンチ"),
    ("nakanoshima-park", "paving", "自然石舗装"), ("nakanoshima-park", "lighting", "ポール灯"),
    ("grand-front-osaka", "water", "流れ・せせらぎ"), ("grand-front-osaka", "paving", "自然石舗装"),
    ("oeda-park", "play", "遊具"), ("shijo-dori", "paving", "自然石舗装"),
]


def species_rows():
    sql = (ROOT / "supabase" / "seed_species.sql").read_text(encoding="utf-8")
    aliases = {}
    for alias, slug in re.findall(r"^  \('([^']+)', '([^']+)'\),?$", sql, re.M):
        aliases.setdefault(slug, []).append(alias)
    pat = re.compile(r"^  \('([^']+)', '([^']+)', '([^']*)', '([^']+)', '([^']*)', '([^']*)', '(\w+)'::growth_form, (true|false), ", re.M)
    for slug, ja, en, sci, fam_ja, _fam, form, ever in pat.findall(sql):
        yield {"slug": slug, "name_ja": ja, "name_en": en, "scientific_name": sci, "family_ja": fam_ja,
               "growth_form": form, "evergreen": ever, "aliases": ",".join(aliases.get(slug, []))}


def write(name, fields, rows):
    with open(OUT / name, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    species = list(species_rows())
    known = {s["slug"] for s in species}

    candidates = {r["no"]: r for r in csv.DictReader(open(ROOT / "data" / "kansai_candidates.csv", encoding="utf-8"))}
    pfields = ["slug", "parent_slug", "name_ja", "name_en", "use_category", "prefecture", "municipality", "latitude",
               "longitude", "completed_year", "summary_ja", "designers", "awards", "source_urls", "status"]
    projects = []
    for no, (slug, lat, lng) in PICK.items():
        c = candidates[no]
        projects.append({
            "slug": slug, "parent_slug": "", "name_ja": c["name_ja"], "name_en": "", "use_category": c["use_category"],
            "prefecture": c["prefecture"], "municipality": c["municipality"], "latitude": lat, "longitude": lng,
            "completed_year": "", "summary_ja": f"{c['award_year']}年 {c['award']}。" if c["award_year"] else "",
            "designers": c["designers"].replace("／", ","), "awards": c["award"], "source_urls": c["source_url"],
            "status": "published",
        })
    projects.append({**{k: "" for k in pfields}, **CHILD, "status": "published"})

    for p, s, _ in DUMMY_PLANTINGS:
        assert s in known, f"seed にない樹種: {s}"
    slugs = {p["slug"] for p in projects}
    assert all(p in slugs for p, _, _ in DUMMY_PLANTINGS + DUMMY_COMPONENTS)

    print("species", write("species.csv", list(species[0].keys()), species))
    print("projects", write("projects.csv", pfields, projects))
    print("plantings_dummy", write("plantings_dummy.csv", ["project_slug", "species_slug", "layer"],
                                   [dict(zip(["project_slug", "species_slug", "layer"], t)) for t in DUMMY_PLANTINGS]))
    print("components_dummy", write("components_dummy.csv", ["project_slug", "kind", "category_ja"],
                                    [dict(zip(["project_slug", "kind", "category_ja"], t)) for t in DUMMY_COMPONENTS]))


if __name__ == "__main__":
    main()
