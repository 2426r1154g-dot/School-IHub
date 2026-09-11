# School-IHub 完成版

学生向けコミュニティ + 学習Hub。Firebase Authentication / Firestoreを使います。

## 主な機能
- ログイン / 新規登録 / ログアウト
- 掲示板、いいね、投稿削除
- 質問箱、回答、質問削除
- ユーザー一覧 / 1対1リアルタイムDM
- イベント管理
- 勉強時間記録、週間目標、ストリーク、ランキング
- 今日のタスク / 週間計画
- 電卓 / 単位変換 / 二次関数グラフ / 数学公式
- 教科別リファレンス / 用語検索
- フラッシュカード / 苦手管理 / 復習ゲーム
- ポモドーロ集中タイマー
- 教科別勉強記録 / テスト点数 / 点数グラフ
- 勉強仲間募集 / 勉強質問 / おすすめ参考書・勉強法
- タイピング / 計算 / 記憶 / 学校クイズ / 反射神経 / 英単語ゲーム
- ダークテーマ / グローバル検索

## Firebase設定
`firebase-config.js` にFirebase Web App設定を入れています。
Firebase Consoleで **Authentication > Sign-in method > Email/Password** を有効化してください。
Firestore Databaseを作成し、`firestore.rules` を公開してください。

## 公開
GitHub Pages、Firebase HostingなどのHTTPS環境で公開するのがおすすめです。

## 注意
学習Hubの個人用データ（タスク、カード、目標、点数など）はブラウザのlocalStorageに保存します。掲示板、質問、イベント、勉強時間、DM、プロフィールはFirestoreに保存します。

- 🎓 志望校登録：大学検索、志望校登録/解除、公式サイト、入試・大学案内/資料ページへのリンク、自分で大学を追加
