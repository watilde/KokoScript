// テストスイート

const fs = require('fs');
const path = require('path');
const { compile } = require('../src/compiler');
const assert = require('assert');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

console.log('KokoScript テスト実行中...\n');
const examplesDir = path.join(__dirname, 'examples');

// 変数宣言のテスト
test('変数宣言', () => {
  const source = '変数、名前は「太郎」。';
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('let 名前 = "太郎"'));
});

// 条件分岐のテスト
test('条件分岐', () => {
  const source = `
    変数、年齢は25。
    もし、年齢が20より大きいならば、
      「成人」を表示。
    終わり。
  `;
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('if'));
  assert(result.code.includes('年齢 > 20'));
});

// 繰り返しのテスト
test('繰り返し', () => {
  const source = `
    3回、繰り返す、
      「こんにちは」を表示。
    終わり。
  `;
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('for'));
  assert(result.code.includes('_i < 3'));
});

// 関数定義のテスト
test('関数定義', () => {
  const source = `
    関数、挨拶は、名前で、
      「こんにちは」と名前を表示。
    終わり。
  `;
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('function 挨拶'));
  assert(result.code.includes('名前'));
});

// 関数呼び出しのテスト
test('関数呼び出し', () => {
  const source = `
    関数、挨拶は、名前で、
      「こんにちは」と名前を表示。
    終わり。
    挨拶に「太郎」を渡す。
  `;
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('挨拶("太郎")'));
});

// 表示文のテスト
test('表示文', () => {
  const source = '「Hello」と「World」を表示。';
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('console.log'));
  assert(result.code.includes('"Hello" + "World"'));
});

// 数値のテスト
test('数値リテラル', () => {
  const source = '変数、数は42。';
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('let 数 = 42'));
});

// 複数文のテスト
test('複数文', () => {
  const source = `
    変数、aは1。
    変数、bは2。
    「完了」を表示。
  `;
  const result = compile(source);
  assert(result.success);
  assert(result.code.includes('let a = 1'));
  assert(result.code.includes('let b = 2'));
  assert(result.code.includes('console.log'));
});

// サンプルファイルのコンパイル確認
test('サンプルコード: basic.koko', () => {
  const sample = fs.readFileSync(path.join(examplesDir, 'basic.koko'), 'utf-8');
  const result = compile(sample);
  assert(result.success);
});

test('サンプルコード: advanced.koko', () => {
  const sample = fs.readFileSync(path.join(examplesDir, 'advanced.koko'), 'utf-8');
  const result = compile(sample);
  assert(result.success);
});

console.log('\nテスト完了！');
