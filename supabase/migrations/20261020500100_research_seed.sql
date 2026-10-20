-- 研究の最初のデータ: 手法 11 件と、各手法の代表的な論文 16 件（国内外）
-- 書誌情報は Crossref・J-STAGE・USDA Treesearch で照合済み。要約・解説は抄録などからの下書き（draft）で、確認後に reviewed にする

insert into methods (slug, name_ja, name_en, sort_order, summary_ja, summary_en, body_ja) values
('scenic-beauty', '景観評価の心理実験（SBE法・SD法）', 'Scenic beauty and impression rating', 10,
 '写真やスライドを見せて、人がその景観をどれだけ美しい・好ましいと感じるかを数値にする方法。評点を集計して景観どうしを比べたり、何が評価を左右するかを調べたりする。',
 'Showing photos or slides and turning people''s judgements of beauty or preference into numbers, to compare landscapes and find what drives the ratings.',
 '何を測るか
- 景観の美しさ・好ましさ（SBE法: 評点を回答者ごとに標準化して、景観どうしを比べる）
- 景観の印象の中身（SD法: 「開放的な—閉鎖的な」などの対になった形容詞で評価し、因子分析で印象の軸を取り出す）

進め方
- 評価する景観を写真で用意する（撮り方・季節・天候をそろえる）
- 回答者に見せて評点や形容詞対で答えてもらう
- 評点と、写っている要素（緑の量、建物、水面など）との関係を分析する

設計での使い方
- 計画案の複数の代替案を、完成予想図で比べる
- 竣工後の写真で、整備の前後を比べる

注意点
- 写真の撮り方（画角・色・季節）で結果が変わる。モノクロとカラーでも評価は変わる
- 回答者の属性（専門家か一般の人か、地元の人か）で評価が分かれることがある'),

('restorative-environments', '回復環境・ストレス低減の研究', 'Restorative environments and stress recovery', 20,
 '自然や緑のある環境が、疲れやストレスからの回復をどれだけ助けるかを調べる研究の系統。生理指標（心拍・血圧など）や回復の早さ、注意力の検査で効果を測る。',
 'Research on how natural and green settings help people recover from stress and mental fatigue, measured with physiological indicators, recovery outcomes or attention tests.',
 '代表的な二つの理論
- ストレス低減理論（Ulrich）: 自然の景色は、ストレスを受けたときの心身の反応を早く落ち着かせる
- 注意回復理論（Kaplan）: 意識して集中し続けると疲れる「方向づけられた注意」を、自然の環境が休ませる。「日常から離れる」「広がり」「魅了」「目的との合致」の四つの性質が回復を助ける

進め方
- 自然と都市の環境（実際の場所、映像、写真、窓からの眺め）を比べる
- 回復を、生理指標・気分の質問紙・注意力の課題・入院日数などで測る

設計での使い方
- 病院・福祉施設の庭、オフィスの緑、街なかの小さな緑地の効果を説明する根拠になる

注意点
- 自然の「どんな質」が効くのか（樹木の量、水、見通しなど）は研究によって結果が分かれる'),

('behavior-mapping', '行動観察・行動マッピング', 'Behaviour observation and behaviour mapping', 30,
 '公園や広場で、人がどこで何をしているかを観察して図面に記録する方法。場所のつくり（舗装、遊具、樹木、ベンチなど）と行動との関係を直接つかめる。',
 'Observing where people are and what they do in parks and plazas and recording it on a plan, to link physical settings directly with behaviour.',
 '何を記録するか
- 人の位置、人数、年齢層、行動の種類（座る、遊ぶ、歩く、運動するなど）
- その場所の特徴（舗装材、日なた・日陰、植栽、遊具、ベンチ）

進め方
- 対象地を区画に分け、決めた時刻に巡回して、見えた行動を図面に記録する
- 平日・休日、季節、時間帯を変えて繰り返す
- 区画の特徴ごとに、行動の量や種類を集計する

設計での使い方
- 竣工後の利用実態を確かめる（事後評価）
- どの舗装・植栽・遊具がよく使われるかを、次の設計に生かす

注意点
- 観察者によって記録がぶれないよう、行動の分類を事前に決めておく
- 人の顔や個人が分かる記録は残さない'),

('green-view', '緑視率', 'Green view ratio', 40,
 '人の目線の写真の中に、緑（樹木・草など）がどれだけの割合で写っているかを測る指標。街路や公園の「見える緑」の量を比べるのに使う。',
 'The share of greenery visible in an eye-level photograph, used to compare how much green people actually see along streets and in parks.',
 '何を測るか
- 目線の高さで撮った写真の画素のうち、植物が占める割合

測り方の変化
- 以前は写真の緑の部分を手でなぞって面積を出していた
- 色の範囲で緑を自動で取り出す方法、さらにストリートビュー画像と画像認識で広い範囲をまとめて測る方法へ広がっている

設計での使い方
- 街路樹の配置や植え方を変えたときの「見える緑」の変化を比べる
- 地区ごとの緑の見え方を地図にする

注意点
- 撮る向き・高さ・季節（落葉）で値が変わる
- 緑の量は測れるが、緑の質（樹種、手入れ、配置の良さ）は別に評価が要る'),

('street-imagery', 'ストリートビュー画像と機械学習', 'Street-level imagery and machine learning', 50,
 'Google ストリートビューなどの街路画像を大量に集め、画像認識や機械学習で、緑の量や「安全そう」「美しい」といった印象を広い範囲で推定する方法。',
 'Collecting large numbers of street-level images and using image recognition and machine learning to estimate greenery or perceived qualities across whole cities.',
 '何ができるか
- 都市全体の街路の緑の量（緑視率）を地図にする
- 人の評価を学習させたモデルで、街路の印象（安全そう、にぎやか、美しいなど）を推定する

進め方
- 調査地点ごとに複数の向き・角度の画像を取得する
- 画像を、緑・空・建物などに塗り分ける（セマンティックセグメンテーション）
- 人の評価データで学習したモデルで、印象を推定する

注意点
- 画像の撮影時期がそろっていない
- 学習に使った評価データの地域・文化と、対象の都市が違うと、推定がずれることがある
- 画像の利用条件（サービスの規約）を確かめる'),

('space-syntax', 'スペースシンタックス', 'Space syntax', 60,
 '街路や空間のつながり方（配置の形）を数値にして、人の流れやにぎわいを説明・予測する方法。「統合度」の高い街路ほど人が通りやすいとされる。',
 'Quantifying how streets and spaces are connected to explain and predict pedestrian movement; well-integrated streets tend to carry more people.',
 '何を測るか
- 街路網を線（軸線）や区間に置き換え、ほかの全ての街路からどれだけ少ない曲がりで行けるか（統合度）などを計算する

進め方
- 街路網の図をつくる
- 統合度などの指標を計算する
- 実際の歩行者数の観測と比べる

設計での使い方
- 広場や公園の入口・動線を、まわりの街路とのつながりから考える
- 再開発で新しい通路をつくったとき、人の流れがどう変わるかを比べる

注意点
- 配置の形だけを見るので、店舗・駅などの目的地の影響は別に考える必要がある'),

('landscape-metrics', 'ランドスケープメトリクス', 'Landscape metrics', 70,
 '土地利用図や植生図から、緑地のまとまりの大きさ・形・分散・つながりなどを数値にする方法。景観生態学で広く使われる。',
 'Quantifying the size, shape, dispersion and connectivity of patches (such as green spaces) from land-cover maps; widely used in landscape ecology.',
 '何を測るか
- パッチ（同じ土地利用のまとまり）の数・面積・形の複雑さ
- パッチどうしの距離やつながり、土地利用の多様さ

進め方
- 航空写真や衛星画像から土地利用図・植生図をつくる
- FRAGSTATS などのソフトで指標を計算する
- 年代ごとや地区ごとに比べる

設計での使い方
- 緑のネットワーク（生きものの移動経路）を考える
- 開発の前後で緑地の分断がどう変わるかを示す

注意点
- 地図の解像度や分類の仕方で値が大きく変わる
- 指標どうしが似た意味を持つことが多いので、目的に合うものを選ぶ'),

('ppgis', '参加型GIS（PPGIS）', 'Public participation GIS (PPGIS)', 80,
 '住民や利用者に、地図の上で「好きな場所」「危ない場所」「使っている場所」などを示してもらい、その空間データを計画に生かす方法。',
 'Asking residents and users to mark places on a map (favourite, unsafe, used) and using the resulting spatial data in planning.',
 '進め方
- 紙の地図やウェブ地図で、場所に印をつけてもらう
- 印の分布を地図にし、価値の高い場所や課題のある場所を見つける

設計での使い方
- 公園の再整備で、利用者がどこを大事にしているかを把握する
- 住民参加のワークショップの記録を、地図として残す

注意点
- 回答者が偏りやすい（参加率、年代、ネットに慣れているか）
- 印の位置の正確さや、回答をどこまで計画に反映するかを事前に決めておく'),

('microclimate-simulation', '温熱環境シミュレーション', 'Microclimate simulation', 90,
 '建物・舗装・樹木・水面を含む街区の 3D モデルで、気温・風・日射・表面温度などを計算し、暑さの感じ方を予測する方法。ENVI-met がよく使われる。',
 'Simulating air temperature, wind, radiation and surface temperature in a 3D model of buildings, paving, trees and water to predict thermal comfort, often with ENVI-met.',
 '進め方
- 対象地の建物・地表面（舗装材・芝生・水面）・樹木を 3D モデルにする
- 気象条件を与えて、時間ごとの気温・風・平均放射温度などを計算する
- 暑さ指数（PET、UTCI など）で、歩く人の感じ方を比べる

設計での使い方
- 樹木の位置や本数、舗装材、ミスト・水面の効果を、整備前に比べる
- 夏の日陰の連続（クールスポット）を計画する

注意点
- 樹木の葉の量や地表面の性質など、入力の仮定で結果が変わる。実測で確かめるのが望ましい'),

('urban-forest-ecosystem-services', '都市樹木の生態系サービス評価', 'Urban forest ecosystem services assessment', 100,
 '都市の樹木を標本調査し、本数・樹種・大きさなどから、大気汚染物質の除去や炭素の貯留・吸収といった働きを推定する方法。i-Tree（旧 UFORE）が代表的。',
 'Sampling urban trees and estimating functions such as air pollution removal and carbon storage from tree counts, species and sizes; i-Tree (formerly UFORE) is the best-known tool.',
 '進め方
- 対象地域に調査区を無作為に置き、樹木の樹種・幹の太さ・樹高・樹冠・健全度を記録する
- モデルで、地域全体の樹木の構成と、その働き（大気浄化、炭素の貯留・吸収など）を推定する

設計での使い方
- 街路樹や公園樹の価値を、数値や金額で示す
- 樹種の選び方や更新計画の根拠にする

注意点
- 推定に使う係数は地域の気候や樹種によって違う。日本の都市に使うときは前提を確かめる'),

('research-through-design', 'デザインによる研究（Research through Design）', 'Research through designing', 110,
 '設計する行為そのものを研究の方法として使い、デザインを通じて新しい知見を得る考え方。ランドスケープアーキテクチャーの研究と実務をつなぐ方法として議論されている。',
 'Using the act of designing itself as a research method to generate new knowledge, discussed as a bridge between research and practice in landscape architecture.',
 '考え方
- 設計案をつくり、比べ、評価する過程で、何が効くか・なぜ効くかの知見を得る
- 研究の問いを立て、設計の過程と判断の理由を記録して、ほかの人が検証できるようにする

設計での使い方
- コンペ案や実施設計の検討過程を、知見として残す
- 事例データベースの事例を、設計の判断と結果の記録として読む

注意点
- 個人の経験の記述にとどまらないよう、問い・方法・評価をはっきりさせる');

insert into papers (slug, kind, title, title_ja, authors, year, venue, volume, issue, pages, doi, url, language, summary_ja, summary_en) values
('daniel-boster-1976-sbe', 'report',
 'Measuring landscape esthetics: the scenic beauty estimation method', '景観の美しさの測定: SBE法',
 'Daniel, T. C.; Boster, R. S.', 1976, 'USDA Forest Service Research Paper RM-167', null, null, '66 p.', null,
 'https://research.fs.usda.gov/treesearch/20911', 'en',
 '一般の人の知覚的な判断にもとづいて景観の美しさを数値にする「SBE法（Scenic Beauty Estimation）」を示した報告書。森林景観のスライドへの評点を回答者ごとに標準化して比べる方法で、利用者・利害関係者・専門家など多くのグループでの実験で妥当性を確かめた。景観評価の心理実験の基本的な方法として、その後の研究で広く使われている。',
 'Introduces the Scenic Beauty Estimation (SBE) method, which scales public perceptual judgements of landscape slides; validated with user, interest and professional groups.'),

('saito-1984-photo-landscape-evaluation', 'article',
 '写真による景観評価特性と既存評価モデルとの関連について', null,
 '斎藤 馨', 1984, '造園雑誌', '48', '5', '246-251', '10.5632/jila1934.48.5_246', null, 'ja',
 '上高地の景観写真（夏・秋の各5景を、モノクロとカラーで計20枚）を100名に見せ、順位法とSD法による評価実験を行い、海外の景観嗜好予測モデル（Shafer, 1969）の得点と比べた研究。モノクロとカラーの写真で評価に差があること、海外の既存モデルをそのまま日本に当てはめるには問題があることを示した。',
 'Photo-based evaluation experiment (ranking and SD method) with 100 participants on Kamikochi landscapes; shows differences between monochrome and colour photos and limits of applying an existing foreign preference model in Japan.'),

('ulrich-1984-window-view', 'article',
 'View Through a Window May Influence Recovery from Surgery', '窓からの眺めが手術後の回復に影響する可能性',
 'Ulrich, R. S.', 1984, 'Science', '224', '4647', '420-421', '10.1126/science.6143402', null, 'en',
 'ペンシルベニア州郊外の病院で1972〜1981年に胆のう摘出手術を受けた患者の記録を調べ、窓から自然の景色が見える病室の患者23名と、レンガの壁が見える病室の患者23名を比べた研究。自然が見える病室の患者は、術後の入院日数が短く、看護記録の否定的な記述が少なく、強い鎮痛剤の使用も少なかった。緑の眺めの効果を示した研究として広く引用されている。',
 'Hospital records (1972–1981) show that 23 surgical patients with a window view of nature had shorter stays, fewer negative nurse notes and fewer strong analgesics than 23 matched patients facing a brick wall.'),

('ulrich-1991-stress-recovery', 'article',
 'Stress recovery during exposure to natural and urban environments', '自然環境と都市環境に触れているときのストレス回復',
 'Ulrich, R. S.; Simons, R. F.; Losito, B. D.; Fiorito, E.; Miles, M. A.; Zelson, M.', 1991, 'Journal of Environmental Psychology', '11', '3', '201-230', '10.1016/S0272-4944(05)80184-7', null, 'en',
 '被験者にストレスを与える映像を見せたあと、自然の環境と都市の環境の映像を見せ、心拍などの生理指標と気分の自己評価で回復の様子を比べた実験研究。自然の映像のほうが回復が早く、より大きかったことを報告し、自然の景色がストレスを和らげるとする「ストレス低減理論」の代表的な実証研究となった。',
 'Experiment comparing recovery after a stressful film while viewing natural versus urban environments, using physiological measures and self-reports; recovery was faster and more complete with nature.'),

('kaplan-1995-restorative-benefits', 'article',
 'The restorative benefits of nature: Toward an integrative framework', '自然の回復効果: 統合的な枠組みに向けて',
 'Kaplan, S.', 1995, 'Journal of Environmental Psychology', '15', '3', '169-182', '10.1016/0272-4944(95)90001-2', null, 'en',
 '意識して集中し続けることで疲れる「方向づけられた注意」の疲労と、自然環境がそこから回復させる仕組みを整理し、ストレスの研究と注意の研究をつなぐ枠組みを示した論文。回復をもたらす環境の性質として「日常から離れること」「広がり」「魅了」「目的との合致」を挙げた「注意回復理論」の代表的な論文。',
 'Integrates stress and attention research into a framework of directed-attention fatigue and its recovery in natural environments (attention restoration theory).'),

('cosco-2010-behavior-mapping', 'article',
 'Behavior Mapping: A Method for Linking Preschool Physical Activity and Outdoor Design', '行動マッピング: 幼児の身体活動と屋外空間のデザインをつなぐ方法',
 'Cosco, N. G.; Moore, R. C.; Islam, M. Z.', 2010, 'Medicine & Science in Sports & Exercise', '42', '3', '513-519', '10.1249/MSS.0b013e3181cea27a', null, 'en',
 '行動場面とアフォーダンスの理論にもとづく直接観察の方法として「行動マッピング」を紹介し、ノースカロライナ州の保育施設2か所の園庭で、子どもの身体活動の強さと場所の特徴を記録した研究。小道・遊具・広場といった場所の種類によって活動量が違い、同じ種類でも、円を描く小道か直線の小道か、地面がアスファルト・締め固めた土・ウッドチップ・砂のどれかによって活動量が変わることを示した。',
 'Introduces behaviour mapping as a direct-observation method and shows, in two preschool outdoor areas, that activity levels differ by setting type and by attributes such as path shape and ground surface.'),

('yoshida-1990-yoyogi-park-use', 'article',
 '都市内森林公園の植生の形態と利用者の行動に関する調査研究 代々木公園における利用実態調査から', null,
 '吉田 直隆; 難波 良平; 片谷 克也', 1990, '造園雑誌', '54', '2', '123-133', '10.5632/jila1934.54.123', null, 'ja',
 '代々木公園で通年の利用実態調査を行い、樹種・立木密度・林の状態・芝生地などの植生の形態を類型化して、植生の形態と利用者の行動との関係を調べた研究。芝生広場について、利用者が最も好む形態と広さも明らかにした。',
 'Year-round use survey of Yoyogi Park relating vegetation types (tree density, stand condition, lawns) to visitor behaviour, including preferred lawn form and size.'),

('tonosaki-2010-green-view-leaf-color', 'article',
 'Research on the New Measurement Method of the Ratio of Vertical Green Coverage with Leaf Colors', '葉の色を用いた新しい緑視率の測定方法に関する研究',
 'Tonosaki, K.', 2010, 'Landscape Research Japan Online', '3', null, '26-31', '10.5632/jilaonline.3.26', null, 'en',
 'これまで研究者が手作業で求めていた緑視率を、写真の葉の色から自動で求める方法を示した研究。都市公園で撮った写真の葉の色を CIE1976 u''v'' 色度図の上で調べて計算に使う色の範囲を定め、1年間の現地での検証を行った。23枚の写真でこの方法の値と手作業の値を比べると、相関係数 0.981 と非常に高い一致を示した。',
 'Proposes measuring the green view ratio automatically from leaf colours in the CIE1976 u''v'' chromaticity space; validated over a year, correlating 0.981 with manual measurements.'),

('li-2015-street-view-green-view-index', 'article',
 'Assessing street-level urban greenery using Google Street View and a modified green view index', 'Google ストリートビューと改良した緑視指数による街路レベルの都市の緑の評価',
 'Li, X.; Zhang, C.; Li, W.; Ricard, R.; Meng, Q.; Zhang, W.', 2015, 'Urban Forestry & Urban Greening', '14', '3', '675-685', '10.1016/j.ufug.2015.06.006', null, 'en',
 'Google ストリートビューの画像を使って、街路で人が見る緑の量を評価する方法を示した研究。一つの地点で水平方向・上下方向の角度を変えた複数の画像を取得して緑の割合を求める「改良した緑視指数（modified green view index）」を提案した。ストリートビュー画像で都市の緑を広い範囲で測る研究の先駆けとして、多く引用されている。',
 'Proposes a modified green view index computed from multiple Google Street View images taken at different horizontal and vertical angles, an early and widely cited approach to measuring street-level greenery.'),

('zhang-2018-perception-machine-learning', 'article',
 'Measuring human perceptions of a large-scale urban region using machine learning', '機械学習による大規模な都市域での人の知覚の測定',
 'Zhang, F.; Zhou, B.; Liu, L.; Liu, Y.; Fung, H. H.; Lin, H.; Ratti, C.', 2018, 'Landscape and Urban Planning', '180', null, '148-160', '10.1016/j.landurbplan.2018.08.020', null, 'en',
 '街路画像に対する人の評価を大量に学習させた深層学習モデルで、街路の景観を人がどう感じるかを予測する方法を示した研究。「安全」「にぎやか」「美しい」「豊か」「憂うつ」「退屈」の6つの知覚を高い精度で予測し、北京と上海を対象に、知覚を都市全体の地図として示した。',
 'Deep-learning model trained on human ratings of street-level imagery predicts six perceptions (safe, lively, beautiful, wealthy, depressing, boring), mapped across Beijing and Shanghai.'),

('hillier-1993-natural-movement', 'article',
 'Natural movement: or, configuration and attraction in urban pedestrian movement', '自然な動き: 都市の歩行者の動きにおける配置と誘引',
 'Hillier, B.; Penn, A.; Hanson, J.; Grajewski, T.; Xu, J.', 1993, 'Environment and Planning B: Planning and Design', '20', '1', '29-66', '10.1068/b200029', null, 'en',
 '歩行者や車の動きは、店舗などの目的地（誘引する用途）への行き来で説明されてきたが、この論文は、街路網の配置そのものが動きの主な生み出し手だとする「配置の考え方」を実証的に示した。動きの量と最も強く対応するのはスペースシンタックスの「統合度」で、店舗は配置が生む「自然な動き」を利用する場所に立地し、動きをさらに増やすと論じた。使われる都市空間をつくるには、その空間自体の性質よりも、都市全体とのつながり方が重要だとしている。',
 'Argues that the configuration of the urban grid is the primary generator of movement; space syntax integration best correlates with pedestrian flows, and retail locates to exploit this natural movement.'),

('mcgarigal-marks-1995-fragstats', 'report',
 'FRAGSTATS: spatial pattern analysis program for quantifying landscape structure', 'FRAGSTATS: 景観構造を数値化する空間パターン解析プログラム',
 'McGarigal, K.; Marks, B. J.', 1995, 'USDA Forest Service General Technical Report PNW-GTR-351', null, null, '122 p.', null,
 'https://research.fs.usda.gov/treesearch/3064', 'en',
 '景観の構造（パッチの面積・形・数・配置など）を数値にする多数のランドスケープメトリクスを計算するプログラム FRAGSTATS の説明書。ベクター版とラスター版があり、景観生態学でランドスケープメトリクスを使う研究の標準的な道具となった。その後、版を重ねて現在も使われている。',
 'Documentation of FRAGSTATS, a program computing a comprehensive set of landscape metrics (vector and raster versions), which became a standard tool in landscape ecology.'),

('brown-kytta-2014-ppgis', 'article',
 'Key issues and research priorities for public participation GIS (PPGIS): A synthesis based on empirical research', '参加型GIS（PPGIS）の主な課題と研究の優先事項: 実証研究にもとづく整理',
 'Brown, G.; Kyttä, M.', 2014, 'Applied Geography', '46', null, '122-136', '10.1016/j.apgeog.2013.11.004', null, 'en',
 'それまでの参加型GIS（PPGIS）の実証研究を整理し、主な課題と今後の研究の優先事項をまとめた論文。参加者の集め方と参加率、得られる空間データの質と位置の正確さ、結果を実際の計画にどう生かすかといった論点を扱っている。PPGIS を計画に使うときの手引きとして広く参照されている。',
 'Synthesises empirical PPGIS research into key issues and research priorities, including participant recruitment and response, spatial data quality and the effectiveness of PPGIS in planning.'),

('bruse-fleer-1998-envi-met', 'article',
 'Simulating surface–plant–air interactions inside urban environments with a three dimensional numerical model', '3次元数値モデルによる都市環境内の地表面・植物・大気の相互作用のシミュレーション',
 'Bruse, M.; Fleer, H.', 1998, 'Environmental Modelling & Software', '13', '3-4', '373-384', '10.1016/S1364-8152(98)00042-5', null, 'en',
 '建物・地表面・植物・大気の間の熱や水分のやりとりを、街区の規模で計算する 3 次元の数値モデルを示した論文。のちに温熱環境シミュレーションソフト ENVI-met として広く使われるモデルの基礎となった。樹木や舗装材の違いが街区の微気候に与える影響を、整備前に比べる研究の多くがこのモデルを使っている。',
 'Presents the three-dimensional model of surface–plant–air interactions in urban environments that became the basis of the ENVI-met microclimate software.'),

('nowak-2008-ufore', 'article',
 'A Ground-Based Method of Assessing Urban Forest Structure and Ecosystem Services', '都市の樹木の構造と生態系サービスを現地調査で評価する方法',
 'Nowak, D. J.; Crane, D. E.; Stevens, J. C.; Hoehn, R. E.; Walton, J. T.; Bond, J.', 2008, 'Arboriculture & Urban Forestry', '34', '6', '347-358', '10.48044/jauf.2008.048', null, 'en',
 '都市の樹木を無作為の標本調査で把握し、本数・樹種構成・大きさ・健全度などの構造と、大気汚染物質の除去や炭素の貯留・吸収といった働きを推定する UFORE モデル（のちの i-Tree Eco）のデータの集め方と計算方法を説明した論文。米国14都市の樹木の構造を比べ、樹木の密度は1ヘクタールあたり約22.5本（キャスパー）から約275.8本（アトランタ）まで幅があった。この現地調査による方法の長所と短所も論じている。',
 'Details the field sampling and model methods of UFORE (later i-Tree Eco) for urban forest structure and functions, comparing 14 US cities with tree densities from 22.5 to 275.8 trees/ha.'),

('lenzholzer-2013-research-through-designing', 'article',
 '‘Research through designing’ in landscape architecture', 'ランドスケープアーキテクチャーにおける「デザインによる研究」',
 'Lenzholzer, S.; Duchhart, I.; Koh, J.', 2013, 'Landscape and Urban Planning', '113', null, '120-127', '10.1016/j.landurbplan.2013.02.003', null, 'en',
 '設計する行為を研究の方法として使う「デザインによる研究（research through designing）」について、ランドスケープアーキテクチャーでの位置づけを整理した論文。研究の考え方の立場ごとに、デザインによる研究がどのような形をとりうるかを示し、研究として成り立たせるための条件を論じている。',
 'Positions research through designing within landscape architecture, outlining how it can take different forms under different research paradigms and what makes it valid research.');

insert into paper_methods (paper_id, method_id)
select p.id, m.id from (values
  ('daniel-boster-1976-sbe', 'scenic-beauty'),
  ('saito-1984-photo-landscape-evaluation', 'scenic-beauty'),
  ('ulrich-1984-window-view', 'restorative-environments'),
  ('ulrich-1991-stress-recovery', 'restorative-environments'),
  ('kaplan-1995-restorative-benefits', 'restorative-environments'),
  ('cosco-2010-behavior-mapping', 'behavior-mapping'),
  ('yoshida-1990-yoyogi-park-use', 'behavior-mapping'),
  ('tonosaki-2010-green-view-leaf-color', 'green-view'),
  ('li-2015-street-view-green-view-index', 'green-view'),
  ('li-2015-street-view-green-view-index', 'street-imagery'),
  ('zhang-2018-perception-machine-learning', 'street-imagery'),
  ('hillier-1993-natural-movement', 'space-syntax'),
  ('mcgarigal-marks-1995-fragstats', 'landscape-metrics'),
  ('brown-kytta-2014-ppgis', 'ppgis'),
  ('bruse-fleer-1998-envi-met', 'microclimate-simulation'),
  ('nowak-2008-ufore', 'urban-forest-ecosystem-services'),
  ('lenzholzer-2013-research-through-designing', 'research-through-design')
) as v(paper, method)
join papers p on p.slug = v.paper
join methods m on m.slug = v.method;

-- 行動マッピングの論文は、地面の素材（アスファルト・締め固めた土・砂）や遊具ごとの活動量を比べている
insert into paper_categories (paper_id, category_id)
select p.id, c.id from (values
  ('cosco-2010-behavior-mapping', 'asphalt'),
  ('cosco-2010-behavior-mapping', 'decomposed-granite'),
  ('cosco-2010-behavior-mapping', 'sand-play'),
  ('cosco-2010-behavior-mapping', 'play-equipment')
) as v(paper, category)
join papers p on p.slug = v.paper
join component_categories c on c.slug = v.category;
