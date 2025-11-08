// Browser bundle builder for KokoScript

const fs = require('fs');

// Read source files
const lexerSource = fs.readFileSync('lexer.js', 'utf-8');
const parserSource = fs.readFileSync('parser.js', 'utf-8');
const codegenSource = fs.readFileSync('codegen.js', 'utf-8');

// Extract the class definitions and constants
const lexerCode = lexerSource
  .replace(/module\.exports = .*?;/g, '')
  .trim();

const parserCode = parserSource
  .replace(/const { TOKEN_TYPES } = require\('\.\/lexer'\);/g, '')
  .replace(/module\.exports = .*?;/g, '')
  .trim();

const codegenCode = codegenSource
  .replace(/module\.exports = .*?;/g, '')
  .trim();

// Create the browser bundle
const bundle = `// KokoScript Browser Bundle - 句読点ベース
(function(global) {
  'use strict';

  ${lexerCode}

  ${parserCode}

  ${codegenCode}

  // Main compile function
  function compile(source) {
    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator(ast);
      const code = generator.generate();
      
      return {
        success: true,
        code: code,
        ast: ast
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Export to global
  global.KokoScript = {
    compile: compile,
    Lexer: Lexer,
    Parser: Parser,
    CodeGenerator: CodeGenerator,
    TOKEN_TYPES: TOKEN_TYPES
  };

})(typeof window !== 'undefined' ? window : this);
`;

// Write to docs directory
fs.writeFileSync('docs/kokoscript-bundle.js', bundle, 'utf-8');
console.log('✓ Browser bundle created: docs/kokoscript-bundle.js');
