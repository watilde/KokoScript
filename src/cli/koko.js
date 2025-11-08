#!/usr/bin/env node

// KokoScript インタプリタ

const fs = require('fs');
const { compile } = require('../compiler');

function run(source) {
  const result = compile(source);
  
  if (result.success) {
    console.log('=== 生成されたJavaScriptコード ===');
    console.log(result.code);
    console.log('\n=== 実行結果 ===');
    try {
      eval(result.code);
    } catch (error) {
      console.error('実行エラー:', error.message);
    }
  } else {
    console.error('コンパイルエラー:', result.error);
  }
}

// コマンドライン引数の処理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使い方: koko <ファイル名>');
    console.log('例: koko example.koko');
    process.exit(1);
  }
  
  const filename = args[0];
  
  if (!fs.existsSync(filename)) {
    console.error(`エラー: ファイル '${filename}' が見つかりません`);
    process.exit(1);
  }
  
  const source = fs.readFileSync(filename, 'utf-8');
  run(source);
}

module.exports = { compile, run };
