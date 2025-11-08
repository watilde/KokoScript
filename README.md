# 🈁 KokoScript
日本語で書けるJavaScriptサブセット言語

## 概要
KokoScriptは、「日本語で自然に書けるJavaScript」を目指した日本語ベースのプログラミング言語です。
句読点（、と。）を使って文を区切ることで、スペース不要で日本語のように読めるコードを書けます。
内部的にはJavaScriptにトランスパイルされます。

## 特徴
- 日本語のキーワードを使用
- 句読点（、。）で文を区切る
- スペース不要
- JavaScriptへ自動変換
- シンプルで学びやすい構文

## サンプルコード
```koko
変数、名前は「太郎」。
もし、名前が「太郎」ならば、
  「こんにちは！」を表示。
終わり。
```

## ディレクトリ構成
```
.
├── docs/            # ブラウザ向けプレイグラウンド
├── scripts/         # ユーティリティスクリプト
├── src/
│   ├── cli/         # CLI / REPL エントリーポイント
│   └── compiler/    # レキサー・パーサー・コード生成
└── tests/
    ├── basic.test.js
    └── examples/    # 各種サンプル .koko
```

## CLI
KokoScriptにはコンパイラCLI `koko` が付属しています。  
`npm install --global kokoscript` でインストールすると、システム全体で `koko` コマンドが使えます。

```bash
# 初回インストール
npm i -g kokoscript

# .koko -> .js を出力
koko tests/examples/basic.koko --outDir dist

# REPL モード
koko --repl
```

`--outDir` を省略すると、入力ファイルと同じディレクトリに `.js` が生成されます。  
複数ファイルを指定した場合は順次コンパイルされ、相対パスを維持したまま `outDir` に配置されます。

## 開発
```bash
npm install
npm run cli tests/examples/basic.koko     # 生成されたJSを表示して実行（eval）
npm run repl                 # 対話モード
npm test                     # Nodeテスト
npm run build:browser        # docs/kokoscript-bundle.js を再生成
```
