# base44 叩き台用プロンプト

base44 は「画面と項目を確かめる場」として使う（本番は Next.js + Supabase）。
エンティティ名・項目名は Supabase のスキーマ（`supabase/migrations/`）と同じにしてあるので、書き出したコードを移植するときに対応づけが楽になる。

## 進め方

1. base44 で新しいアプリを作り、下の「プロンプト本文」をそのまま貼る
2. できあがったら、各エンティティに `data/base44_sample/` の CSV をインポートする（樹種 → 物件 → 植栽・構成要素の順）
3. 画面を触って、項目の過不足・検索軸・一覧の見せ方をメモする（[確認チェックリスト](#確認チェックリスト)）
4. 決まった変更は、こちら（Claude）に伝えてスキーマへ反映する。base44 側だけで項目を増やさない

---

## プロンプト本文

```
ランドスケープ（造園・外構・公園・広場）の事例データベースサイト「Landscape Database」を作ってください。
対象は日本の竣工済みのランドスケープ作品で、まず関西から始めます。tecture.jp の外構・ランドスケープ版のようなサイトです。

## データ（エンティティ）

Project（物件）
- slug（英小文字・数字・ハイフン、URLに使う）
- parent_slug（親物件の slug。再開発の中の広場などに使う。空でもよい）
- name_ja（必須）、name_en
- use_category（必須、選択式）: park 公園 / plaza 広場 / greenway 緑道 / street 街路 / waterfront 水辺 / commercial 商業施設外構 / office オフィス外構・公開空地 / housing 集合住宅外構 / public_facility 公共建築外構 / education 学校・キャンパス / healthcare 病院・福祉 / rooftop 屋上緑化 / wall_greening 壁面緑化 / redevelopment 再開発 / other
- prefecture（必須）、municipality、address_ja
- latitude、longitude
- completed_year、site_area_m2
- summary_ja、summary_en
- summary_en_status: none / machine_draft / reviewed
- designers（設計者。カンマ区切りの文字列でよい）
- awards（受賞歴。テキスト）
- source_urls（出典URL。改行区切り）
- status: draft / published
- private_notes（所感・評価・ディテールメモ。管理者だけが見られる）
- rating（1〜5。管理者だけが見られる）

Species（樹種マスタ）
- slug、name_ja、name_en、scientific_name、family_ja
- growth_form: tree / shrub / ground_cover / climber / grass / fern / aquatic / bamboo / other
- evergreen（true/false）
- aliases（表記ゆれ。カンマ区切り。例: 欅,けやき）

Planting（物件と樹種の紐づけ）
- project_slug、species_slug
- layer: tall_tree 高木 / mid_tree 中木 / shrub 低木 / ground_cover 地被 / climber つる / other

Component（構成要素）
- project_slug
- kind: paving 舗装 / furniture ファニチャー / lighting 照明 / water 水景 / play 遊具 / greening_system 屋上・壁面緑化 / wall_fence 擁壁・柵 / other
- category_ja（一般分類。例: インターロッキングブロック、洗い出し、ウッドデッキ）
- product_name、maker_name（任意）

Photo（写真）
- project_slug、image、taken_on（撮影日）、caption_ja、caption_en、is_cover
- people_checked（人物の写り込み確認済み）。false の写真は公開画面に出さない

## 画面

1. トップ／一覧
   - 初期表示は写真グリッド（カバー写真＋名称＋所在地＋竣工年＋用途）
   - 「地図」タブに切り替えると、物件をピンで表示（ピンをクリックで概要カード）
   - 絞り込み: 用途、都道府県、竣工年（範囲）、樹種、舗装材（Component の paving の category_ja）、設計者
   - キーワード検索（名称・設計者・樹種名。樹種は aliases でもヒットさせる。「欅」で「ケヤキ」が出る）
   - status が published の物件だけ表示
2. 物件詳細
   - 写真ギャラリー、基本情報、設計者、受賞歴、出典リンク
   - 植栽リスト（高木・中木・低木・地被ごとに樹種名と学名）
   - 構成要素リスト（舗装・ファニチャー・照明…ごと）
   - 親物件があればパンくず、子物件があれば一覧と小さな地図
   - 写真には「© Landscape Database」を表示
3. 樹種ページ（/species/:slug）
   - 和名・学名・英名・科名、その樹種を使っている物件の一覧
4. 設計者ページ
   - designers に名前が含まれる物件の一覧
5. 管理画面（ログインした管理者だけ）
   - 物件の登録・編集（下書き／公開の切り替え）
   - private_notes と rating はここでだけ表示・編集
   - 写真のアップロード（撮影日を必須、人物確認のチェックボックス）

## 言語
- 画面右上で 日本語 / English を切り替え
- English のとき、summary_en_status が reviewed でない物件は本文を出さず、名称・所在地・設計者・樹種（学名）・構成要素の分類だけを英語で表示

## デザイン
- 写真が主役の、余白の多い落ち着いたデザイン。白背景、文字は濃いグレー、アクセントは深い緑
- スマートフォンでも一覧・地図・詳細が見やすいこと

## 実装上の指定
- アプリは公開（ログインなしで閲覧可）。管理画面だけ admin ロールでログイン必須
- エンティティ間の紐づけはすべて slug で行う（ID は使わない）。CSV インポート前提
- private_notes と rating は Project に持たせず、別エンティティ ProjectNote（project_slug, private_notes, rating）に分ける
- アクセス制御（データ側で制限すること。画面で隠すだけにしない）
  - Project: 一般ユーザーは status=published のみ読める。作成・編集・削除は admin のみ
  - ProjectNote: admin だけが読み書きできる
  - Photo: 一般ユーザーは people_checked=true のみ読める。書き込みは admin のみ
  - Species / Planting / Component: 誰でも読める。書き込みは admin のみ
- 写真は公開URLで保存する（公開サイトのため）
- 地図は Leaflet + OpenStreetMap を使う（APIキー不要）
- ルート: / , /projects/:slug , /species/:slug , /designers/:name , /admin
- 言語の切り替えはブラウザに保存し、再訪時も維持する
- 一覧は50件ずつ表示し「もっと見る」で続きを読み込む。絞り込みと検索はサーバー側で行う
```

### 分けて貼る場合（base44 の提案）

1回で全部入れると細部が抜けやすいので、上の本文を3回に分けて貼る。

1. 「データ（エンティティ）」「実装上の指定」と、画面の「5. 管理画面」。この段階で CSV をインポートする
2. 画面の「1. トップ／一覧」「2. 物件詳細」
3. 画面の「3. 樹種ページ」「4. 設計者ページ」と「言語」「デザイン」

---

## 確認チェックリスト

触りながら、次の点をメモしておく。

- [x] 一覧で最初に目に入れたい情報は足りているか（写真・名称・所在地・竣工年・用途のほかに要るもの）
- [x] 絞り込みの軸は足りているか、多すぎないか
- [x] 物件詳細で、植栽と構成要素の見せ方は使いやすいか
- [x] 1件の登録にかかる時間（目標: 現地写真を除いて15分以内）
- [x] 管理画面で、入力が面倒な項目はどれか（必須を減らす候補）
- [x] 英語表示で違和感のある箇所
- [x] スマホでの地図・写真の見え方

## 書き出しについて（再掲）

- GitHub への書き出しは Builder プラン以上（1か月だけ課金する計画）
- 書き出しは使い捨てのリポジトリに対して行う（一度つなぐと Base44 側に戻せないため）
- 書き出したコードのうち、使うのは画面部分だけ。データの読み書きは Supabase に差し替える
