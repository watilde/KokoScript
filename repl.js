#!/usr/bin/env node

// KokoScript REPL (Read-Eval-Print Loop)

const readline = require('readline');
const { compile } = require('./kokoscript');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'KokoScript> '
});

console.log('KokoScript REPL v1.0.0');
console.log('終了するには .exit と入力してください');
console.log('');

let buffer = '';
let context = {};

rl.prompt();

rl.on('line', (line) => {
  line = line.trim();
  
  if (line === '.exit') {
    console.log('さようなら！');
    process.exit(0);
  }
  
  if (line === '.clear') {
    buffer = '';
    context = {};
    console.log('バッファとコンテキストをクリアしました');
    rl.prompt();
    return;
  }
  
  if (line === '.help') {
    console.log('コマンド:');
    console.log('  .exit  - REPLを終了');
    console.log('  .clear - バッファとコンテキストをクリア');
    console.log('  .help  - このヘルプを表示');
    rl.prompt();
    return;
  }
  
  if (line === '') {
    rl.prompt();
    return;
  }
  
  buffer += line + '\n';
  
  // 「終わり」で終わる場合、または単一文の場合は実行
  if (line.includes('終わり') || 
      (!line.includes('ならば') && !line.includes('繰り返す') && !line.includes('定義する'))) {
    
    const result = compile(buffer);
    
    if (result.success) {
      try {
        // コンテキストを保持しながら実行
        const wrappedCode = `
          (function() {
            with (context) {
              ${result.code}
            }
          })();
        `;
        eval(wrappedCode);
      } catch (error) {
        console.error('実行エラー:', error.message);
      }
    } else {
      console.error('コンパイルエラー:', result.error);
    }
    
    buffer = '';
  }
  
  rl.prompt();
}).on('close', () => {
  console.log('\nさようなら！');
  process.exit(0);
});
