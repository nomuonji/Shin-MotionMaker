# Shin-MotionMaker

> nomuonjiの動画工場向けコピー：自由制作・Actions受け渡しは [Video Factory連携](docs/VIDEO_FACTORY_BRIDGE.md) を参照。公開・投稿は自動で行いません。

Shin-MotionMaker は、モーショングラフィックス動画（MV・解説動画）の**制作ジョブ**を作る道具です。入力フォームの内容から、制作エージェントがそのまま開いて制作に入れるジョブフォルダ（または ZIP）を生成します。動画そのものは、生成したジョブの中で制作エージェントが作ります。

- **バージョン**: 0.1.1（CPU での符号化に対応。初回の公開は v0.1.0）
- **リポジトリ**: https://github.com/kokuren333/Shin-MotionMaker （public）
- **GUI（GitHub Pages）**: https://kokuren333.github.io/Shin-MotionMaker/
- **ライセンス**: [Apache License 2.0](LICENSE)

入口は3つあり、どれも同じコアを通るので、同じ入力からは同じジョブができます。

| 入口 | 向いている使い方 |
| --- | --- |
| GUI | 人がブラウザでフォームを埋めて ZIP を作る |
| CLI（`shin-motionmaker`、短縮名 `smm`） | `request.json` からジョブを作る。ジョブ内の検査・レンダーを起動し、結果を JSON で受け取る |
| MCP（stdio） | 制作エージェントが、生成・状態の確認・ジョブ内スクリプトの起動をツールとして呼ぶ |

> CLI・MCP は npm レジストリには公開していません。repo を手元に置いてビルドします（導入は [CLI](#cli)）。

## 考え方

- 創造に関わる入力（デザイン方向性、動画全体への指示、差別化メモ、理解ゴールなど）は自由記述です。GUI・CLI・MCP が出す方向性の候補は**たたき台**であり、選ばなくても生成できます。
- 入口が決定論で担うのは、生成・検証・安全だけです。場面や演出は、制作エージェントがジョブのファイルを直接編集して作ります。
- 合否を決めるのは、客観的に判定できて、外すと視聴者に実害が出る検査だけです。主観的な質（面白さ、演出の巧拙、テンポなど）は助言として返し、合否に入れません。MV には QC 規則がありません。
- 生成後の設定の正本は、ジョブの `project.json` だけです。

## 必要な環境

| 用途 | 必要なもの |
| --- | --- |
| GUI・CLI・MCP（ジョブの生成） | Node.js 22.12.0 以上、npm |
| ジョブの制作（レンダー・検査） | ジョブの依存（ジョブのルートで `npm install`。Remotion など。初回はネットワーク接続が必要で、容量も大きい）、ffmpeg、Remotion のレンダー用ブラウザ |
| 音声合成（使う場合） | AivisSpeech などの Aivis エンジン（別途起動） |
| 画像生成（使う場合） | Codex CLI |
| 動画生成（Seedance、使う場合） | BytePlus ModelArk の API キー（環境変数 `ARK_API_KEY`）と、モデルを有効化した BytePlus アカウント |

どれも自動ではインストールしません。手元の状態は `doctor` で確かめられます（[CLI](#cli)）。

NVIDIA の GPU は必須ではありません。テンプレート 0.5.3 以降で生成したジョブは、レンダーの前に NVIDIA の GPU のハードウェアエンコーダ（NVENC）で1フレームを実際に符号化してみて、使えれば NVENC（BiimMotion と同じ設定）、使えなければ自動で CPU（libx264）で符号化します。

- CPU では符号化に時間がかかります。CPU と GPU で出力のビットレートとバイトは一致しませんが、検査の合否は変わりません。
- 環境変数 `MOTION_JOB_ENCODER`（`auto`・`cpu`・`gpu`）で明示できます。レンダーの開始時に、どちらで符号化するかが `[encoder]` で始まる1行で出ます。
- 実レンダーを確かめたのは Windows です。GPU のある実機では全工程を、GPU の無い GitHub の Windows runner でも、CPU（libx264）で全工程（preview・still・ゴースト検査・final）が CLI と MCP の両方で通ることを確かめました（runner には ffmpeg が無いので、CI では版と SHA-256 を固定した ffmpeg を用意しています。[VERIFICATION](VERIFICATION.md#cpu-環境対応--c1-の解決cpu-q1-案a)）。ゴースト検査には `rawvideo` を出力できる ffmpeg が要り、Remotion 同梱の ffmpeg では代わりになりません。Linux は同じ分岐を通りますが、実レンダーは確かめていません。macOS は BiimMotion と同じ動作のままで、確かめていません。NVENC 以外のハードウェアエンコーダ（QSV・AMF など）は使いません。
- それより前のテンプレートで生成したジョブ（BiimMotion が生成したものを含む）では働きません。生成し直すか、ジョブの `runtime/scripts/` の該当ファイルを更新します。

## GUI

ブラウザの中だけで動く静的サイトです。入力はどこにも送信・保存しません。フォームを埋めて「ジョブのZIPを生成」を押すと、ZIP がダウンロードされます。フォームの内容は `request.json` として書き出せ、CLI・MCP の `generate` にそのまま渡せます。

制作モードは MV と解説の2つで、解説では様式モード（biim／anime／motion／mixed）を同格に選べます。見た目は CyberSprite と共通のファミリーテーマ「Circuit White / Solder Mask」です。

公開 URL は https://kokuren333.github.io/Shin-MotionMaker/ です。手元で起動するときは次を実行します（repo の取得と `npm ci` は [CLI](#cli) の導入と同じ）。

```sh
npm run dev --workspace gui
```

表示された `http://127.0.0.1:5173/` をブラウザで開きます。静的ファイル一式は `npm run build --workspace gui` で `gui/dist/` に書き出されます。

## CLI

### 導入

repo（https://github.com/kokuren333/Shin-MotionMaker ）を clone したら、そのルートで次を実行します。

```sh
npm ci
npm run build
npm link
```

`npm link` を使わない場合は、repo のルートで `node dist/cli/main.js` を `smm` の代わりに使います。

### 使い方

```sh
smm version
smm doctor
smm candidates --mode mv
smm generate request.json --out jobs
smm status "jobs/<タイトル>"
smm qc "jobs/<タイトル>" --stage pre
smm validate "jobs/<タイトル>"
smm render "jobs/<タイトル>" --target preview
smm runs list "jobs/<タイトル>"
smm seedance list "jobs/<タイトル>"
```

- 標準出力は JSON の封筒1個です。`ok` は「コマンドが実行でき、結果を得た」こと、`result.verdict` はゲートの合否（`pass`・`fail`・`not_applicable`）です。ゲートが不合格でも `ok` は `true` です。
- `--human` を付けると、標準出力を人向けの要約に切り替えます。
- 終了コードは 0（成功・対象外・助言だけ）、1（検査の不合格。imagegen の strict 未生成を含む）、2（使い方・入力の誤り）、3（環境・前提の不足）、4（内部エラー・異常終了）です。
- 生成直後の解説ジョブで `qc --stage pre` を実行すると、制作記録がまだ無いので `verdict: fail`・終了コード1になります。これは正常な結果です。
- `request.json` の形は `{"form": {...}, "assets": {...}}` です。GUI の「request.json を書き出す」で作るか、`smm schema request` でスキーマを確かめて書きます。

コマンド・封筒・終了コード・エラーコードの全体は [docs/CLI.md](docs/CLI.md) にあります。

## MCP

CLI の `mcp serve` が stdio の MCP サーバーを起動します。ツールは既定で21個（`--enable-generation` で画像生成と `seedance_create` が加わり23個、`--read-only` では10個）で、ジョブの生成から検査・レンダー・run の管理までを扱います。`--root` で指定したフォルダの中だけを読み書きします。クライアントへの登録例（読み取り専用）は次のとおりで、作業ディレクトリを repo のルートにして起動します。

```json
{
  "mcpServers": {
    "shin-motionmaker": {
      "command": "node",
      "args": ["dist/cli/main.js", "mcp", "serve", "--root", ".", "--read-only"]
    }
  }
}
```

- ジョブの生成・検査・レンダーなどの書き込みを許すには `--read-only` を外します。画像生成のツールは `--enable-generation` を付けたときだけ公開されます（費用が発生する場合があります）。
- 作業ディレクトリを指定できないクライアントでは、`args` の `dist/cli/main.js` と `--root` の値を、手元の実際のパスに置き換えます。
- クライアント側の設定ファイルの場所や登録画面は、各クライアントの説明に従ってください。
- ジョブ内スクリプトへ環境変数（`MOTION_JOB_ENCODER` など）を渡すには、登録の `env` に書きます。公式 SDK の stdio クライアントは、クライアント自身の環境をそのままは渡しません（[docs/MCP.md](docs/MCP.md#ジョブ内スクリプトへの環境変数)）。
- **ジョブ内スクリプトの実行は `npm run` と同じ信頼の範囲で、sandbox ではありません。** 信頼できるジョブだけを扱ってください。

ツールの一覧、長い処理（run）の待ち方、安全の境界は [docs/MCP.md](docs/MCP.md) にあります。

## Seedance（動画生成バックエンド）

BytePlus ModelArk の Seedance API を、ジョブの素材作りに使う動画生成バックエンドとして呼べます。入口は CLI の `smm seedance create|status|list` と MCP の `seedance_create`・`seedance_status`・`seedance_list` で、生成した MP4 はジョブの `seedance/out/` に保存されます。

- **既定は DRY_RUN（モック）で、ネットワークに出ません。** 実生成は `SEEDANCE_DRY_RUN=false` のときだけで、API キー（環境変数 `ARK_API_KEY`。値は表示しません）・ジョブの `project.json` の `asset_generation.video_generation=true`・ジョブ単位の予算上限（環境変数 `SEEDANCE_BUDGET_USD`、既定は 10 USD）の3つが揃ったときだけ動きます。
- 費用は作成前に見積り、課金は成功した生成だけです。見積りと実績はジョブの台帳（`seedance/tasks.json`）に残ります。

詳しくは [docs/SEEDANCE.md](docs/SEEDANCE.md) にあります。

## 生成したジョブで制作する

ジョブは単体で完結しています。CLI・MCP を入れなくても、ジョブの `README.md` にある `npm install` と `npm run` の手順で制作できます。制作エージェントには、ジョブのフォルダを開いて `AGENTS.md` を読ませ、制作を依頼します。CLI・MCP は同じジョブ内スクリプトを起動する別の入口で、判定の実装はジョブ側の1つだけです。

## BiimMotion との違い

Shin-MotionMaker は、BiimMotion（`kokuren333/BiimMotionWebUI`、コミット `262c798`）を継承した別の repo です。BiimMotion の repo には手を入れていません。

### 同じもの

- 制作ハーネスの思想・原則・工程・ゲートは BiimMotion と同じです。ジョブの `AGENTS.md` の文面の違いは、製品名の置き換え3対（4箇所）だけです。
- 合否を決めるのは、客観的に判定できて視聴者に実害が出る検査だけで、主観的な質は助言です。MV には QC 規則がありません。入口を増やしても、ゲートは足していません。
- 生成ジョブの中身（Remotion の構成、motion-kit、場面のひな形、スクリプトの名前、依存の版、同梱フォント）は、要件に列挙した許容差分（R1〜R6）のほかは BiimMotion とバイト単位で同じです。ZIP のファイル名とルートフォルダ名も同じです。
- 入力の形（`{form, assets}`）、フォームの項目と既定値、入力エラーの文言は同じです。MV の生成物（`brief.md`、`plan/lyrics.txt`、制作エージェントへの依頼文）は、BiimMotion の出力とバイト単位で同じです。
- ジョブは単体で完結し、CLI・MCP を入れなくても、ジョブの中の `npm install` と `npm run` で制作できます。生成後の設定の正本は、ジョブの `project.json` だけです。
- GUI はブラウザの中だけで動く静的サイトで、入力を外部へ送りません。テーマは同じファミリーテーマ「Circuit White / Solder Mask」で、GUI の機能も引き継いでいます。
- BiimMotion のテスト81件は、すべて Shin-MotionMaker のテストに対応づけてあります。ライセンス（Apache-2.0）とオーナーも同じです。

### 違うもの

- **入口。** BiimMotion の入口は WebUI と、request の JSON からジョブを書き出すスクリプト（`tools/generate-job.ts`）です。Shin-MotionMaker は GUI・CLI・MCP の3つを正式な入口にしました。CLI と MCP は、生成のほかに、ジョブの状態の確認、`project.json` の読み書き、ジョブ内スクリプト（検査・レンダー・音声・画像生成）の起動、実行記録の管理を扱います。GUI は人が入力を書くための入口、CLI と MCP はエージェントと自動化のための入口です。
- **CLI の出力の規約。** 標準出力は JSON の封筒1個で、実行できたか（`ok`）とゲートの合否（`verdict`）を分けます。終了コードは 0〜4、エラーコードは CLI と MCP で共通です。これらは Shin-MotionMaker で定めました。
- **MCP サーバー（stdio）を足しました。** ツールは既定で21個（`--enable-generation` で23個、`--read-only` では10個）です。`--root` の中だけを読み書きし、シンボリックリンクとジャンクションは実体を解決して外を拒否します。任意のコマンドを実行するツールはありません。
- **Seedance バックエンドを足しました。** BytePlus ModelArk の Seedance API を動画生成に使えます。既定は DRY_RUN（モック）で、実生成は API キー・ジョブの opt-in・予算上限の3条件が揃ったときだけです（[Seedance](#seedance動画生成バックエンド)）。
- **長い処理（run）。** レンダーや検査は切り離した子プロセスで実行し、記録をジョブの中の `.smm/runs/` に置きます。CLI が始めた実行を MCP から、MCP が始めた実行を CLI から見られます。
- **構造。** BiimMotion の生成コアの中心は `src/job.ts` の1ファイル（1,008行）です。Shin-MotionMaker は core（Node にも DOM にも依存しない）・host・cli・mcp・gui の層に分け、依存の向きをテストで検査しています。CLI と MCP は同じ操作定義表から作る薄い入口です。
- **同じ入力から同じジョブ。** GUI の ZIP と CLI・MCP が書き出すフォルダは、同じ入力ならパスとバイトが一致します。BiimMotion が GUI と生成スクリプトの間で守っていた性質を、MCP まで広げました。
- **生成ジョブの差分（許容差分 R1〜R6）。** `project.json` の `schema_version` が 0.4 から 0.5 になり、生成元を示す `generator` が加わりました。`validate` が `reports/validate.json` も書きます（標準出力と終了コードは同じ）。ジョブの文書の製品名を置き換え、`NOTICE` と、ジョブの README の「CLI・MCP から使う」節を足しました。解説の `brief.md` の「Opusが記入する」を「制作エージェントが記入する」に改めました。
- **レンダーのエンコーダ。** BiimMotion と同じレンダースクリプト（Shin-MotionMaker v0.1.0 のジョブも同じ）は NVIDIA の GPU がある機械を前提にしており、GPU の無い Windows ではレンダーが失敗しました。テンプレート 0.5.3 からは、NVENC を実際に試し、使えなければ CPU（libx264）で符号化します（[必要な環境](#必要な環境)）。GPU が使える機械では、BiimMotion と同じ NVENC の設定でレンダーします。
- **GUI に足したもの。** `request.json` の書き出しと読み込み（CLI・MCP の `generate` にそのまま渡せる）、検査結果の表示を `validate`・`qc`・`run.json` に広げてゲートと助言を別の区画に分けたこと、CLI・MCP の使い方を示す区画、`version.json` とコミット・テンプレートの版の表示、高コントラスト表示、固有アイコン13点（CyberSprite で制作）です。
- **BiimMotion が生成したジョブ（0.4）も扱えます。** Windows の実機で、BiimMotion の生成スクリプトが作ったジョブに対して、CLI から `status`・`validate`・`qc`・`render`・`ghost-check` を通しました。
- **テストが git の履歴に依存しません。** BiimMotion では、履歴を読むテストが CI でだけ落ち、push は成功したのに Pages が古いまま残りました。Shin-MotionMaker は基線を repo の中のフィクスチャに置き、テストが git を起動しないことをテストで検査しています。
- **CI と公開後確認。** CI は ubuntu と windows の Node 24、ubuntu の Node 22 で同じコマンドを実行します。Pages のワークフローはビルド・デプロイ・公開後確認の3ジョブで、公開した URL の版が一致しなければ失敗にします。

## ライセンスと利用条件

- 本体は [Apache License 2.0](LICENSE) です。由来と第三者のライセンスは [NOTICE](NOTICE) にあります。
- 設計とコードは BiimMotion（同一オーナー、Apache-2.0）のコミット `262c798` を継承しています。テーマトークンとアイコンは CyberSprite（同一オーナー、Apache-2.0）に由来します。
- 同梱フォント（Noto Sans JP、M PLUS Rounded 1c）は SIL Open Font License 1.1 です。
- **Remotion は本体に同梱しません。** 生成したジョブが別途導入するもので、利用は Remotion の公式の利用条件（https://www.remotion.dev/license ）に従います。企業などでの利用には別の条件があります。Aivis エンジンと音声モデル、添付する素材も、それぞれの利用条件を確認してください。

## 開発する人へ

開発の規約はルートの [AGENTS.md](AGENTS.md)、要件の正本は [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)、層とゲートは [docs/WORKFLOW.md](docs/WORKFLOW.md)、API と操作の契約は [docs/CONTRACT.md](docs/CONTRACT.md)、GUI のデザインは [docs/DESIGN.md](docs/DESIGN.md) にあります。

```sh
npm test
node tools/ci-local.mjs
```

`npm test` はビルドしてから全テストを実行します。`tools/ci-local.mjs` は現在のコミットを深さ1で一時フォルダへ複製し、`npm ci` から CI と同じコマンドを実行します。

統合検証では、CLI と MCP の生成→依存導入→構造検査を同じ Tier B の入口から確認します。Windows の実レンダー（Tier C）と、BiimMotion が生成したジョブ（`schema_version` 0.4）の互換確認も実行し、[VERIFICATION.md](VERIFICATION.md) にコミット・出力・画像を記録しています。コマンドの構文と証拠の保存先は [CLI の統合検証](docs/CLI.md#統合検証のコマンド) にあります。

Pages のローカル確認には `npm run verify:pages:local -- --commit <SHA>`（構文）を使います。サブパス配信で正常経路・8種類の不一致・古いコミットからの再試行を確認します。公開後の構文は `node tools/verify-pages.mjs <末尾が / のURL> --expect-commit <SHA>` です。既存の Chrome/Edge が必要で、HTTP・title・コミット・JS/CSS・主要な表示・コンソールを確認し、既定12回・5秒間隔で再試行します。`--attempts`・`--retry-ms`・`--screenshot`・`--output` も指定できます。

Pages の workflow は main への push と手動で動き、ビルド・デプロイ・公開後確認の3ジョブがすべて成功したときだけ公開できたとみなします。実レンダーは独立した workflow で、GPU の無い GitHub の Windows runner で、手動と main push から動きます（CPU の経路で CLI・MCP とも全工程を通す。ffmpeg は版と SHA-256 を固定して取得する。[CPU-Q1](docs/work/CPU/QUESTIONS.md)）。M8 の実公開 URL の確認と公開前後のスクリーンショット比較は [VERIFICATION.md](VERIFICATION.md#m8-公開) にあります。
