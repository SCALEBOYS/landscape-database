# Landscape Database

日本のランドスケープ事例データベース（landscapedatabase.com）。関西から始めて全国へ広げる。

| 場所 | 中身 |
|---|---|
| `web/` | 公開サイトと管理画面（Next.js 16 + Supabase） |
| `supabase/` | スキーマ（migrations）と初期データ（seed） |
| `scripts/` | DB への適用・検証、サンプル投入、管理者登録 |
| `data/` | 関西の候補リスト、base44 叩き台用サンプル |
| `docs/` | DB 設計、base44 プロンプト |

## ローカルで動かす

```bash
cd web
cp .env.local.example .env.local   # 値を入れる（下の「環境変数」）
npm install
npm run dev
```

Node.js は `~/.local/node/bin` に入っている（PATH に無い場合は `export PATH="$HOME/.local/node/bin:$PATH"`）。

## 環境変数

| 名前 | どこで使う | 値 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | `https://<プロジェクトID>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Supabase の Publishable key（anon）。ブラウザに渡る公開用の値 |
| `NEXT_PUBLIC_SITE_INDEXABLE` | web | 本公開時だけ `true`。未設定のあいだは検索エンジンに載せない（noindex） |
| `SUPABASE_DB_URL` | scripts（ルートの `.env`） | Session pooler の接続文字列。パスワードを含むので共有しない |

本番ビルドの公開用 2 値は `web/.env.production` にコミット済み（Vercel の環境変数があればそちらが優先）。`service_role` / `secret` キーはどこにも置かない。

## DB の変更

```bash
python3 scripts/apply_and_verify.py   # 未適用のマイグレーションを流して 14 項目を検証
python3 scripts/grant_admin.py <email> # Supabase Auth のユーザーを管理者にする
```

## デプロイ（Vercel）

1. GitHub の非公開リポジトリと連携してインポートする
2. **Root Directory** を `web` にする（Framework は Next.js が自動で選ばれる）
3. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を入れる
4. Deploy。以後は `main` に push するたびに自動でデプロイされる
5. 独自ドメイン（landscapedatabase.com）への切り替えは本公開時（12週目）。IONOS の DNS を Vercel の指示どおりに変える
