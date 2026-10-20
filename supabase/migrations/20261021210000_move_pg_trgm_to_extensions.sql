-- pg_trgm も public から extensions へ（Supabase のセキュリティ診断 extension_in_public）
-- 場所を移せる拡張機能なので、そのまま移す。gin_trgm_ops を使う索引はそのまま使える
alter extension pg_trgm set schema extensions;
