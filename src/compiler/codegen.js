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

module.exports = { CodeGenerator };
