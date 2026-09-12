# AI STRIDE

AIエンジニア・AIスタートアップ経営者の承認制月間歩数リーグ。

- React / Vinext / Cloudflare Workers / D1
- サイトのログインIDを用いた本人識別、運営者による申請審査
- 当月の手入力・独自CSV（date,steps）、日次上書きと月間集計
- HealthPlanet認証コード連携、暗号化トークン、手動同期
- 日本時間で月を確定、過去月閲覧、同点同順位

## ローカル開発
npm ci と npm run dev を使用します。 .env.example を参考に環境変数を設定します。
npm run db:generate でマイグレーション生成、npm run build でWorkerをビルドします。
ローカルのDBには drizzle 内のSQLをWranglerの --local で適用してください。

## 本番設定
ADMIN_SETUP_KEY: 運営者初期登録用の十分長い乱数。最初の1アカウントのみ登録できます。
TOKEN_ENCRYPTION_KEY: HealthPlanetトークンの暗号鍵生成用シークレット。
HP_CLIENT_ID / HP_CLIENT_SECRET: HealthPlanetのアプリ登録で取得。設定後に再デプロイ。

HealthPlanetの認証コードは公式success画面から転記します。取得対象は6331の歩数のみ。
開発者キー・実機がない状態で外部APIの実動作を保証しません。

環境変数・管理者初期キー・ローカルDB・運営ガイドはGitとデプロイに含めません。

## 第2版: 部門・賞品・X連携
- 月ごとの entries に職種・年代・性別・都道府県・地方を固定し、同じ関数で画面と賞品候補を集計します。
- Xは既存のサイトログインに対する本人アカウント連携です。XだけでSitesの閲覧認証を代替しません。
- X_CLIENT_ID と X_CLIENT_SECRET をSites環境変数に設定し、実際のドメインの /api/x/callback をXのCallback URIへ登録してください。
- OAuth 2.0 Web App / S256 PKCE / stateとHttpOnly cookieと本人セッションによる検証。Xのアクセストークンは本人照会後に保存しません。
- 賞品は下書き→条件公開→月末後の入賞確定→受取申請→送付済み→受取完了。公開条件と確定結果は変更できません。同順位は全員が対象です。
- 受取情報はAES-GCMで暗号化して保存。実際の配送・デジタル送付は運営者が実施し、このサイトでは状況を記録します。
- 睡眠部門はplanned。metricを分けて拡張でき、現在は睡眠記録を収集・評価しません。
