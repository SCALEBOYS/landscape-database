"""YList のタブ区切りデータから、ランドスケープでよく使う樹種の初期データ（seed SQL）を作る。

使い方:
    python3 scripts/build_species_seed.py <YList_download_tab.txt> > supabase/seed_species.sql

YList 本体はリポジトリに含めない（利用条件が未確認のため。docs/db-design.md 参照）。
和名で「標準」行を引き、学名・科名・YList ID を補う。見つからない和名は stderr に出す。
"""

import csv
import re
import sys
import unicodedata

# YList に載っていない主要な栽培種。学名・科名は手入力（ylist_id なし）
# (標準和名, 英名, growth_form, evergreen, 表記ゆれ, 学名, 科名, Family)
MANUAL = [
    ("ハナミズキ", "Flowering dogwood", "tree", False, ["花水木", "アメリカヤマボウシ"], "Cornus florida", "ミズキ科", "Cornaceae"),
    ("アメリカザイフリボク", "Juneberry", "tree", False, ["ジューンベリー"], "Amelanchier canadensis", "バラ科", "Rosaceae"),
]

# (標準和名, 英名, growth_form, evergreen, 表記ゆれ)
CURATED = [
    # 高木・中木
    ("ケヤキ", "Japanese zelkova", "tree", False, ["欅", "けやき"]),
    ("クスノキ", "Camphor tree", "tree", True, ["楠", "樟"]),
    ("イチョウ", "Ginkgo", "tree", False, ["銀杏", "公孫樹"]),
    ("ソメイヨシノ", "Yoshino cherry", "tree", False, ["染井吉野"]),
    ("ヤマザクラ", "Japanese mountain cherry", "tree", False, ["山桜"]),
    ("エドヒガン", "Edo higan cherry", "tree", False, ["江戸彼岸"]),
    ("ヤマボウシ", "Kousa dogwood", "tree", False, ["山法師"]),
    ("コブシ", "Kobushi magnolia", "tree", False, ["辛夷"]),
    ("ハクモクレン", "Yulan magnolia", "tree", False, ["白木蓮"]),
    ("モミジバフウ", "American sweetgum", "tree", False, ["アメリカフウ"]),
    ("トウカエデ", "Trident maple", "tree", False, ["唐楓"]),
    ("イロハモミジ", "Japanese maple", "tree", False, ["いろは紅葉", "イロハカエデ"]),
    ("ハナノキ", "Hananoki maple", "tree", False, []),
    ("エゴノキ", "Japanese snowbell", "tree", False, []),
    ("アオダモ", "Aodamo ash", "tree", False, ["コバノトネリコ"]),
    ("シマトネリコ", "Formosan ash", "tree", True, []),
    ("ソヨゴ", "Longstalk holly", "tree", True, []),
    ("シラカシ", "Bamboo-leaf oak", "tree", True, ["白樫"]),
    ("アラカシ", "Ring-cupped oak", "tree", True, ["粗樫"]),
    ("ウバメガシ", "Ubame oak", "tree", True, ["姥目樫"]),
    ("コナラ", "Konara oak", "tree", False, ["小楢"]),
    ("クヌギ", "Sawtooth oak", "tree", False, ["櫟"]),
    ("クロガネモチ", "Kurogane holly", "tree", True, []),
    ("モチノキ", "Japanese holly", "tree", True, ["黐の木"]),
    ("ヤマモモ", "Bayberry", "tree", True, ["山桃"]),
    ("タブノキ", "Machilus", "tree", True, ["椨"]),
    ("ヤブツバキ", "Camellia", "tree", True, ["ツバキ", "椿"]),
    ("サザンカ", "Sasanqua camellia", "tree", True, ["山茶花"]),
    ("キンモクセイ", "Fragrant olive", "tree", True, ["金木犀"]),
    ("クロマツ", "Japanese black pine", "tree", True, ["黒松"]),
    ("アカマツ", "Japanese red pine", "tree", True, ["赤松"]),
    ("メタセコイア", "Dawn redwood", "tree", False, ["アケボノスギ"]),
    ("ヌマスギ", "Bald cypress", "tree", False, ["ラクウショウ", "落羽松"]),
    ("ユリノキ", "Tulip tree", "tree", False, ["百合の木"]),
    ("サルスベリ", "Crape myrtle", "tree", False, ["百日紅"]),
    ("エノキ", "Japanese hackberry", "tree", False, ["榎"]),
    ("ムクノキ", "Muku tree", "tree", False, ["椋の木"]),
    ("センダン", "Chinaberry", "tree", False, ["栴檀"]),
    ("カツラ", "Katsura tree", "tree", False, ["桂"]),
    ("ナツツバキ", "Japanese stewartia", "tree", False, ["シャラノキ", "沙羅"]),
    ("ヒメシャラ", "Tall stewartia", "tree", False, []),
    ("オリーブ", "Olive", "tree", True, []),
    ("モミジバスズカケノキ", "London plane", "tree", False, ["プラタナス"]),
    ("トチノキ", "Japanese horse chestnut", "tree", False, ["栃の木"]),
    ("ナンキンハゼ", "Chinese tallow", "tree", False, []),
    ("ヤマモミジ", "Yama maple", "tree", False, []),
    # 低木
    ("サツキ", "Satsuki azalea", "shrub", True, ["皐月"]),
    ("ヒラドツツジ", "Hirado azalea", "shrub", True, ["平戸躑躅"]),
    ("ドウダンツツジ", "Enkianthus", "shrub", False, ["満天星"]),
    ("ホンミツバツツジ", "Mitsuba azalea", "shrub", False, ["ミツバツツジ"]),
    ("ハナゾノツクバネウツギ", "Glossy abelia", "shrub", True, ["アベリア", "ハナツクバネウツギ"]),
    ("シャリンバイ", "Yeddo hawthorn", "shrub", True, ["車輪梅"]),
    ("トベラ", "Japanese pittosporum", "shrub", True, ["海桐"]),
    ("ヒイラギナンテン", "Leatherleaf mahonia", "shrub", True, []),
    ("ナンテン", "Heavenly bamboo", "shrub", True, ["南天"]),
    ("アジサイ", "Hydrangea", "shrub", False, ["紫陽花"]),
    ("ガクアジサイ", "Lacecap hydrangea", "shrub", False, []),
    ("ユキヤナギ", "Thunberg spirea", "shrub", False, ["雪柳"]),
    ("コデマリ", "Reeves spirea", "shrub", False, ["小手毬"]),
    ("ヤマブキ", "Japanese kerria", "shrub", False, ["山吹"]),
    ("クチナシ", "Gardenia", "shrub", True, ["梔子"]),
    ("ジンチョウゲ", "Winter daphne", "shrub", True, ["沈丁花"]),
    ("アセビ", "Japanese andromeda", "shrub", True, ["馬酔木"]),
    ("ヒサカキ", "Eurya", "shrub", True, ["柃"]),
    ("ハマヒサカキ", "Beach eurya", "shrub", True, []),
    ("マサキ", "Japanese spindle", "shrub", True, ["柾"]),
    ("ネズミモチ", "Japanese privet", "shrub", True, []),
    ("トキワマンサク", "Chinese fringe flower", "shrub", True, []),
    ("ヤツデ", "Fatsia", "shrub", True, ["八手"]),
    ("アオキ", "Aucuba", "shrub", True, ["青木"]),
    ("ヤマハギ", "Bush clover", "shrub", False, ["萩"]),
    ("コムラサキ", "Purple beautyberry", "shrub", False, []),
    ("ウツギ", "Deutzia", "shrub", False, ["卯木"]),
    ("レンギョウ", "Forsythia", "shrub", False, ["連翹"]),
    # 地被・草本・シダ・ササ
    ("ジャノヒゲ", "Dwarf lilyturf", "ground_cover", True, ["リュウノヒゲ", "タマリュウ"]),
    ("ヤブラン", "Lilyturf", "ground_cover", True, []),
    ("フッキソウ", "Japanese pachysandra", "ground_cover", True, []),
    ("セイヨウキヅタ", "English ivy", "climber", True, ["ヘデラ・ヘリックス", "ヘデラ"]),
    ("キヅタ", "Japanese ivy", "climber", True, []),
    ("ツタ", "Boston ivy", "climber", False, ["ナツヅタ"]),
    ("テイカカズラ", "Asiatic jasmine", "climber", True, []),
    ("ノウゼンカズラ", "Chinese trumpet vine", "climber", False, []),
    ("シバ", "Japanese lawngrass", "grass", False, ["ノシバ", "野芝"]),
    ("コウライシバ", "Korean lawngrass", "grass", False, ["高麗芝"]),
    ("オオバギボウシ", "Hosta", "ground_cover", False, ["ギボウシ"]),
    ("ツワブキ", "Leopard plant", "ground_cover", True, []),
    ("シャガ", "Fringed iris", "ground_cover", True, []),
    ("ヒメツルソバ", "Pink knotweed", "ground_cover", True, []),
    ("ススキ", "Japanese silver grass", "grass", False, ["芒", "薄"]),
    ("チガヤ", "Cogongrass", "grass", False, []),
    ("ウラハグサ", "Japanese forest grass", "grass", False, ["フウチソウ"]),
    ("ベニシダ", "Autumn fern", "fern", True, []),
    ("オカメザサ", "Okame bamboo", "bamboo", True, []),
    ("クマザサ", "Kuma bamboo grass", "bamboo", True, ["隈笹"]),
    ("モウソウチク", "Moso bamboo", "bamboo", True, ["孟宗竹"]),
    # 水生
    ("ハス", "Sacred lotus", "aquatic", False, ["蓮"]),
    ("ハナショウブ", "Japanese iris", "aquatic", False, ["花菖蒲"]),
    ("カキツバタ", "Rabbit-ear iris", "aquatic", False, ["杜若"]),
    ("ヨシ", "Common reed", "aquatic", False, ["アシ", "葦"]),
]


def slugify(scientific: str) -> str:
    s = unicodedata.normalize("NFKD", scientific).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s


def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    return "'" + str(v).replace("'", "''") + "'"


def main(path: str) -> None:
    standard = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if row["ステータス"] == "標準" and row["和名"] not in standard:
                standard[row["和名"]] = row

    values, aliases, missing, seen_alias = [], [], [], set()
    for ja, en, form, evergreen, alts in CURATED:
        row = standard.get(ja)
        if row is None:
            missing.append(ja)
            continue
        sci = row["学名"].strip()
        slug = slugify(sci)
        values.append(
            f"  ({q(slug)}, {q(ja)}, {q(en)}, {q(sci)}, {q(row['LAPG 科名'])}, "
            f"{q(row['LAPG Family'])}, {q(form)}::growth_form, {q(evergreen)}, {q(row['ID'])})"
        )
        extra = [a.strip(' "') for a in re.split(r"[,，]", row["別名"]) if a.strip(' "')]
        for alias in alts + extra:
            if alias != ja and alias not in seen_alias:
                seen_alias.add(alias)
                aliases.append(f"  ({q(alias)}, {q(slug)})")

    for ja, en, form, evergreen, alts, sci, fam_ja, fam in MANUAL:
        slug = slugify(sci)
        values.append(
            f"  ({q(slug)}, {q(ja)}, {q(en)}, {q(sci)}, {q(fam_ja)}, {q(fam)}, {q(form)}::growth_form, {q(evergreen)}, null)"
        )
        for alias in alts:
            if alias not in seen_alias:
                seen_alias.add(alias)
                aliases.append(f"  ({q(alias)}, {q(slug)})")

    out = sys.stdout
    out.write("-- 樹種マスタ初期データ（scripts/build_species_seed.py で生成。手で編集しない）\n")
    out.write("-- 出典: 植物和名ー学名インデックス YList（米倉浩司・梶田忠, http://ylist.info/ 2021-05-14版）\n")
    out.write("insert into species (slug, name_ja, name_en, scientific_name, family_ja, family_scientific, growth_form, evergreen, ylist_id) values\n")
    out.write(",\n".join(values) + "\non conflict (scientific_name) do nothing;\n\n")
    out.write("insert into species_aliases (alias, species_id)\nselect a.alias, s.id from (values\n")
    out.write(",\n".join(aliases) + "\n) as a(alias, slug)\njoin species s on s.slug = a.slug\non conflict (alias) do nothing;\n")

    print(f"species: {len(values)}, aliases: {len(aliases)}", file=sys.stderr)
    if missing:
        print("YList に標準和名として見つからない: " + "、".join(missing), file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1])
