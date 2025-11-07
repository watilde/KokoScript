// レキサー（字句解析器）

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
  NEWLINE: 'NEWLINE',
  EOF: 'EOF'
};

// 複数単語のキーワード（優先順位が高い）
const COMPOUND_KEYWORDS = new Set([
  'を渡す', 'と表示', 'で定義する'
]);

const KEYWORDS = new Set([
  '変数', 'は', 'を', 'もし', 'が', 'ならば', 'そうでなければ',
  '終わり', '繰り返す', '回', '関数', 'で', 'に', 
  '渡す', '表示', 'と', 'より', 
  '大きい', '小さい', '等しい', '以上', '以下',
  '返す', '真', '偽', 'かつ', 'または', 'ではない',
  ...COMPOUND_KEYWORDS
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
        this.tokens.push(new Token(TOKEN_TYPES.NEWLINE, '\n', this.line, this.col));
        this.advance();
        this.line++;
        this.col = 1;
        continue;
      }

      // 句読点（文の区切りとして扱う）
      if (char === '、' || char === '，') {
        this.tokens.push(new Token(TOKEN_TYPES.KEYWORD, '、', this.line, this.col));
        this.advance();
        continue;
      }

      if (char === '。' || char === '．') {
        this.tokens.push(new Token(TOKEN_TYPES.KEYWORD, '。', this.line, this.col));
        this.advance();
        continue;
      }

      // コメント
      if (char === '#' || char === '//') {
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

      // 識別子またはキーワード
      if (this.isIdentifierStart(char)) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // 演算子
      if (this.isOperator(char)) {
        this.tokens.push(this.readOperator());
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
    
    this.advance(); // 開始引用符をスキップ

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
      this.advance(); // 終了引用符をスキップ
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

    // まず全ての識別子文字を読む
    while (this.pos < this.source.length && this.isIdentifierChar(this.source[this.pos])) {
      value += this.source[this.pos];
      this.advance();
    }

    // まず、読み取った文字列の先頭がキーワードかチェック
    // 先頭から最短のキーワードマッチを探す
    for (let i = 1; i <= value.length; i++) {
      const prefix = value.substring(0, i);
      if (KEYWORDS.has(prefix)) {
        // このキーワードが複合キーワードの一部になる可能性をチェック
        const remainder = value.substring(i); // 既に読んだ残り
        
        // すでに読んだ部分で複合キーワードが完成しているかチェック
        const potentialCompound = prefix + remainder;
        if (COMPOUND_KEYWORDS.has(potentialCompound)) {
          return new Token(TOKEN_TYPES.KEYWORD, potentialCompound, startLine, startCol);
        }
        
        // 読んだ部分では完成していない場合、さらに先を読む
        const savedPos = this.pos;
        const savedCol = this.col;
        let lookahead = remainder;
        
        // スペースをスキップして次の単語を見る
        while (this.pos < this.source.length && this.source[this.pos] === ' ') {
          lookahead += this.source[this.pos];
          this.advance();
        }
        
        // 次の識別子を読む
        if (this.pos < this.source.length && this.isIdentifierStart(this.source[this.pos])) {
          while (this.pos < this.source.length && this.isIdentifierChar(this.source[this.pos])) {
            lookahead += this.source[this.pos];
            this.advance();
          }
          
          const compoundValue = (prefix + lookahead).replace(/\s+/g, '');
          // 複合キーワードとして存在するかチェック
          if (COMPOUND_KEYWORDS.has(compoundValue)) {
            return new Token(TOKEN_TYPES.KEYWORD, compoundValue, startLine, startCol);
          }
        }
        
        // 複合キーワードでない場合は巻き戻して、単一キーワードを返す
        this.pos = savedPos;
        this.col = savedCol;
        
        // 位置を調整して、キーワードの後ろに戻す
        this.pos -= (value.length - i);
        this.col -= (value.length - i);
        
        return new Token(TOKEN_TYPES.KEYWORD, prefix, startLine, startCol);
      }
    }

    // キーワードでない場合、末尾からキーワードまたは複合キーワードを探す
    // 例: "名前は" -> "名前" (identifier) + "は" (keyword to be read next time)
    // 例: "名前と表示" -> "名前" (identifier) + "と表示" (compound keyword to be read next time)
    // 長いマッチを優先（複合キーワード > 単一キーワード）
    
    // まず複合キーワードをチェック
    for (let i = 1; i < value.length; i++) {
      const suffix = value.substring(i);
      
      // 複合キーワードのチェック（すでに読み込み済みの部分）
      if (COMPOUND_KEYWORDS.has(suffix)) {
        // 複合キーワードが見つかった
        // 前半(prefix)にキーワードが含まれていないかチェック
        const prefix = value.substring(0, i);
        
        // prefixの中から単一キーワードを探す（右から左、短いものを優先）
        for (let j = prefix.length - 1; j > 0; j--) {
          // 各位置から、短い方から長い方へチェック
          for (let len = 1; len <= prefix.length - j; len++) {
            const keyword = prefix.substring(j, j + len);
            if (KEYWORDS.has(keyword) && !COMPOUND_KEYWORDS.has(keyword)) {
              // キーワードが見つかった - そこで分割
              const finalPrefix = prefix.substring(0, j);
              this.pos -= (suffix.length + prefix.length - j);
              this.col -= (suffix.length + prefix.length - j);
              return new Token(TOKEN_TYPES.IDENTIFIER, finalPrefix, startLine, startCol);
            }
          }
        }
        
        // prefixにキーワードがない場合は、そのまま返す
        this.pos -= suffix.length;
        this.col -= suffix.length;
        return new Token(TOKEN_TYPES.IDENTIFIER, prefix, startLine, startCol);
      }
      
      // 複合キーワードの一部がsuffixで、残りがlookaheadにある場合
      const savedPos = this.pos;
      const savedCol = this.col;
      let extendedSuffix = suffix;
      
      // スペースをスキップして次の単語を見る
      while (this.pos < this.source.length && this.source[this.pos] === ' ') {
        extendedSuffix += this.source[this.pos];
        this.advance();
      }
      
      // 次の識別子を読む
      if (this.pos < this.source.length && this.isIdentifierStart(this.source[this.pos])) {
        while (this.pos < this.source.length && this.isIdentifierChar(this.source[this.pos])) {
          extendedSuffix += this.source[this.pos];
          this.advance();
        }
        
        const compoundValue = extendedSuffix.replace(/\s+/g, '');
        // 複合キーワードとして存在するかチェック
        if (COMPOUND_KEYWORDS.has(compoundValue)) {
          // 複合キーワードが見つかった - 前半を識別子として返す
          this.pos = savedPos;
          this.col = savedCol;
          const prefix = value.substring(0, i);
          this.pos -= suffix.length;
          this.col -= suffix.length;
          return new Token(TOKEN_TYPES.IDENTIFIER, prefix, startLine, startCol);
        }
      }
      
      // 複合キーワードでない場合は巻き戻し
      this.pos = savedPos;
      this.col = savedCol;
    }
    
    // 次に単一キーワードをチェック
    for (let i = 1; i < value.length; i++) {
      const suffix = value.substring(i);
      if (KEYWORDS.has(suffix)) {
        // 後半がキーワードなので、前半だけを識別子として返す
        const prefix = value.substring(0, i);
        // 位置を巻き戻す
        this.pos -= suffix.length;
        this.col -= suffix.length;
        return new Token(TOKEN_TYPES.IDENTIFIER, prefix, startLine, startCol);
      }
    }

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
    return /[a-zA-Z_あ-んア-ンー一-龯]/.test(char);
  }

  isOperator(char) {
    return /[+\-*/%=<>!()]/.test(char);
  }

  advance() {
    this.pos++;
    this.col++;
  }
}

module.exports = { Lexer, Token, TOKEN_TYPES };
