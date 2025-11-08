// KokoScript Browser Bundle - 句読点ベース
(function(global) {
  'use strict';

  // レキサー（字句解析器） - 句読点ベース

class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

const TOKEN_TYPES = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  OPERATOR: 'OPERATOR',
  COMMA: 'COMMA',      // 、
  PERIOD: 'PERIOD',    // 。
  NEWLINE: 'NEWLINE',
  EOF: 'EOF'
};

// キーワード（句読点の前後で区切られる）
const KEYWORDS = new Set([
  '変数', 'は', 'を', 'に', 'が', 'と', 'で', 'の', 'から',
  'もし', 'ならば', 'そうでなければ', '終わり',
  '回', '繰り返す', '抜ける', '続ける',
  '関数', '返す', '呼ぶ',
  'より', '大きい', '小さい', '等しい', '以上', '以下',
  '表示', '渡す', '足す', '引く', '掛ける', '割る',
  '真', '偽', '空'
]);

class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
  }

  tokenize() {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      
      if (this.pos >= this.source.length) break;

      const char = this.source[this.pos];

      // 改行
      if (char === '\n') {
        this.advance();
        this.line++;
        this.col = 1;
        continue;
      }

      // 読点（、）- キーワードの区切り
      if (char === '、' || char === '，') {
        this.tokens.push(new Token(TOKEN_TYPES.COMMA, '、', this.line, this.col));
        this.advance();
        continue;
      }

      // 句点（。）- 文の終わり
      if (char === '。' || char === '．') {
        this.tokens.push(new Token(TOKEN_TYPES.PERIOD, '。', this.line, this.col));
        this.advance();
        continue;
      }

      // コメント
      if (char === '#' || (char === '/' && this.source[this.pos + 1] === '/')) {
        this.skipComment();
        continue;
      }

      // 文字列
      if (char === '「' || char === '"' || char === "'") {
        this.tokens.push(this.readString());
        continue;
      }

      // 数値
      if (this.isDigit(char)) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // 演算子
      if (this.isOperator(char)) {
        this.tokens.push(this.readOperator());
        continue;
      }

      // 識別子またはキーワード
      if (this.isIdentifierStart(char)) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // 不明な文字はスキップ
      this.advance();
    }

    this.tokens.push(new Token(TOKEN_TYPES.EOF, null, this.line, this.col));
    return this.tokens;
  }

  skipWhitespace() {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  skipComment() {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.advance();
    }
  }

  readString() {
    const startLine = this.line;
    const startCol = this.col;
    const startChar = this.source[this.pos];
    let endChar = startChar === '「' ? '」' : startChar;
    
    this.advance();

    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== endChar) {
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        this.advance();
        const escapeChar = this.source[this.pos];
        switch (escapeChar) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          default: value += escapeChar;
        }
        this.advance();
      } else {
        value += this.source[this.pos];
        this.advance();
      }
    }

    if (this.pos < this.source.length) {
      this.advance();
    }

    return new Token(TOKEN_TYPES.STRING, value, startLine, startCol);
  }

  readNumber() {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';
    let hasDot = false;

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (this.isDigit(char)) {
        value += char;
        this.advance();
      } else if (char === '.' && !hasDot) {
        hasDot = true;
        value += char;
        this.advance();
      } else {
        break;
      }
    }

    return new Token(TOKEN_TYPES.NUMBER, parseFloat(value), startLine, startCol);
  }

  readIdentifier() {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';

    // 一文字ずつ読みながら、キーワードをチェック
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      
      // 句読点で止まる
      if (char === '、' || char === '，' || char === '。' || char === '．') {
        break;
      }
      
      // スペースで止まる
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        break;
      }
      
      // 数字で止まる（識別子と数字は別々にトークン化）
      if (this.isDigit(char)) {
        break;
      }
      
      // 演算子で止まる
      if (this.isOperator(char)) {
        break;
      }
      
      // 文字列開始で止まる
      if (char === '「' || char === '"' || char === "'") {
        break;
      }
      
      if (!this.isIdentifierChar(char)) {
        break;
      }
      
      value += char;
      this.advance();
      
      // 読んだ部分の末尾がキーワードかチェック
      // ただし、もっと長く読むとより長いキーワードになる可能性がある場合は続行
      // 例: 「そうで」で止めず「そうでなければ」まで読む
      // 最長マッチを優先：長いキーワードから短いキーワードへ
      for (let i = value.length; i >= 1; i--) {
        const suffix = value.substring(value.length - i);
        if (KEYWORDS.has(suffix)) {
          // もっと長いキーワードの可能性をチェック
          // 次の文字を読んでもキーワードの一部になる可能性があるか？
          let canExtend = false;
          if (this.pos < this.source.length) {
            const nextChar = this.source[this.pos];
            if (this.isIdentifierChar(nextChar) && 
                nextChar !== '、' && nextChar !== '，' && 
                nextChar !== '。' && nextChar !== '．' &&
                nextChar !== ' ' && nextChar !== '\t' && 
                nextChar !== '\r' && nextChar !== '\n') {
              // 次の文字を含めた文字列が、より長いキーワードの接頭辞になるか？
              const extendedValue = value + nextChar;
              for (const keyword of KEYWORDS) {
                if (keyword.startsWith(extendedValue) && keyword.length > suffix.length) {
                  canExtend = true;
                  break;
                }
              }
            }
          }
          
          if (!canExtend) {
            const identifier = value.substring(0, value.length - i);
            
            if (identifier.length > 0) {
              // キーワードの前で止める
              this.pos -= i;
              this.col -= i;
              return new Token(TOKEN_TYPES.IDENTIFIER, identifier, startLine, startCol);
            } else {
              // 全体がキーワード
              return new Token(TOKEN_TYPES.KEYWORD, suffix, startLine, startCol);
            }
          }
        }
      }
    }

    // キーワードチェック
    const type = KEYWORDS.has(value) ? TOKEN_TYPES.KEYWORD : TOKEN_TYPES.IDENTIFIER;
    return new Token(type, value, startLine, startCol);
  }

  readOperator() {
    const startLine = this.line;
    const startCol = this.col;
    const char = this.source[this.pos];
    this.advance();
    return new Token(TOKEN_TYPES.OPERATOR, char, startLine, startCol);
  }

  isDigit(char) {
    return /[0-9]/.test(char);
  }

  isIdentifierStart(char) {
    return /[a-zA-Z_あ-んア-ンー一-龯]/.test(char);
  }

  isIdentifierChar(char) {
    return /[a-zA-Z0-9_あ-んア-ンー一-龯]/.test(char);
  }

  isOperator(char) {
    return /[+\-*/%=<>!()]/.test(char);
  }

  advance() {
    this.pos++;
    this.col++;
  }
}

  // パーサー（構文解析器） - 句読点ベース



class ASTNode {
  constructor(type, data = {}) {
    this.type = type;
    Object.assign(this, data);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== TOKEN_TYPES.NEWLINE);
    this.pos = 0;
  }

  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    return new ASTNode('Program', { statements });
  }

  parseStatement() {
    if (this.check('変数')) {
      return this.parseVariableDeclaration();
    } else if (this.check('もし')) {
      return this.parseIfStatement();
    } else if (this.check('関数')) {
      return this.parseFunctionDeclaration();
    } else if (this.peek().type === TOKEN_TYPES.NUMBER) {
      return this.parseRepeatStatement();
    } else if (this.checkIdentifier()) {
      return this.parseCallOrAssignment();
    } else if (this.match('返す')) {
      return this.parseReturnStatement();
    } else if (this.peek().type === TOKEN_TYPES.STRING) {
      return this.parseExpressionStatement();
    }
    
    this.advance();
    return null;
  }

  parseVariableDeclaration() {
    // 変数、名前は値。
    this.consume('変数');
    this.consumeComma();
    const name = this.consumeIdentifier();
    this.consume('は');
    const value = this.parseExpression();
    this.consumePeriod();
    
    return new ASTNode('VariableDeclaration', { name, value });
  }

  parseIfStatement() {
    // もし、条件ならば、...そうでなければ、...終わり。
    this.consume('もし');
    this.consumeComma();
    const condition = this.parseCondition();
    this.consume('ならば');
    this.consumeComma();
    
    const consequent = [];
    while (!this.check('そうでなければ') && !this.check('終わり') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) consequent.push(stmt);
    }
    
    let alternate = [];
    if (this.match('そうでなければ')) {
      this.consumeComma();
      while (!this.check('終わり') && !this.isAtEnd()) {
        const stmt = this.parseStatement();
        if (stmt) alternate.push(stmt);
      }
    }
    
    this.consume('終わり');
    this.consumePeriod();
    
    return new ASTNode('IfStatement', { condition, consequent, alternate });
  }

  parseCondition() {
    // 値が値より大きい
    const left = this.parseExpression();
    
    if (this.match('が')) {
      const right = this.parseExpression();
      
      let operator = '==';
      if (this.match('より')) {
        if (this.match('大きい')) {
          operator = '>';
        } else if (this.match('小さい')) {
          operator = '<';
        }
      } else if (this.match('以上')) {
        operator = '>=';
      } else if (this.match('以下')) {
        operator = '<=';
      } else if (this.match('等しい')) {
        operator = '==';
      } else {
        // 「が」だけの場合は真偽値チェック
        return left;
      }
      
      return new ASTNode('BinaryExpression', { operator, left, right });
    }
    
    return left;
  }

  parseRepeatStatement() {
    // 3回、繰り返す、...終わり。
    const count = this.consumeNumber();
    this.consume('回');
    this.consumeComma();
    this.consume('繰り返す');
    this.consumeComma();
    
    const body = [];
    while (!this.check('終わり') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    
    this.consume('終わり');
    this.consumePeriod();
    
    return new ASTNode('RepeatStatement', { count, body });
  }

  parseFunctionDeclaration() {
    // 関数、名前は、引数で、...終わり。
    this.consume('関数');
    this.consumeComma();
    const name = this.consumeIdentifier();
    this.consume('は');
    this.consumeComma();
    
    const params = [];
    if (!this.checkPeriod() && this.checkIdentifier()) {
      params.push(this.consumeIdentifier());
      while (this.match('と')) {
        params.push(this.consumeIdentifier());
      }
      this.consume('で');
      this.consumeComma();
    }
    
    const body = [];
    while (!this.check('終わり') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    
    this.consume('終わり');
    this.consumePeriod();
    
    return new ASTNode('FunctionDeclaration', { name, params, body });
  }

  parseCallOrAssignment() {
    const name = this.consumeIdentifier();
    
    if (this.match('に')) {
      // 関数呼び出し: 名前に引数を渡す。
      const args = [];
      args.push(this.parseExpression());
      
      while (this.match('と')) {
        args.push(this.parseExpression());
      }
      
      this.consume('を');
      this.consume('渡す');
      this.consumePeriod();
      
      return new ASTNode('CallExpression', { name, args });
    } else if (this.match('は')) {
      // 変数代入: 名前は値。
      const value = this.parseExpression();
      this.consumePeriod();
      
      return new ASTNode('Assignment', { name, value });
    }
    
    return new ASTNode('Identifier', { name });
  }

  parseReturnStatement() {
    // 返す、値。
    this.consume('返す');
    this.consumeComma();
    const value = this.parseExpression();
    this.consumePeriod();
    
    return new ASTNode('ReturnStatement', { value });
  }

  parseExpressionStatement() {
    // 「文字列」を表示。または 値と値を表示。
    const expressions = [];
    expressions.push(this.parseExpression());
    
    // 「と」で連結された式
    while (this.check('と')) {
      // 次が「を」でないことを確認（「と」の後に動詞が来る場合は終了）
      const savedPos = this.pos;
      this.advance(); // 「と」を消費
      
      // 次の式を読む
      if (this.peek().type === TOKEN_TYPES.STRING || 
          this.peek().type === TOKEN_TYPES.NUMBER ||
          this.checkIdentifier()) {
        expressions.push(this.parseExpression());
      } else {
        // 巻き戻し
        this.pos = savedPos;
        break;
      }
    }
    
    // 動詞（を表示、など）
    this.consume('を');
    
    if (this.match('表示')) {
      this.consumePeriod();
      return new ASTNode('DisplayStatement', { expressions });
    }
    
    throw new Error(`予期しない動詞: ${this.peek().value}`);
  }

  parseExpression() {
    const token = this.peek();
    
    if (token.type === TOKEN_TYPES.STRING) {
      this.advance();
      return new ASTNode('Literal', { value: token.value, raw: token.value });
    } else if (token.type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return new ASTNode('Literal', { value: token.value, raw: token.value });
    } else if (this.match('真')) {
      return new ASTNode('Literal', { value: true, raw: 'true' });
    } else if (this.match('偽')) {
      return new ASTNode('Literal', { value: false, raw: 'false' });
    } else if (this.checkIdentifier()) {
      const name = this.consumeIdentifier();
      return new ASTNode('Identifier', { name });
    }
    
    throw new Error(`予期しないトークン: ${token.value}`);
  }

  // ヘルパーメソッド
  check(keyword) {
    if (this.isAtEnd()) return false;
    return this.peek().type === TOKEN_TYPES.KEYWORD && this.peek().value === keyword;
  }

  checkIdentifier() {
    if (this.isAtEnd()) return false;
    return this.peek().type === TOKEN_TYPES.IDENTIFIER;
  }

  checkPeriod() {
    if (this.isAtEnd()) return false;
    return this.peek().type === TOKEN_TYPES.PERIOD;
  }

  match(...keywords) {
    for (const keyword of keywords) {
      if (this.check(keyword)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  consume(keyword) {
    if (this.check(keyword)) {
      return this.advance();
    }
    throw new Error(`期待されるキーワード '${keyword}' が見つかりません。現在: ${this.peek().value}`);
  }

  consumeComma() {
    if (this.peek().type === TOKEN_TYPES.COMMA) {
      return this.advance();
    }
    throw new Error(`読点（、）が期待されます。現在: ${this.peek().value}`);
  }

  consumePeriod() {
    if (this.peek().type === TOKEN_TYPES.PERIOD) {
      return this.advance();
    }
    throw new Error(`句点（。）が期待されます。現在: ${this.peek().value}`);
  }

  consumeIdentifier() {
    if (this.checkIdentifier()) {
      return this.advance().value;
    }
    throw new Error(`識別子が期待されます。現在: ${this.peek().value}`);
  }

  consumeNumber() {
    if (this.peek().type === TOKEN_TYPES.NUMBER) {
      return this.advance().value;
    }
    throw new Error(`数値が期待されます。現在: ${this.peek().value}`);
  }

  advance() {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  isAtEnd() {
    return this.peek().type === TOKEN_TYPES.EOF;
  }

  peek() {
    return this.tokens[this.pos];
  }

  previous() {
    return this.tokens[this.pos - 1];
  }
}

  // コードジェネレーター（JavaScriptへの変換）

class CodeGenerator {
  constructor(ast) {
    this.ast = ast;
    this.output = '';
    this.indent = 0;
  }

  generate() {
    this.visitProgram(this.ast);
    return this.output;
  }

  visitProgram(node) {
    for (const statement of node.statements) {
      this.visitStatement(statement);
    }
  }

  visitStatement(node) {
    switch (node.type) {
      case 'VariableDeclaration':
        this.visitVariableDeclaration(node);
        break;
      case 'IfStatement':
        this.visitIfStatement(node);
        break;
      case 'RepeatStatement':
        this.visitRepeatStatement(node);
        break;
      case 'FunctionDeclaration':
        this.visitFunctionDeclaration(node);
        break;
      case 'CallExpression':
        this.visitCallExpression(node);
        this.emit(';\n');
        break;
      case 'Assignment':
        this.visitAssignment(node);
        break;
      case 'ReturnStatement':
        this.visitReturnStatement(node);
        break;
      case 'DisplayStatement':
        this.visitDisplayStatement(node);
        break;
    }
  }

  visitVariableDeclaration(node) {
    this.emit('let ');
    this.emit(node.name);
    this.emit(' = ');
    this.visitExpression(node.value);
    this.emit(';\n');
  }

  visitIfStatement(node) {
    this.emit('if (');
    this.visitExpression(node.condition);
    this.emit(') {\n');
    
    this.indent++;
    for (const stmt of node.consequent) {
      this.emitIndent();
      this.visitStatement(stmt);
    }
    this.indent--;
    
    if (node.alternate && node.alternate.length > 0) {
      this.emitIndent();
      this.emit('} else {\n');
      this.indent++;
      for (const stmt of node.alternate) {
        this.emitIndent();
        this.visitStatement(stmt);
      }
      this.indent--;
    }
    
    this.emitIndent();
    this.emit('}\n');
  }

  visitRepeatStatement(node) {
    this.emit('for (let _i = 0; _i < ');
    this.emit(node.count.toString());
    this.emit('; _i++) {\n');
    
    this.indent++;
    for (const stmt of node.body) {
      this.emitIndent();
      this.visitStatement(stmt);
    }
    this.indent--;
    
    this.emitIndent();
    this.emit('}\n');
  }

  visitFunctionDeclaration(node) {
    this.emit('function ');
    this.emit(node.name);
    this.emit('(');
    this.emit(node.params.join(', '));
    this.emit(') {\n');
    
    this.indent++;
    for (const stmt of node.body) {
      this.emitIndent();
      this.visitStatement(stmt);
    }
    this.indent--;
    
    this.emitIndent();
    this.emit('}\n');
  }

  visitCallExpression(node) {
    this.emit(node.name);
    this.emit('(');
    for (let i = 0; i < node.args.length; i++) {
      this.visitExpression(node.args[i]);
      if (i < node.args.length - 1) {
        this.emit(', ');
      }
    }
    this.emit(')');
  }

  visitAssignment(node) {
    this.emit(node.name);
    this.emit(' = ');
    this.visitExpression(node.value);
    this.emit(';\n');
  }

  visitReturnStatement(node) {
    this.emit('return ');
    this.visitExpression(node.value);
    this.emit(';\n');
  }

  visitDisplayStatement(node) {
    this.emit('console.log(');
    for (let i = 0; i < node.expressions.length; i++) {
      this.visitExpression(node.expressions[i]);
      if (i < node.expressions.length - 1) {
        this.emit(' + ');
      }
    }
    this.emit(');\n');
  }

  visitExpression(node) {
    switch (node.type) {
      case 'Literal':
        if (typeof node.value === 'string') {
          this.emit(`"${node.value}"`);
        } else {
          this.emit(String(node.value));
        }
        break;
      case 'Identifier':
        this.emit(node.name);
        break;
      case 'BinaryExpression':
        this.visitExpression(node.left);
        this.emit(' ' + node.operator + ' ');
        this.visitExpression(node.right);
        break;
      case 'CallExpression':
        this.visitCallExpression(node);
        break;
    }
  }

  emit(code) {
    this.output += code;
  }

  emitIndent() {
    this.output += '  '.repeat(this.indent);
  }
}

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
