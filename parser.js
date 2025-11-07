// パーサー（構文解析器）

const { TOKEN_TYPES } = require('./lexer');

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
      return this.parseDisplayStatement();
    }
    
    // 未知のトークンはスキップ
    this.advance();
    return null;
  }

  parseVariableDeclaration() {
    // 変数、名前は値。
    this.consume('変数');
    this.match('、'); // 読点は省略可能
    const name = this.consumeIdentifier();
    this.consume('は');
    const value = this.parseExpression();
    this.match('。'); // 句点は省略可能
    
    return new ASTNode('VariableDeclaration', { name, value });
  }

  parseIfStatement() {
    // もし、条件ならば、 ... そうでなければ、 ... 終わり。
    this.consume('もし');
    this.match('、'); // 読点は省略可能
    const condition = this.parseCondition();
    this.consume('ならば');
    this.match('、'); // 読点は省略可能
    
    const consequent = [];
    while (!this.check('そうでなければ') && !this.check('終わり') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) consequent.push(stmt);
    }
    
    let alternate = [];
    if (this.match('そうでなければ')) {
      this.match('、'); // 読点は省略可能
      while (!this.check('終わり') && !this.isAtEnd()) {
        const stmt = this.parseStatement();
        if (stmt) alternate.push(stmt);
      }
    }
    
    this.consume('終わり');
    this.match('。'); // 句点は省略可能
    
    return new ASTNode('IfStatement', { condition, consequent, alternate });
  }

  parseCondition() {
    // 左辺 が 右辺 より 大きい
    const left = this.parseExpression();
    
    if (this.match('が')) {
      // 右辺を先に取得
      let right = null;
      let operator = '==';
      
      // 比較演算子をチェック
      if (this.checkNumber() || this.checkIdentifier() || this.matchString()) {
        right = this.parseExpression();
      }
      
      // 演算子を決定
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
      }
      
      return new ASTNode('BinaryExpression', { operator, left, right });
    }
    
    return left;
  }

  parseRepeatStatement() {
    // 3回、繰り返す、 ... 終わり。
    const count = this.consumeNumber();
    this.consume('回');
    this.match('、'); // 読点は省略可能
    this.consume('繰り返す');
    this.match('、'); // 読点は省略可能
    
    const body = [];
    while (!this.check('終わり') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    
    this.consume('終わり');
    this.match('。'); // 句点は省略可能
    
    return new ASTNode('RepeatStatement', { count, body });
  }

  parseFunctionDeclaration() {
    // 関数、名前は、パラメータで、 ... 終わり。
    this.consume('関数');
    this.match('、'); // 読点は省略可能
    const name = this.consumeIdentifier();
    this.consume('は');
    this.match('、'); // 読点は省略可能
    
    const params = [];
    if (!this.check('。') && this.checkIdentifier()) {
      params.push(this.consumeIdentifier());
      while (this.match('と')) {
        params.push(this.consumeIdentifier());
      }
      this.consume('で');
      this.match('、'); // 読点は省略可能
    }
    
    const body = [];
    while (!this.check('終わり') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    
    this.consume('終わり');
    this.match('。'); // 句点は省略可能
    
    return new ASTNode('FunctionDeclaration', { name, params, body });
  }

  parseCallOrAssignment() {
    const name = this.consumeIdentifier();
    
    if (this.match('に')) {
      // 関数呼び出し: 関数名に引数を渡す。
      const args = [];
      args.push(this.parseExpression());
      
      while (this.match('と')) {
        args.push(this.parseExpression());
      }
      
      this.consume('を渡す');
      this.match('。'); // 句点は省略可能
      
      return new ASTNode('CallExpression', { name, args });
    } else if (this.match('は')) {
      // 変数代入: 変数名は値。
      const value = this.parseExpression();
      this.match('。'); // 句点は省略可能
      
      return new ASTNode('Assignment', { name, value });
    }
    
    return new ASTNode('Identifier', { name });
  }

  parseReturnStatement() {
    // 返す、値。
    this.consume('返す');
    this.match('、'); // 読点は省略可能
    const value = this.parseExpression();
    this.match('。'); // 句点は省略可能
    
    return new ASTNode('ReturnStatement', { value });
  }

  parseDisplayStatement() {
    // 「文字列」と表示。
    const expressions = [];
    expressions.push(this.parseExpression());
    
    while (this.match('と') && !this.check('表示') && !this.check('と表示')) {
      expressions.push(this.parseExpression());
    }
    
    if (this.match('と表示')) {
      // 既に消費済み
    } else {
      this.consume('と');
      this.consume('表示');
    }
    this.match('。'); // 句点は省略可能
    
    return new ASTNode('DisplayStatement', { expressions });
  }

  parseExpression() {
    if (this.matchString()) {
      return new ASTNode('Literal', { value: this.previous().value, raw: this.previous().value });
    } else if (this.matchNumber()) {
      return new ASTNode('Literal', { value: this.previous().value, raw: this.previous().value });
    } else if (this.match('真')) {
      return new ASTNode('Literal', { value: true, raw: 'true' });
    } else if (this.match('偽')) {
      return new ASTNode('Literal', { value: false, raw: 'false' });
    } else if (this.checkIdentifier()) {
      const name = this.consumeIdentifier();
      return new ASTNode('Identifier', { name });
    }
    
    throw new Error(`予期しないトークン: ${this.peek().value}`);
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

  match(...keywords) {
    for (const keyword of keywords) {
      if (this.check(keyword)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  matchString() {
    if (this.peek().type === TOKEN_TYPES.STRING) {
      this.advance();
      return true;
    }
    return false;
  }

  matchNumber() {
    if (this.peek().type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return true;
    }
    return false;
  }

  checkNumber() {
    if (this.isAtEnd()) return false;
    return this.peek().type === TOKEN_TYPES.NUMBER;
  }

  consume(keyword) {
    if (this.check(keyword)) {
      return this.advance();
    }
    throw new Error(`期待されるキーワード '${keyword}' が見つかりません。現在: ${this.peek().value}`);
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

module.exports = { Parser, ASTNode };
