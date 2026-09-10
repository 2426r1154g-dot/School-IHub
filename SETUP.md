# School-IHub Firebase版 セットアップ

## 1. Firebaseプロジェクトを作成
Firebase Consoleで新しいプロジェクトを作成。

## 2. Authentication
Authentication → Sign-in method → Email/Password を有効化。

## 3. Firestore
Firestore Databaseを作成。まずは本番モードで作成してOKです。

## 4. Webアプリを登録
プロジェクト設定 → マイアプリ → Webアプリを追加。
表示された `firebaseConfig` を `firebase-config.js` の `YOUR_...` に貼り付けます。

## 5. Rulesを反映
`firestore.rules` をFirebase ConsoleのFirestore Rulesへ貼り付けて公開。

## 6. Firebase Hostingで公開する場合
Firebase CLIを使える環境で、このフォルダをプロジェクトディレクトリにして、以下を実行します。

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,hosting
```

`firebase use --add` では作成したFirebaseプロジェクトを選択してください。

## 7. できること
- Email/Password 新規登録・ログイン・ログアウト
- ユーザー情報をFirestoreへ保存
- 掲示板をリアルタイム更新
- いいねを1ユーザー1回で管理
- 自分の投稿を削除
- 質問箱・回答
- イベント
- 勉強時間記録・ランキング
- DMユーザー検索
- FirestoreのリアルタイムDM
- DM履歴のクラウド保存

## 注意
この版は本番サービス用の最低限の土台です。学校内で実際に公開する場合は、通報・ブロック・管理者権限・荒らし対策・年齢に応じた安全設計・個人情報保護方針などを追加してください。
