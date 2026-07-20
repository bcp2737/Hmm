export function tokenizeMBL(expr) {
    let tokens = [], i = 0;
    while (i < expr.length) {
        let c = expr[i];
        let startPos = i;
        if (" \t\n\r".includes(c)) { i++; continue; }
        if (c === '"') {
            let str = ""; i++;
            while (i < expr.length && expr[i] !== '"') {
                if (expr[i] === '\\' && i + 1 < expr.length) {
                    let next = expr[i + 1];
                    switch (next) {
                        case 'n': str += '\n'; break;
                        case 't': str += '\t'; break;
                        case '"': str += '"'; break;
                        case '\\': str += '\\'; break;
                        default: str += next;
                    }
                    i += 2;
                } else {
                    str += expr[i++];
                }
            }
            i++; 
            tokens.push({ type: "String", value: str, pos: startPos });
            continue;
        }
        if ("+-*/%".includes(c)) {
            let next = expr[i + 1];
            if ((c === '+' && next === '+') || (c === '-' && next === '-')) {
                tokens.push({ type: "Operator", value: c + c, pos: startPos }); i += 2; continue;
            }
            if (next === '=') {
                tokens.push({ type: "Operator", value: c + "=", pos: startPos }); i += 2; continue;
            }
            tokens.push({ type: "Operator", value: c, pos: startPos }); i++; continue;
        }
        if ("();,[]{}".includes(c)) { tokens.push({ type: "Operator", value: c, pos: startPos }); i++; continue; }
        if ("=!<>".includes(c)) {
            let next = expr[i+1];
            if (next === '=') { tokens.push({ type: "Operator", value: c + "=", pos: startPos }); i += 2; }
            else { tokens.push({ type: "Operator", value: c, pos: startPos }); i++; }
            continue;
        }
        if (c === '&' && expr[i+1] === '&') { tokens.push({ type: "Operator", value: "&&", pos: startPos }); i += 2; continue; }
        if (c === '|' && expr[i+1] === '|') { tokens.push({ type: "Operator", value: "||", pos: startPos }); i += 2; continue; }
        if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(expr[i + 1] || ""))) {
            let num = ""; while (i < expr.length && "0123456789.".includes(expr[i])) num += expr[i++];
            tokens.push({ type: "Number", value: Number(num), pos: startPos }); continue;
        }
        if (c === ".") { tokens.push({ type: "Operator", value: ".", pos: startPos }); i++; continue; }
        if (/[a-zA-Z_]/.test(c)) {
            let name = ""; while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) name += expr[i++];
            if (["if", "else", "while", "for", "break", "continue", "function", "return", "print",
                 "try", "catch", "finally", "throw", "class", "extends", "new", "super", "import", "let"].includes(name)) {
                tokens.push({ type: "Keyword", value: name, pos: startPos });
            } else tokens.push({ type: "Identifier", value: name, pos: startPos });
            continue;
        }
        throw new Error(`Ký tự không hợp lệ tại vị trí ${i}: ${c}`);
    }
    return tokens;
}

export function parseMBL(tokens, rawCode = "") {
    let cursor = 0;
    let parseDepth = 0;
    const MAX_PARSE_DEPTH = 150;

    const enterParse = () => {
        parseDepth++;
        if (parseDepth > MAX_PARSE_DEPTH) throw new Error("Cú pháp lồng nhau quá sâu (Expression nested too deeply).");
    };
    const exitParse = () => { parseDepth--; };

    const peek = () => tokens[cursor];
    
    const throwError = (msg, token = null) => {
        let t = token || peek() || tokens[tokens.length - 1];
        if (t && rawCode) {
            let pos = t.pos;
            let startLine = Math.max(0, pos - 25);
            let endLine = Math.min(rawCode.length, pos + 25);
            let snippet = rawCode.slice(startLine, endLine).replace(/\n/g, " ");
            let caretPos = pos - startLine;
            let caret = " ".repeat(caretPos) + "^";
            throw new Error(`${msg}\nBối cảnh:\n... ${snippet} ...\n    ${caret}`);
        }
        throw new Error(msg + (t ? ` gần '${t.value}'` : " (EOF)"));
    };

    const consume = (expected = null) => {
        let t = tokens[cursor++]; if (!t) throwError(`Kết thúc tập tin đột ngột (EOF). Mong đợi '${expected || "token"}'`);
        if (expected && t.value !== expected) {
            throwError(`Mong đợi '${expected}' nhưng nhận được '${t.value}'`, t);
        }
        return t;
    };

    const parseStatement = () => {
        enterParse();
        try {
            let token = peek(); if (!token) return null;
            if (token.value === ";") { consume(";"); return { type: "Empty" }; }
            if (token.value === "{") { 
                consume(); 
                let body = []; 
                while (peek() && peek().value !== "}") { 
                    let stmt = parseStatement(); 
                    if (stmt) body.push(stmt); 
                } 
                consume("}"); 
                return { type: "Block", body }; 
            }
            if (token.type === "Keyword") {
                switch (token.value) {
                    case "let": {
                        consume();
                        let varName = consume().value;
                        let initVal = null;
                        if (peek() && peek().value === "=") {
                            consume("=");
                            initVal = parseExpr();
                        }
                        if (peek() && peek().value === ";") consume();
                        return { type: "LetDecl", name: varName, value: initVal };
                    }
                    case "if": consume(); consume("("); let cond = parseExpr(); consume(")"); let thenBranch = parseStatement(); let elseBranch = null; if (peek() && peek().value === "else") { consume(); elseBranch = parseStatement(); } return { type: "If", cond, thenBranch, elseBranch };
                    case "while": consume(); consume("("); let wCond = parseExpr(); consume(")"); return { type: "While", cond: wCond, body: parseStatement() };
                    case "for": {
                        consume(); 
                        consume("(");
                        
                        let init = null;
                        if (peek() && peek().value !== ";") {
                            if (peek().type === "Keyword" && peek().value === "let") {
                                consume();
                                let varName = consume().value;
                                let initVal = null;
                                if (peek() && peek().value === "=") {
                                    consume("=");
                                    initVal = parseExpr();
                                }
                                init = { type: "LetDecl", name: varName, value: initVal };
                            } else {
                                init = parseExpr();
                            }
                        }
                        consume(";");
                        
                        let fCond = null;
                        if (peek() && peek().value !== ";") {
                            fCond = parseExpr();
                        } else {
                            fCond = { type: "Number", value: 1 };
                        }
                        consume(";");
                        
                        let update = null;
                        if (peek() && peek().value !== ")") {
                            update = parseExpr();
                        }
                        consume(")");
                        
                        return { type: "For", init, cond: fCond, update, body: parseStatement() };
                    }
                    case "break": consume(); if(peek() && peek().value === ";") consume(); return { type: "Break" };
                    case "continue": consume(); if(peek() && peek().value === ";") consume(); return { type: "Continue" };
                    case "return": consume(); let rVal = (peek() && peek().value !== ";") ? parseExpr() : null; if(peek() && peek().value === ";") consume(); return { type: "Return", value: rVal };
                    case "function": consume(); let fName = consume().value; consume("("); let params = []; while (peek() && peek().value !== ")") { params.push(consume().value); if (peek() && peek().value === ",") consume(); } consume(")"); return { type: "FunctionDecl", name: fName, params, body: parseStatement() };
                    case "print": consume(); consume("("); let pExpr = parseExpr(); consume(")"); if (peek() && peek().value === ";") consume(); return { type: "Print", expr: pExpr };
                    case "try": {
                        consume();
                        let tryBlock = parseStatement();
                        let errName = null, catchBlock = null, finallyBlock = null;
                        if (peek() && peek().value === "catch") {
                            consume(); consume("(");
                            errName = consume().value;
                            consume(")");
                            catchBlock = parseStatement();
                        }
                        if (peek() && peek().value === "finally") { consume(); finallyBlock = parseStatement(); }
                        if (!catchBlock && !finallyBlock) throwError(`'try' cần có ít nhất một khối 'catch' hoặc 'finally' đi kèm.`);
                        return { type: "Try", tryBlock, errName, catchBlock, finallyBlock };
                    }
                    case "throw": {
                        consume();
                        let tVal = parseExpr();
                        if (peek() && peek().value === ";") consume();
                        return { type: "Throw", expr: tVal };
                    }
                    case "class": {
                        consume();
                        let className = consume().value;
                        let superName = null;
                        if (peek() && peek().value === "extends") { consume(); superName = consume().value; }
                        consume("{");
                        let methods = {};
                        while (peek() && peek().value !== "}") {
                            let methodName = consume().value;
                            consume("(");
                            let mParams = [];
                            while (peek() && peek().value !== ")") { mParams.push(consume().value); if (peek() && peek().value === ",") consume(); }
                            consume(")");
                            let mBody = parseStatement();
                            methods[methodName] = { params: mParams, body: mBody };
                        }
                        consume("}");
                        return { type: "ClassDecl", name: className, superName, methods };
                    }
                    case "import": {
                        consume();
                        let modTok = consume();
                        if (modTok.type !== "String") throwError(`'import' cần tên module dạng chuỗi, ví dụ: import "std";`);
                        if (peek() && peek().value === ";") consume();
                        return { type: "Import", name: modTok.value };
                    }
                }
            }
            let expr = parseExpr(); if (peek() && peek().value === ";") consume(); return expr;
        } finally {
            exitParse();
        }
    };

    const parseProgram = () => { let body = []; while (cursor < tokens.length) { let stmt = parseStatement(); if (stmt) body.push(stmt); } return { type: "Block", body }; };
    
    const parseExpr = () => {
        enterParse();
        try {
            return parseAssignment();
        } finally {
            exitParse();
        }
    };
    
    const parseAssignment = () => { 
        let node = parseLogicalOr(); 
        const compoundOps = ["=", "+=", "-=", "*=", "/=", "%="];
        if (peek() && compoundOps.includes(peek().value)) { 
            let opToken = consume().value;
            let valueNode = parseAssignment();

            if (opToken !== "=") {
                let binOp = opToken[0];
                valueNode = { type: "BinaryOp", op: binOp, left: node, right: valueNode };
            }

            if (node.type === "Variable") {
                return { type: "Assignment", name: node.name, value: valueNode }; 
            }
            if (node.type === "IndexAccess") {
                return { type: "IndexAssignment", object: node.object, index: node.index, value: valueNode };
            }
            if (node.type === "MemberAccess") {
                return { type: "MemberAssignment", object: node.object, property: node.property, value: valueNode };
            }
            throwError(`Không thể gán giá trị: vế trái của '${opToken}' phải là biến, phần tử mảng, hoặc thuộc tính đối tượng.`);
        } 
        return node; 
    };
    
    const parseLogicalOr = () => { let left = parseLogicalAnd(); while (peek() && peek().value === "||") { consume(); left = { type: "BinaryOp", op: "||", left, right: parseLogicalAnd() }; } return left; };
    const parseLogicalAnd = () => { let left = parseEquality(); while (peek() && peek().value === "&&") { consume(); left = { type: "BinaryOp", op: "&&", left, right: parseEquality() }; } return left; };
    const parseEquality = () => { let left = parseComparison(); while (peek() && ["==", "!="].includes(peek().value)) { let op = consume().value; left = { type: "BinaryOp", op, left, right: parseComparison() }; } return left; };
    const parseComparison = () => { let left = parseArith(); while (peek() && ["<", "<=", ">", ">="].includes(peek().value)) { let op = consume().value; left = { type: "BinaryOp", op, left, right: parseArith() }; } return left; };
    const parseArith = () => { let left = parseTerm(); while (peek() && "+-".includes(peek().value)) { let op = consume().value; left = { type: "BinaryOp", op, left, right: parseTerm() }; } return left; };
    const parseTerm = () => { let left = parseUnary(); while (peek() && "*/%".includes(peek().value)) { let op = consume().value; left = { type: "BinaryOp", op, left, right: parseUnary() }; } return left; };
    const parseUnary = () => { if (peek() && (peek().value === "!" || peek().value === "-")) { let op = consume().value; return { type: "UnaryOp", op, right: parseUnary() }; } return parseCall(); };
    
    const parseCall = () => { 
        let node = parsePrimary(); 
        while (peek() && (peek().value === "(" || peek().value === "[" || peek().value === ".")) {
            if (peek().value === "(") {
                consume("("); let args = []; while (peek() && peek().value !== ")") { args.push(parseExpr()); if (peek() && peek().value === ",") consume(); } consume(")"); 
                if (node.type === "Variable") {
                    node = { type: "Call", callee: node.name, args };
                } else if (node.type === "MemberAccess") {
                    node = { type: "MethodCall", object: node.object, method: node.property, args };
                } else if (node.type === "Super") {
                    node = { type: "SuperCall", args };
                } else {
                    throwError("Chỉ có thể gọi hàm từ một tên biến hoặc một phương thức của đối tượng.");
                }
            } else if (peek().value === "[") {
                consume("["); let index = parseExpr(); consume("]");
                node = { type: "IndexAccess", object: node, index };
            } else if (peek().value === ".") {
                consume(".");
                let propTok = consume();
                node = { type: "MemberAccess", object: node, property: propTok.value };
            }
        }
        if (peek() && (peek().value === "++" || peek().value === "--")) {
            let op = consume().value;
            if (node.type !== "Variable" && node.type !== "IndexAccess") {
                throwError(`Toán tử '${op}' chỉ áp dụng được cho biến hoặc phần tử mảng.`);
            }
            node = { type: "UpdateExpr", op, target: node };
        }
        return node; 
    };
    
    const parsePrimary = () => { 
        let t = consume(); 
        if (t.type === "Number") return { type: "Number", value: t.value }; 
        if (t.type === "String") return { type: "String", value: t.value }; 
        if (t.type === "Keyword" && t.value === "new") {
            let className = consume().value;
            consume("(");
            let args = [];
            while (peek() && peek().value !== ")") { args.push(parseExpr()); if (peek() && peek().value === ",") consume(); }
            consume(")");
            return { type: "New", className, args };
        }
        if (t.type === "Keyword" && t.value === "super") return { type: "Super" };
        if (t.type === "Identifier") return { type: "Variable", name: t.value }; 
        if (t.value === "(") { let n = parseExpr(); consume(")"); return n; } 
        if (t.value === "[") {
            let elements = [];
            while (peek() && peek().value !== "]") {
                elements.push(parseExpr());
                if (peek() && peek().value === ",") consume();
            }
            consume("]");
            return { type: "ArrayLiteral", elements };
        }
        throwError(`Token không mong đợi: ${t.value}`, t); 
    };
    return parseProgram();
}