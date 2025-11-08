const { Lexer } = require('./lexer');
const { Parser } = require('./parser');
const { CodeGenerator } = require('./codegen');

function compile(source) {
  try {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const codegen = new CodeGenerator(ast);
    const jsCode = codegen.generate();

    return { success: true, code: jsCode, ast };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  compile,
  Lexer,
  Parser,
  CodeGenerator
};
