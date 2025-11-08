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

module.exports = { Lexer, Token, TOKEN_TYPES };
