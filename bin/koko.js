#!/usr/bin/env node

/**
 * KokoScript CLI compiler (tsc-style)
 * - Compiles .koko files to .js files
 * - Supports --outDir similar to TypeScript CLI
 * - Provides --help and --version flags
 */

const fs = require('fs');
const path = require('path');
const { compile } = require('../src/compiler');
const { startRepl } = require('../src/cli/repl');
const pkg = require('../package.json');

function printHelp() {
  console.log(`KokoScript v${pkg.version}`);
  console.log('Usage: koko [options] <files...>');
  console.log('\nOptions:');
  console.log('  --outDir <dir>     Specify output directory (like tsc)');
  console.log('  --repl, -r         Launch interactive REPL mode');
  console.log('  --help, -h         Show this help');
  console.log('  --version, -v      Show version number');
  console.log('');
  console.log('Example:');
  console.log('  koko src/example.koko --outDir dist');
}

function replaceExtension(filePath, newExt) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, parsed.name + newExt);
}

function computeOutputPath(filePath, outDir) {
  const absolute = path.resolve(filePath);
  if (!outDir) {
    return replaceExtension(absolute, '.js');
  }

  const relativeFromCwd = path.relative(process.cwd(), absolute);
  const normalizedRelative = relativeFromCwd.startsWith('..')
    ? path.basename(absolute)
    : relativeFromCwd;
  const target = path.join(outDir, normalizedRelative);
  return replaceExtension(target, '.js');
}

const args = process.argv.slice(2);
const files = [];
let outDir = null;
let replMode = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }

  if (arg === '--version' || arg === '-v') {
    console.log(pkg.version);
    process.exit(0);
  }

  if (arg === '--repl' || arg === '-r' || arg === 'repl') {
    replMode = true;
    continue;
  }

  if (arg.startsWith('--outDir=')) {
    outDir = path.resolve(arg.split('=')[1]);
    continue;
  }

  if (arg === '--outDir') {
    if (i + 1 >= args.length) {
      console.error('Error: --outDir requires a directory path.');
      process.exit(1);
    }
    outDir = path.resolve(args[++i]);
    continue;
  }

  files.push(arg);
}

if (replMode) {
  if (files.length > 0) {
    console.warn('koko: ファイル指定はREPLモードでは無視されます。');
  }
  startRepl();
} else {
  if (files.length === 0) {
    printHelp();
    process.exit(1);
  }

  let hasErrors = false;

  for (const file of files) {
    const resolved = path.resolve(file);

    if (!fs.existsSync(resolved)) {
      console.error(`koko: Cannot find file '${file}'.`);
      hasErrors = true;
      continue;
    }

    const source = fs.readFileSync(resolved, 'utf8');
    const result = compile(source);

    if (!result.success) {
      console.error(`koko: Failed to compile '${file}': ${result.error}`);
      hasErrors = true;
      continue;
    }

    const outputPath = computeOutputPath(resolved, outDir);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.code, 'utf8');

    const inputDisplay = path.relative(process.cwd(), resolved);
    const outputDisplay = path.relative(process.cwd(), outputPath);
    console.log(`${inputDisplay} -> ${outputDisplay}`);
  }

  process.exit(hasErrors ? 1 : 0);
}
