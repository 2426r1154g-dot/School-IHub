# School-IHub セットアップ

1. Firebase Consoleで `school-i-hub` プロジェクトを開く。
2. Authentication → Sign-in method → Email/Password を有効にする。
3. Firestore Databaseを作成する。
4. このフォルダの `firestore.rules` をFirestore → Rulesへ貼り付けてPublishする。
5. `firebase-config.js` の設定が自分のWeb Appのものになっていることを確認する。
6. GitHub Pages / Firebase HostingなどのHTTPS環境で `index.html` を公開する。

### 真っ白になる場合
Chrome/EdgeでF12 → Consoleを開き、赤いエラーを確認してください。
この版ではJavaScriptの読み込みに失敗してもログイン画面が真っ白にならないよう、認証画面を初期表示にしています。

### Firestore Rules
DMは会話メンバーだけが読めるようにしています。投稿のいいねは `likes` / `likedBy` だけを変更できます。質問への回答は回答追加だけを許可しています。


## 志望校機能
志望校ページには大学の公式サイトと公式の入試・大学案内ページへのリンクを収録しています。大学情報や募集要項は年度で更新されるため、出願時は必ず各大学の公式ページで最新情報を確認してください。
