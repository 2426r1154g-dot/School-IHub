# School-IHub Firebase版

学生向けコミュニティサイトのFirebase版です。

## 主な機能
- Firebase Authenticationによるログイン・新規登録
- Firestoreによる投稿、質問、イベント、勉強記録
- リアルタイム更新
- いいね
- 自分の投稿削除
- DM（Firestoreリアルタイム更新）
- 勉強Hub、集中タイマー、暗記カード、苦手管理、テスト記録など

## 最初にやること
1. `firebase-config.js` にFirebase Webアプリの設定を貼る
2. Firebase AuthenticationでEmail/PasswordをON
3. Firestore Databaseを作成
4. `firestore.rules`を公開
5. Firebase Hosting等で公開

詳しくは `SETUP.md` を見てください。
