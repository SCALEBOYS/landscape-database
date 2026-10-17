"""Supabase Auth のユーザーを管理者（admins テーブル）に登録する。

使い方:
    python3 scripts/grant_admin.py <メールアドレス>

ユーザー自体は、Supabase ダッシュボード > Authentication > Users > Add user で先に作っておく。
"""

import sys

import psycopg

from apply_and_verify import db_url


def main(email: str) -> None:
    with psycopg.connect(db_url()) as conn, conn.cursor() as cur:
        cur.execute("select id from auth.users where lower(email) = lower(%s)", (email,))
        row = cur.fetchone()
        if not row:
            sys.exit(f"{email} のユーザーが見つかりません。先にダッシュボードでユーザーを作成してください。")
        cur.execute("insert into admins (user_id) values (%s) on conflict do nothing", (row[0],))
        cur.execute("select count(*) from admins")
        print(f"{email} を管理者に登録しました（管理者 {cur.fetchone()[0]} 名）")


if __name__ == "__main__":
    main(sys.argv[1])
