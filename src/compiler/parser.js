// パーサー（構文解析器） - 句読点ベース

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

module.exports = { Parser, ASTNode };
