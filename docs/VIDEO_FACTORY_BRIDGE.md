# Video Factory連携（自由制作エンジン）

このリポジトリはAnimation FactoryのJSON/Phaser動画工場を置換しない。追加のReact/Remotion制作方式として使う。元のコピーはプライベートで、外部公開や自動投稿を有効化しない。

## 使い方

**推奨（コピー不要）**: Actions「Video Factory (manual)」で mode=generate-longform、source=lunar-camera のようにAnimation Factoryのlongform制作IDを指定する。公開済みのnomuonji/animation-factoryから対象JSONと変換ツールを直接取得し、制作ジョブZIPを生成する。追加の認証キーは不要。handoff.jsonには参照元コミットが残る。元の動画・音声ファイルは取得・転用しない。

**個別request JSONから生成する場合**:

1. Animation Factoryの長尺企画から、tools/motionmaker/export-longform.mjs でShin-MotionMaker公式の request.json を出力する。
2. このリポジトリの factory-requests/<id>.json としてPRに入れる。外部メディアファイルは自動複製されない。使用する素材は別途権利・出典を確認する。
3. Actionsの「Video Factory (manual)」で mode=generate, source=factory-requests/<id>.json を実行する。artifactの motion-job.zip は編集可能な制作の足場であり、完成動画ではない。
4. 制作エージェントがZIP内のAGENTS.md、brief.md、project.jsonを読んで、plan/、scenes/、音声などを実装する。完成した制作ジョブを factory-jobs/<id>/ にPRで反映する。
5. 同じActionsで mode=render, source=factory-jobs/<id>, target=preview|final を指定して実行する。生成物は video.mp4、reports/、handoff.json のartifact。元の制作ジョブはコミットで追跡できる。
6. 映像・音声・出典・権利・投稿先を別に確認し、必要なら既存のvideo-publisher等の公開手順で扱う。ここから自動公開はしない。

## 品質と安全

- 解説動画のfinalでは事前/事後QCと構造検査、ゴースト走査を実行する。previewは制作途中を確認するための出力として使える。
- handoff.jsonの editorial_review=unreviewed と publishing_authorized=false はレンダー成功後も維持する。技術成功を作品の合格や公開許可と混同しない。
- Seedanceなど課金を伴う生成APIはこのActionsから呼ばない。Windows runnerでCPUレンダーするためActionsの実行枠・時間を消費する。
- ジョブ内のスクリプトはサンドボックスではない。ソースを確認した信頼できるジョブだけを実行する。シンボリックリンクを拒否し、レンダーは一時コピーで行う。
- 本コピーのGitHub Pagesは元の公開GUIとは独立しているため、元の公開Pagesを更新するワークフローは実行しない。

実装経路は生成・レンダーの入口を追加したものであり、AIエージェント自体の自律起動やYouTube分析・公開までの完全自動化を意味しない。
