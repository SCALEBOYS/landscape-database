"""名古屋市の事例 12 件を追加する（2026-11 の現地撮影の準備）。

使い方:
    python scripts/add_nagoya_projects.py          # 追加する
    python scripts/add_nagoya_projects.py --draft  # 下書き（非公開）として追加する

- すでに同じ slug の事例がある場合は、その事例には何もしない（管理画面での編集を上書きしない）
- 内容は公式資料・受賞ページで確認できた項目だけ。設計者が確認できなかったものは入れていない
- 座標は町丁目の代表点などの概算。現地で確かめて管理画面から直すこと
- 途中で失敗した場合は、何も追加されない（1 回の処理としてまとめている）
"""

import hashlib
import sys

import psycopg

from apply_and_verify import db_url

ACCESSED = "2026-11-13"
MACHINAMI = "名古屋まちなみデザインセレクション まちなみデザイン賞"
MACHINAMI_BASE = "https://www.city.nagoya.jp/kankou/kankouinfo/1013766/1034139/"

# credits: (名前, 役割)。awards: (賞の名前, 年, 区分, URL, 賞の slug)。sources: (種類, URL, タイトル, 発行者)
PROJECTS = [
    {
        "slug": "hisaya-odori-park", "name_ja": "Hisaya-odori Park（久屋大通公園 北エリア・テレビ塔エリア）", "name_en": "Hisaya-odori Park",
        "use": "park", "other_uses": ["commercial", "plaza"], "municipality": "名古屋市中区", "address": None,
        "lng": 136.9084, "lat": 35.1723, "year": 2020, "on": "2020-09-01", "precision": "month", "area": 48752.79,
        "summary": "久屋大通公園の北エリアとテレビ塔エリアを、Park-PFI 制度を使って再整備した公園です。南北約 1km にわたり、テレビ塔を軸にした見通しの線に沿って、広場と水盤、24 棟の店舗が並びます。2020 年 9 月に開業しました。",
        "credits": [("日建設計", "landscape_design"), ("大成建設", "landscape_design"), ("大成建設", "architecture"), ("大成建設", "construction"), ("三井不動産", "client")],
        "awards": [],
        "sources": [("article", "https://jia-award.jia.or.jp/kenchikusen/2022/best-architecture/895/", "Hisaya-odori Park（JIA 建築セレクション 2022）", "日本建築家協会"),
                    ("official", "https://www.city.nagoya.jp/shisei/keikaku/1009818/1009881/1034203/1009898.html", "久屋大通公園整備運営事業にかかる「Hisaya-odori Park」のオープン", "名古屋市")],
    },
    {
        "slug": "meijo-park-tonarino", "name_ja": "名城公園 tonarino", "name_en": "tonarino, Meijo Park",
        "use": "park", "other_uses": ["commercial"], "municipality": "名古屋市北区", "address": None,
        "lng": 136.9035, "lat": 35.1905, "year": 2017, "on": "2017-04-27", "precision": "day", "area": None,
        "summary": "名城公園の北園に 2017 年 4 月に開業した、公園の中の営業施設です。飲食店やカフェと、ランニング・自転車利用者のためのシャワーやロッカーを備えた拠点を組み合わせています。名古屋市の公園で初めての本格的な民間営業施設とされています。",
        "credits": [("名古屋市", "client")],
        "awards": [],
        "sources": [("official", "https://www.nagoya-info.jp/spot/detail/167/", "tonarino（トナリノ）", "名古屋観光コンベンションビューロー")],
    },
    {
        "slug": "meijo-park-north-entrance", "name_ja": "名城公園北園 エントランス及び芝生広場", "name_en": None,
        "use": "park", "other_uses": ["plaza"], "municipality": "名古屋市北区", "address": "名古屋市北区名城一丁目",
        "lng": 136.9014, "lat": 35.1891, "year": 2025, "on": "2025-12-01", "precision": "month", "area": None,
        "summary": "名城公園北園の入口まわりと芝生広場の再整備です。2024 年 10 月から工事を行い、2025 年 12 月に使い始めました。2026 年の第 42 回都市公園等コンクールで、施工部門の国土交通大臣賞を受けています。",
        "credits": [("名古屋市", "client"), ("岩間造園", "landscape_construction"), ("本陣", "landscape_construction")],
        "awards": [("都市公園等コンクール 国土交通大臣賞", 2026, "国土交通大臣賞", "https://www.city.nagoya.jp/houdou/3003942/3003949/3005881.html", "toshikoen-concours")],
        "sources": [("official", "https://www.city.nagoya.jp/houdou/3003942/3003949/3005881.html", "第 42 回都市公園等コンクール 国土交通大臣賞の受賞（報道発表）", "名古屋市")],
    },
    {
        "slug": "tsuruma-park-renewal", "name_ja": "鶴舞公園 再整備（TSURUMA GARDEN）", "name_en": "Tsuruma Park Renewal (TSURUMA GARDEN)",
        "use": "park", "other_uses": ["commercial"], "municipality": "名古屋市昭和区", "address": "名古屋市昭和区鶴舞一丁目",
        "lng": 136.9201, "lat": 35.1549, "year": 2023, "on": "2023-05-01", "precision": "month", "area": None,
        "summary": "国の登録記念物でもある鶴舞公園で、Park-PFI を使って「正面南」「秋の池」「熊沢山」の 3 つのエリアを再整備した事業です。県産のスギ・ヒノキを使った木造の飲食店や休憩所と、園路・広場を整え、2023 年 5 月に TSURUMA GARDEN が開業しました。",
        "credits": [("名古屋市", "client"), ("矢作地所", "other"), ("日比谷花壇", "other"), ("ヤハギ緑化", "other")],
        "awards": [],
        "sources": [("official", "https://www.city.nagoya.jp/jigyou/boshu/1014251/1014337/1014344.html", "鶴舞公園整備運営事業の事業者公募", "名古屋市")],
    },
    {
        "slug": "noritake-no-mori", "name_ja": "ノリタケの森", "name_en": "Noritake Garden",
        "use": "park", "other_uses": ["public_facility"], "municipality": "名古屋市西区", "address": "名古屋市西区則武新町三丁目1-36",
        "lng": 136.8805, "lat": 35.1779, "year": 2001, "on": None, "precision": "year", "area": None,
        "summary": "陶磁器メーカーの工場跡地を、緑地と文化施設に造り替えた場所です。赤レンガの旧工場建物を残しながら 2001 年に開園しました。改修の設計と施工は大成建設が担当しています。",
        "credits": [("大成建設", "architecture"), ("大成建設", "construction"), ("ノリタケ", "client")],
        "awards": [],
        "sources": [("article", "https://www.belca.or.jp/fwp/wp-content/uploads/2025/07/prize13-8.pdf", "BELCA 賞 受賞建物の紹介（ノリタケの森）", "ロングライフビル推進協会"),
                    ("official", "https://www.aichinow.pref.aichi.jp/spots/detail/12/", "ノリタケの森", "愛知県観光協会")],
    },
    {
        "slug": "oasis-21", "name_ja": "オアシス21", "name_en": "Oasis 21",
        "use": "plaza", "other_uses": ["park", "rooftop", "commercial"], "municipality": "名古屋市東区", "address": "名古屋市東区東桜一丁目11-1",
        "lng": 136.9097, "lat": 35.1711, "year": 2002, "on": "2002-09-01", "precision": "month", "area": None,
        "summary": "栄の公園とバスターミナル、地下の広場を重ねた立体型の施設です。地上 14m に架かるガラスの大屋根「水の宇宙船」（全長 106m・幅 36m）の上を歩くことができ、地上には芝生の広場「緑の大地」があります。1997 年の設計提案競技で選ばれた大林組が設計・施工し、2002 年 9 月に完成しました。",
        "credits": [("大林組", "architecture"), ("大林組", "construction")],
        "awards": [("名古屋市都市景観賞 都市景観大賞", 2003, "都市景観大賞", "https://www.city.nagoya.jp/kankou/kankouinfo/1013766/1013934/1013946.html", None)],
        "sources": [("official", "https://www.city.nagoya.jp/kankou/kankouinfo/1013766/1013934/1013946.html", "名古屋市都市景観賞 表彰作品（オアシス21）", "名古屋市"),
                    ("designer", "https://www.obayashi.co.jp/thinking/detail/project66.html", "オアシス21", "大林組")],
    },
    {
        "slug": "global-gate", "name_ja": "グローバルゲート", "name_en": "Global Gate",
        "use": "redevelopment", "other_uses": ["commercial", "office", "rooftop"], "municipality": "名古屋市中村区", "address": "名古屋市中村区平池町四丁目60-12",
        "lng": 136.8826, "lat": 35.1617, "year": 2017, "on": "2017-03-01", "precision": "month", "area": None,
        "summary": "ささしまライブ 24 地区の中心になる複合施設です。高層タワー、オフィス棟、低層の商業棟で構成され、低層棟の屋上には歩いて回れる庭園があります。設計は竹中工務店で、2017 年 3 月に完成しました。",
        "credits": [("竹中工務店", "architecture")],
        "awards": [(MACHINAMI, 2018, "第4回 建築物・工作物部門", MACHINAMI_BASE + "1034442/1034443/1013910.html", None)],
        "sources": [("award", MACHINAMI_BASE + "1034442/1034443/1013910.html", "【まちなみデザイン賞】グローバルゲート", "名古屋市")],
    },
    {
        "slug": "dai-nagoya-building", "name_ja": "大名古屋ビルヂング", "name_en": "Dai Nagoya Building",
        "use": "office", "other_uses": ["commercial", "rooftop"], "municipality": "名古屋市中村区", "address": "名古屋市中村区名駅三丁目28-12",
        "lng": 136.8844, "lat": 35.1719, "year": 2015, "on": "2015-10-31", "precision": "day", "area": None,
        "summary": "名古屋駅前の建て替えで 2015 年 10 月に完成した複合ビルです。低層部は建て替え前のビルの面影を残し、低層部の屋上には庭園「スカイガーデン」があります。設計は三菱地所設計です。",
        "credits": [("三菱地所設計", "architecture"), ("三菱地所", "client")],
        "awards": [(MACHINAMI, 2016, "第3回", MACHINAMI_BASE + "1034446/1013925.html", None)],
        "sources": [("award", MACHINAMI_BASE + "1034446/1013925.html", "【まちなみデザイン賞】大名古屋ビルヂング", "名古屋市")],
    },
    {
        "slug": "daini-nagoya-sanco-building", "name_ja": "第2名古屋三交ビル", "name_en": None,
        "use": "office", "other_uses": ["plaza"], "municipality": "名古屋市中村区", "address": "名古屋市中村区名駅三丁目",
        "lng": 136.8870, "lat": 35.1732, "year": 2024, "on": "2024-02-01", "precision": "month", "area": None,
        "summary": "名駅三丁目に 2024 年 2 月に完成したオフィス・店舗ビルです。敷地内の歩道に高木を並べて木陰をつくり、建物の中にも屋内型の公開空地「MUQUA」を設けています。設計は竹中工務店名古屋支店です。",
        "credits": [("竹中工務店", "architecture"), ("三交不動産", "client")],
        "awards": [(MACHINAMI, 2025, "第7回 ウォーカブル部門", MACHINAMI_BASE + "1040610/1040613/1040340.html", None)],
        "sources": [("award", MACHINAMI_BASE + "1040610/1040613/1040340.html", "【まちなみデザイン賞】第2名古屋三交ビル", "名古屋市")],
    },
    {
        "slug": "vermicular-village", "name_ja": "バーミキュラ ビレッジ", "name_en": "Vermicular Village",
        "use": "waterfront", "other_uses": ["commercial"], "municipality": "名古屋市中川区", "address": "名古屋市中川区舟戸町",
        "lng": 136.8780, "lat": 35.1512, "year": 2019, "on": "2019-11-01", "precision": "month", "area": None,
        "summary": "中川運河の「にぎわいゾーン」に 2019 年 11 月に完成した、店舗・事務所棟と飲食棟からなる施設です。運河を眺める立体的な空間をもち、運河側から見た水辺の景観もつくっています。設計は山本堀アーキテクツです。",
        "credits": [("山本堀アーキテクツ", "architecture"), ("愛知ドビー", "client")],
        "awards": [(MACHINAMI, 2020, "第5回 建築物・工作物部門", MACHINAMI_BASE + "1034438/1034439/1013927.html", None)],
        "sources": [("award", MACHINAMI_BASE + "1034438/1034439/1013927.html", "【まちなみデザイン賞】中川運河にぎわいゾーンの建築物群 バーミキュラ ビレッジ", "名古屋市")],
    },
    {
        "slug": "chunichi-building", "name_ja": "中日ビル 屋上広場", "name_en": "Chunichi Building Rooftop Plaza",
        "use": "rooftop", "other_uses": ["commercial", "office", "wall_greening"], "municipality": "名古屋市中区", "address": "名古屋市中区栄四丁目1-1",
        "lng": 136.9100, "lat": 35.1685, "year": 2023, "on": "2023-07-01", "precision": "month", "area": None,
        "summary": "栄の中日ビルの建て替えで、7 階に設けられた屋上広場です。栄の街並みを見渡すことができ、壁面緑化があります。建物は 2023 年 7 月に竣工し、2024 年 4 月に全面開業しました。設計は竹中工務店です。",
        "credits": [("竹中工務店", "architecture")],
        "awards": [],
        "sources": [("official", "https://chunichi-bldg.co.jp/company/pdf/release20240111.pdf", "中日ビル 開業に関するお知らせ", "中部日本ビルディング")],
    },
    {
        "slug": "hisaya-odori-garden-flarie", "name_ja": "久屋大通庭園フラリエ", "name_en": "Hisaya-odori Garden Flarie",
        "use": "park", "other_uses": [], "municipality": "名古屋市中区", "address": "名古屋市中区大須四丁目4-1",
        "lng": 136.9086, "lat": 35.1610, "year": 2014, "on": "2014-09-01", "precision": "month", "area": None,
        "summary": "久屋大通公園の南の端にある、入園無料の庭園です。花と緑、水辺をテーマにした 6 つの庭を中心に構成され、2014 年 9 月にリニューアルオープンしました。",
        "credits": [("名古屋市", "client")],
        "awards": [],
        "sources": [("official", "https://www.city.nagoya.jp/kurashi/douro/1014853/1014854/1014857.html", "久屋大通庭園フラリエ", "名古屋市")],
    },
]


def party_slug(name: str) -> str:
    return "p-" + hashlib.sha1(name.encode("utf-8")).hexdigest()[:10]


def main() -> None:
    status = "draft" if "--draft" in sys.argv else "published"
    added, skipped = [], []
    with psycopg.connect(db_url()) as conn, conn.cursor() as cur:
        for p in PROJECTS:
            cur.execute("select 1 from projects where slug = %s", (p["slug"],))
            if cur.fetchone():
                skipped.append(p["name_ja"])
                continue
            cur.execute(
                """insert into projects (slug, name_ja, name_en, use_category, other_uses, prefecture, municipality, address_ja,
                       location, completed_year, completed_on, completed_precision, site_area_m2, summary_ja, status, published_at)
                   values (%s, %s, %s, %s, %s::project_use[], '愛知県', %s, %s,
                       st_setsrid(st_makepoint(%s, %s), 4326)::geography, %s, %s, %s, %s, %s, %s,
                       case when %s = 'published' then now() end)
                   returning id""",
                (p["slug"], p["name_ja"], p["name_en"], p["use"], p["other_uses"], p["municipality"], p["address"],
                 p["lng"], p["lat"], p["year"], p["on"], p["precision"], p["area"], p["summary"], status, status),
            )
            pid = cur.fetchone()[0]
            for i, (name, role) in enumerate(p["credits"]):
                cur.execute("select id from parties where name_ja = %s", (name,))
                row = cur.fetchone()
                if not row:
                    cur.execute("insert into parties (slug, name_ja) values (%s, %s) returning id", (party_slug(name), name))
                    row = cur.fetchone()
                cur.execute("insert into project_credits (project_id, party_id, role, sort_order) values (%s, %s, %s, %s)", (pid, row[0], role, i))
            for name, year, category, url, program in p["awards"]:
                cur.execute(
                    """insert into project_awards (project_id, award_name, award_year, category, source_url, program_id)
                       values (%s, %s, %s, %s, %s, (select id from award_programs where slug = %s))""",
                    (pid, name, year, category, url, program),
                )
            for kind, url, title, publisher in p["sources"]:
                cur.execute("insert into sources (project_id, kind, url, title, publisher, accessed_on) values (%s, %s, %s, %s, %s, %s)",
                            (pid, kind, url, title, publisher, ACCESSED))
            added.append(p["name_ja"])
    print(f"追加 {len(added)} 件（{'下書き' if status == 'draft' else '公開'}）")
    for n in added:
        print("  +", n)
    if skipped:
        print(f"すでにあるため何もしなかった {len(skipped)} 件")
        for n in skipped:
            print("  -", n)


if __name__ == "__main__":
    main()
