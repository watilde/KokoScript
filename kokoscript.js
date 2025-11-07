#!/usr/bin/env node

// KokoScript インタプリタ

const fs = require('fs');
const { Lexer } = require('./lexer');
const { Parser } = require('./parser');
const { CodeGenerator } = require('./codegen');

function compile(source) {
  try {
    // 字句解析
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    // 構文解析
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // コード生成
    const codegen = new CodeGenerator(ast);
    const jsCode = codegen.generate();
    
    return { success: true, code: jsCode };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

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
    console.log('使い方: node kokoscript.js <ファイル名>');
    console.log('例: node kokoscript.js example.koko');
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
