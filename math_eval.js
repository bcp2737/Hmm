import { world, system } from "@minecraft/server";

// =======================================================
// LỚP SỐ PHỨC (COMPLEX)
// =======================================================
class Complex {
    constructor(re, im = 0) { this.re = re; this.im = im; }
    add(c) { return new Complex(this.re + c.re, this.im + c.im); }
    sub(c) { return new Complex(this.re - c.re, this.im - c.im); }
    mul(c) { return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re); }
    div(c) {
        let d = c.re * c.re + c.im * c.im;
        if (d === 0) throw new Error("Div by zero");
        return new Complex((this.re * c.re + this.im * c.im) / d, (this.im * c.re - this.re * c.im) / d);
    }
    log() { return new Complex(Math.log(Math.hypot(this.re, this.im)), Math.atan2(this.im, this.re)); }
    exp() { let r = Math.exp(this.re); return new Complex(r * Math.cos(this.im), r * Math.sin(this.im)); }
    pow(c) {
        if (this.re === 0 && this.im === 0) {
            if (c.re === 0 && c.im === 0) return new Complex(1, 0);
            if (c.re > 0) return new Complex(0, 0);
            throw new Error("0^z undefined for Re(z)<=0");
        }
        return this.log().mul(c).exp();
    }
    abs() { return new Complex(Math.hypot(this.re, this.im), 0); }
    sin() { return new Complex(Math.sin(this.re) * Math.cosh(this.im), Math.cos(this.re) * Math.sinh(this.im)); }
    cos() { return new Complex(Math.cos(this.re) * Math.cosh(this.im), -Math.sin(this.re) * Math.sinh(this.im)); }
    tan() { return this.sin().div(this.cos()); }
    asin() {
        let i = new Complex(0, 1);
        return (new Complex(0, -1)).mul(i.mul(this).add((new Complex(1, 0)).sub(this.mul(this)).pow(new Complex(0.5, 0))).log());
    }
    acos() { return (new Complex(Math.PI / 2, 0)).sub(this.asin()); }
    atan() {
        let i = new Complex(0, 1), iz = i.mul(this);
        return (new Complex(0, 0.5)).mul((new Complex(1, 0)).sub(iz).log().sub((new Complex(1, 0)).add(iz).log()));
    }

    int() { return new Complex(Math.floor(this.re), Math.floor(this.im)); }
    round() { return new Complex(Math.round(this.re), Math.round(this.im)); }
    ceil() { return new Complex(Math.ceil(this.re), Math.ceil(this.im)); }

    // [NÂNG CẤP] Để det()/inv() dùng chung cơ chế gọi hàm generic với Matrix:
    // với một số vô hướng, "định thức" và "nghịch đảo" của ma trận 1x1 chính là bản thân nó / nghịch đảo phép chia.
    det() { return this; }
    inv() { return (new Complex(1, 0)).div(this); }
}

// ==========================================
// LỚP XỬ LÝ MA TRẬN SỐ PHỨC (MATRIX)
// ==========================================
class Matrix {
    constructor(rows, cols, data = null) {
        this.rows = rows;
        this.cols = cols;
        this.data = data || Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => new Complex(0, 0))
        );
    }

    add(m) {
        if (this.rows !== m.rows || this.cols !== m.cols) throw new Error("Kích thước ma trận không khớp để cộng!");
        let res = new Matrix(this.rows, this.cols);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) res.data[r][c] = this.data[r][c].add(m.data[r][c]);
        }
        return res;
    }

    sub(m) {
        if (this.rows !== m.rows || this.cols !== m.cols) throw new Error("Kích thước ma trận không khớp để trừ!");
        let res = new Matrix(this.rows, this.cols);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) res.data[r][c] = this.data[r][c].sub(m.data[r][c]);
        }
        return res;
    }

    mul(m) {
        if (m instanceof Complex) { // Nhân ma trận với số vô hướng bên phải
            let res = new Matrix(this.rows, this.cols);
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) res.data[r][c] = this.data[r][c].mul(m);
            }
            return res;
        }
        if (m instanceof Matrix) { // Nhân hai ma trận đại số tuyến tính
            if (this.cols !== m.rows) throw new Error("Kích thước ma trận không hợp lệ để nhân (Cols A != Rows B)!");
            let res = new Matrix(this.rows, m.cols);
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < m.cols; c++) {
                    let sum = new Complex(0, 0);
                    for (let k = 0; k < this.cols; k++) sum = sum.add(this.data[r][k].mul(m.data[k][c]));
                    res.data[r][c] = sum;
                }
            }
            return res;
        }
        throw new Error("Phép nhân không hỗ trợ kiểu dữ liệu này!");
    }

    // [SỬA LỖI] Tham số bị đặt trùng tên "c" với biến chạy vòng lặp cột khiến phép
    // chia luôn dùng nhầm chỉ số cột thay vì số phức truyền vào. Đổi tên tham số để sửa.
    divScalar(scalar) {
        let res = new Matrix(this.rows, this.cols);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) res.data[r][c] = this.data[r][c].div(scalar);
        }
        return res;
    }

    // [NÂNG CẤP] Ánh xạ (map) một hàm số phức lên từng phần tử — nền tảng cho mọi
    // phép toán element-wise (sin, cos, log, .*, ./, .pow(a,b), broadcasting, v.v.)
    map(func) {
        let res = new Matrix(this.rows, this.cols);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                res.data[r][c] = func(this.data[r][c]);
            }
        }
        return res;
    }

    // [NÂNG CẤP] Các hàm toán học áp dụng từng phần tử (Element-wise Functions)
    sin() { return this.map(cell => cell.sin()); }
    cos() { return this.map(cell => cell.cos()); }
    tan() { return this.map(cell => cell.tan()); }
    asin() { return this.map(cell => cell.asin()); }
    acos() { return this.map(cell => cell.acos()); }
    atan() { return this.map(cell => cell.atan()); }
    log() { return this.map(cell => cell.log()); }
    abs() { return this.map(cell => cell.abs()); }
    int() { return this.map(cell => cell.int()); }
    round() { return this.map(cell => cell.round()); }
    ceil() { return this.map(cell => cell.ceil()); }

    // [NÂNG CẤP] Chuyển vị & liên hợp
    transpose() { // A.'  (chuyển vị thông thường)
        let res = new Matrix(this.cols, this.rows);
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                res.data[c][r] = this.data[r][c];
        return res;
    }
    conjugate() { return this.map(cell => new Complex(cell.re, -cell.im)); }
    conjTranspose() { return this.transpose().conjugate(); } // A'  (chuyển vị liên hợp)

    // [NÂNG CẤP] Định thức (det) — khử Gauss có chọn phần tử trội (partial pivoting), hỗ trợ số phức
    det() {
        if (this.rows !== this.cols) throw new Error("Định thức chỉ tính được cho ma trận vuông!");
        let n = this.rows;
        let a = this.data.map(row => row.map(cell => new Complex(cell.re, cell.im)));
        let detVal = new Complex(1, 0);
        for (let i = 0; i < n; i++) {
            let pivotRow = i;
            let maxAbs = Math.hypot(a[i][i].re, a[i][i].im);
            for (let k = i + 1; k < n; k++) {
                let mag = Math.hypot(a[k][i].re, a[k][i].im);
                if (mag > maxAbs) { maxAbs = mag; pivotRow = k; }
            }
            if (maxAbs < 1e-12) return new Complex(0, 0);
            if (pivotRow !== i) {
                [a[i], a[pivotRow]] = [a[pivotRow], a[i]];
                detVal = detVal.mul(new Complex(-1, 0));
            }
            detVal = detVal.mul(a[i][i]);
            for (let k = i + 1; k < n; k++) {
                let factor = a[k][i].div(a[i][i]);
                for (let j = i; j < n; j++) a[k][j] = a[k][j].sub(factor.mul(a[i][j]));
            }
        }
        return detVal;
    }

    // [NÂNG CẤP] Nghịch đảo (inv) — Gauss-Jordan trên ma trận mở rộng [A | I]
    inv() {
        if (this.rows !== this.cols) throw new Error("Ma trận nghịch đảo chỉ tính được cho ma trận vuông!");
        let n = this.rows;
        let a = this.data.map(row => row.map(cell => new Complex(cell.re, cell.im)));
        let inv = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => new Complex(r === c ? 1 : 0, 0)));
        for (let i = 0; i < n; i++) {
            let pivotRow = i;
            let maxAbs = Math.hypot(a[i][i].re, a[i][i].im);
            for (let k = i + 1; k < n; k++) {
                let mag = Math.hypot(a[k][i].re, a[k][i].im);
                if (mag > maxAbs) { maxAbs = mag; pivotRow = k; }
            }
            if (maxAbs < 1e-12) throw new Error("Ma trận suy biến (định thức = 0), không có nghịch đảo!");
            if (pivotRow !== i) {
                [a[i], a[pivotRow]] = [a[pivotRow], a[i]];
                [inv[i], inv[pivotRow]] = [inv[pivotRow], inv[i]];
            }
            let pivot = a[i][i];
            for (let j = 0; j < n; j++) {
                a[i][j] = a[i][j].div(pivot);
                inv[i][j] = inv[i][j].div(pivot);
            }
            for (let k = 0; k < n; k++) {
                if (k === i) continue;
                let factor = a[k][i];
                for (let j = 0; j < n; j++) {
                    a[k][j] = a[k][j].sub(factor.mul(a[i][j]));
                    inv[k][j] = inv[k][j].sub(factor.mul(inv[i][j]));
                }
            }
        }
        return new Matrix(n, n, inv);
    }

    // [NÂNG CẤP] Lũy thừa ma trận đại số (A^n = A×A×...×A), hỗ trợ n âm qua nghịch đảo,
    // dùng bình phương nhanh (exponentiation by squaring)
    matPow(nInt) {
        if (this.rows !== this.cols) throw new Error("Lũy thừa ma trận (A^n) chỉ áp dụng cho ma trận vuông!");
        if (nInt < 0) return this.inv().matPow(-nInt);
        let n = this.rows;
        let result = new Matrix(n, n, Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => new Complex(r === c ? 1 : 0, 0))));
        let base = this, exp = nInt;
        while (exp > 0) {
            if (exp & 1) result = result.mul(base);
            base = base.mul(base);
            exp >>= 1;
        }
        return result;
    }

    toString() {
        return "[\n" + this.data.map(row => "  [" + row.map(c => formatComplex(c)).join(", ") + "]").join(",\n") + "\n]";
    }
}

function formatComplex(c) {
    let r = Math.abs(c.re) < 1e-10 ? 0 : parseFloat(c.re.toFixed(5));
    let m = Math.abs(c.im) < 1e-10 ? 0 : parseFloat(c.im.toFixed(5));
    if (m === 0) return `${r}`;
    if (r === 0) return m === 1 ? "i" : m === -1 ? "-i" : `${m}i`;
    return `${r} ${m > 0 ? "+" : "-"} ${Math.abs(m) === 1 ? "i" : Math.abs(m) + "i"}`;
}

// ==========================================
// TOKENIZER
// [NÂNG CẤP] Hỗ trợ thêm [ ], toán tử từng phần tử .* ./ , hàm lũy thừa .pow(a,b),
// chuyển vị .' và ', và các tên hàm mới: det, inv, zeros, ones, eye
// (Không dùng ký tự ^ ở bất kỳ đâu để tránh lỗi khi gõ trong chat Minecraft)
// ==========================================
function tokenize(expr) {
    let tokens = [], i = 0;
    while (i < expr.length) {
        let c = expr[i];
        if (" \t".includes(c)) { i++; continue; }

        // Số (bao gồm số bắt đầu bằng dấu chấm như ".5", nhưng KHÔNG nuốt dấu chấm
        // đứng trước toán tử như trong ".*"/"./"/".'"/".pow(")
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
            let num = "";
            while (i < expr.length && "0123456789.".includes(expr[i])) num += expr[i++];
            if (expr[i] === 'i' && !/[a-zA-Z0-9]/.test(expr[i + 1] || '')) { tokens.push({ type: "Number", value: new Complex(0, Number(num)) }); i++; }
            else tokens.push({ type: "Number", value: new Complex(Number(num), 0) });
            continue;
        }

        // Toán tử từng phần tử bắt đầu bằng dấu chấm: .*  ./  .'  và hàm .pow(a, b)
        // (Lũy thừa từng phần tử dùng dạng hàm .pow(...) thay vì .^ để tránh ký tự ^ trong chat Minecraft)
        if (c === '.') {
            let next = expr[i + 1];
            if (next === '*' || next === '/') {
                tokens.push({ type: "Operator", value: "." + next });
                i += 2;
                continue;
            }
            if (next === "'") {
                tokens.push({ type: "Operator", value: ".'" });
                i += 2;
                continue;
            }
            if (expr.slice(i + 1, i + 4) === "pow" && !/[a-zA-Z0-9]/.test(expr[i + 4] || '')) {
                tokens.push({ type: "Function", value: "dotpow" });
                i += 4;
                continue;
            }
            throw new Error("Invalid: .");
        }

        // Toán tử đơn ký tự (đã thêm '; bỏ ^ vì có thể gây lỗi khi gõ trong chat Minecraft)
        if ("+-*/();,[]'".includes(c)) { tokens.push({ type: "Operator", value: c }); i++; continue; }

        if (/[a-zA-Z]/.test(c)) {
            let name = "";
            while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) name += expr[i++];
            if (name === "x") tokens.push({ type: "Variable", value: "x" });
            else if (name === "i") tokens.push({ type: "Number", value: new Complex(0, 1) });
            else if (["sin", "cos", "tan", "asin", "acos", "atan", "log", "pow", "deriv", "integ", "abs", "solve", "int", "round", "ceil", "det", "inv", "zeros", "ones", "eye"].includes(name)) {
                tokens.push({ type: "Function", value: name });
            }
            else throw new Error("Unknown: " + name);
            continue;
        }
        throw new Error("Invalid: " + c);
    }
    return tokens;
}

// ==========================================
// PARSER
// [NÂNG CẤP] Hỗ trợ hậu tố chuyển vị (' , .'), hàm pow(a,b) [đại số] và .pow(a,b)
// [từng phần tử] (không dùng ký tự ^ để tránh lỗi khi gõ trong chat Minecraft),
// phân tích ma trận, và các hàm zeros/ones/eye
// ==========================================
function parse(tokens) {
    let cursor = 0;
    const peek = () => tokens[cursor];
    const consume = () => tokens[cursor++];

    const parseExpr = () => {
        let left = parseTerm();
        while (peek() && "+-".includes(peek().value)) left = { type: "BinaryOp", op: consume().value, left, right: parseTerm() };
        return left;
    };

    const parseTerm = () => {
        let left = parseFactor();
        while (peek() && ["*", "/", ".*", "./"].includes(peek().value)) left = { type: "BinaryOp", op: consume().value, left, right: parseFactor() };
        return left;
    };

    // Hậu tố chuyển vị: A'  (liên hợp) và A.' (thường)
    const parseFactor = () => {
        let node = parsePrimary();
        while (peek() && (peek().value === "'" || peek().value === ".'")) {
            let op = consume().value;
            node = { type: op === "'" ? "ConjTranspose" : "Transpose", expr: node };
        }
        return node;
    };

    const parsePrimary = () => {
        let token = peek();
        if (!token) throw new Error("EOF");

        // --- CÚ PHÁP MA TRẬN MATLAB [...] ---
        if (token.value === "[") {
            consume();
            let rows = [];
            let currentRow = [];
            while (peek() && peek().value !== "]") {
                let element = parseExpr();
                currentRow.push(element);
                if (peek() && peek().value === ",") {
                    consume();
                } else if (peek() && peek().value === ";") {
                    consume();
                    rows.push(currentRow);
                    currentRow = [];
                }
            }
            if (currentRow.length > 0) rows.push(currentRow);
            if (!peek() || peek().value !== "]") throw new Error("Thiếu dấu đóng ngoặc vuông ']' cho ma trận!");
            consume();
            return { type: "MatrixLiteral", rows };
        }

        if (token.value === "-") { consume(); return { type: "BinaryOp", op: "*", left: { type: "Number", value: new Complex(-1, 0) }, right: parseFactor() }; }
        if (token.value === "+") { consume(); return parseFactor(); }
        if (token.type === "Number") return { type: "Number", value: consume().value };
        if (token.type === "Variable") return { type: "Variable", name: consume().value };
        if (token.type === "Function") {
            let func = consume().value; consume();
            if (func === "pow") { let b = parseExpr(); consume(); let e = parseExpr(); consume(); return { type: "Pow", base: b, exponent: e }; }
            if (func === "dotpow") { let b = parseExpr(); consume(); let e = parseExpr(); consume(); return { type: "BinaryOp", op: ".^", left: b, right: e }; }
            if (func === "deriv") { let e = parseExpr(); consume(); let x = parseExpr(); consume(); return { type: "Deriv", expr: e, xVal: x }; }
            if (func === "solve") { let e = parseExpr(); consume(); let g = parseExpr(); consume(); return { type: "Solve", expr: e, guess: g }; }
            if (func === "integ") { let e = parseExpr(); consume(); let a = parseExpr(); consume(); let b = parseExpr(); consume(); return { type: "Integ", expr: e, a, b }; }
            if (func === "zeros" || func === "ones") { let r = parseExpr(); consume(); let c = parseExpr(); consume(); return { type: "MatrixUtil", name: func, rows: r, cols: c }; }
            if (func === "eye") { let n = parseExpr(); consume(); return { type: "MatrixUtil", name: func, n }; }
            let arg = parseExpr(); consume(); return { type: "Function", name: func, arg };
        }
        if (token.value === "(") { consume(); let node = parseExpr(); consume(); return node; }
        throw new Error("Bad token: " + token.value);
    };
    let result = parseExpr();
    // [SỬA LỖI] Trước đây parser không kiểm tra token dư thừa cuối chuỗi, nên các cú pháp
    // sai (vd: gọi kiểu method "A.pow(2)" — không được hỗ trợ, phải viết ".pow(A, 2)")
    // bị âm thầm bỏ qua phần dư và trả về kết quả sai thay vì báo lỗi rõ ràng.
    if (cursor < tokens.length) throw new Error("Cú pháp dư thừa, không mong đợi: '" + tokens[cursor].value + "'");
    return result;
}

function diffSymbolic(node) {
    if (node.type === "Number" || node.type === "MatrixLiteral") return { type: "Number", value: new Complex(0, 0) };
    if (node.type === "Variable") return node.name === "x" ? { type: "Number", value: new Complex(1, 0) } : { type: "Number", value: new Complex(0, 0) };
    if (node.type === "BinaryOp") {
        if (node.op === "+" || node.op === "-") return { type: "BinaryOp", op: node.op, left: diffSymbolic(node.left), right: diffSymbolic(node.right) };
        if (node.op === "*" || node.op === ".*") {
            return { type: "BinaryOp", op: "+",
                left: { type: "BinaryOp", op: node.op, left: diffSymbolic(node.left), right: node.right },
                right: { type: "BinaryOp", op: node.op, left: node.left, right: diffSymbolic(node.right) }
            };
        }
        if (node.op === "/" || node.op === "./") {
            let num = { type: "BinaryOp", op: "-",
                left: { type: "BinaryOp", op: node.op === "/" ? "*" : ".*", left: diffSymbolic(node.left), right: node.right },
                right: { type: "BinaryOp", op: node.op === "/" ? "*" : ".*", left: node.left, right: diffSymbolic(node.right) }
            };
            return { type: "BinaryOp", op: node.op, left: num, right: { type: "BinaryOp", op: node.op === "/" ? "*" : ".*", left: node.right, right: node.right } };
        }
    }
    if (node.type === "Pow") {
        let u = node.base, v = node.exponent;
        let du = diffSymbolic(u), dv = diffSymbolic(v);
        let t1 = { type: "BinaryOp", op: "*", left: dv, right: { type: "Function", name: "log", arg: u } };
        let t2 = { type: "BinaryOp", op: "*", left: v, right: { type: "BinaryOp", op: "/", left: du, right: u } };
        return { type: "BinaryOp", op: "*", left: node, right: { type: "BinaryOp", op: "+", left: t1, right: t2 } };
    }
    if (node.type === "Function") {
        let u = node.arg, du = diffSymbolic(u), one = { type: "Number", value: new Complex(1, 0) };
        if (node.name === "abs") throw new Error("abs is non-holomorphic");
        if (["int", "round", "ceil", "det", "inv"].includes(node.name)) return { type: "Number", value: new Complex(0, 0) };
        if (node.name === "sin") return { type: "BinaryOp", op: "*", left: { type: "Function", name: "cos", arg: u }, right: du };
        if (node.name === "cos") return { type: "BinaryOp", op: "*", left: { type: "BinaryOp", op: "*", left: { type: "Number", value: new Complex(-1, 0) }, right: { type: "Function", name: "sin", arg: u } }, right: du };
        if (node.name === "tan") return { type: "BinaryOp", op: "/", left: du, right: { type: "BinaryOp", op: "*", left: { type: "Function", name: "cos", arg: u }, right: { type: "Function", name: "cos", arg: u } } };
        if (node.name === "log") return { type: "BinaryOp", op: "/", left: du, right: u };
        if (node.name === "asin") {
            let u2 = { type: "BinaryOp", op: "*", left: u, right: u };
            let sqrt = { type: "Pow", base: { type: "BinaryOp", op: "-", left: one, right: u2 }, exponent: { type: "Number", value: new Complex(0.5, 0) } };
            return { type: "BinaryOp", op: "/", left: du, right: sqrt };
        }
        if (node.name === "acos") return { type: "BinaryOp", op: "*", left: { type: "Number", value: new Complex(-1, 0) }, right: diffSymbolic({ type: "Function", name: "asin", arg: u }) };
        if (node.name === "atan") {
            let u2 = { type: "BinaryOp", op: "*", left: u, right: u };
            return { type: "BinaryOp", op: "/", left: du, right: { type: "BinaryOp", op: "+", left: one, right: u2 } };
        }
    }
    return { type: "Number", value: new Complex(0, 0) };
}

// [NÂNG CẤP] Hàm hỗ trợ dùng chung cho phép cộng/trừ có broadcasting và các
// toán tử từng phần tử .* ./ và hàm .pow(a,b) — tự động phát hiện Matrix hay Complex ở hai vế.
function broadcastBinary(l, r, op) {
    if (l instanceof Matrix && r instanceof Matrix) {
        if (l.rows !== r.rows || l.cols !== r.cols) throw new Error("Kích thước ma trận không khớp để thực hiện phép toán từng phần tử!");
        let res = new Matrix(l.rows, l.cols);
        for (let i = 0; i < l.rows; i++)
            for (let j = 0; j < l.cols; j++)
                res.data[i][j] = op(l.data[i][j], r.data[i][j]);
        return res;
    }
    if (l instanceof Matrix) return l.map(cell => op(cell, r));
    if (r instanceof Matrix) return r.map(cell => op(l, cell));
    return op(l, r);
}

// ==========================================
// EVALUATEAST
// [NÂNG CẤP] Broadcasting cho + -, toán tử từng phần tử .* ./, hàm .pow(a,b), chuyển vị,
// định thức/nghịch đảo (dùng chung dispatch generic của "Function"),
// lũy thừa ma trận đại số, và các hàm khởi tạo zeros/ones/eye
// ==========================================
function evaluateAST(node, context) {
    switch (node.type) {
        case "Number": return node.value;
        case "Variable": return context[node.name];

        case "MatrixLiteral": {
            let evaluatedRows = node.rows.map(row => row.map(cell => evaluateAST(cell, context)));
            let numRows = evaluatedRows.length;
            let numCols = numRows > 0 ? evaluatedRows[0].length : 0;
            for (let r = 1; r < numRows; r++) {
                if (evaluatedRows[r].length !== numCols) throw new Error("Các hàng ma trận không có cùng số lượng phần tử!");
            }
            return new Matrix(numRows, numCols, evaluatedRows);
        }

        case "Transpose": {
            let m = evaluateAST(node.expr, context);
            if (!(m instanceof Matrix)) throw new Error("Phép chuyển vị (.') chỉ áp dụng cho ma trận!");
            return m.transpose();
        }
        case "ConjTranspose": {
            let m = evaluateAST(node.expr, context);
            if (!(m instanceof Matrix)) throw new Error("Phép chuyển vị liên hợp (') chỉ áp dụng cho ma trận!");
            return m.conjTranspose();
        }

        case "MatrixUtil": {
            if (node.name === "eye") {
                let n = evaluateAST(node.n, context);
                let size = Math.round(n.re);
                if (size <= 0) throw new Error("Kích thước ma trận phải là số nguyên dương!");
                let data = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => new Complex(r === c ? 1 : 0, 0)));
                return new Matrix(size, size, data);
            }
            let rEval = evaluateAST(node.rows, context), cEval = evaluateAST(node.cols, context);
            let rows = Math.round(rEval.re), cols = Math.round(cEval.re);
            if (rows <= 0 || cols <= 0) throw new Error("Kích thước ma trận phải là số nguyên dương!");
            let fillVal = node.name === "ones" ? 1 : 0;
            let data = Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Complex(fillVal, 0)));
            return new Matrix(rows, cols, data);
        }

        case "BinaryOp": {
            let l = evaluateAST(node.left, context), r = evaluateAST(node.right, context);
            switch (node.op) {
                case "+": return broadcastBinary(l, r, (a, b) => a.add(b));
                case "-": return broadcastBinary(l, r, (a, b) => a.sub(b));
                case ".*": return broadcastBinary(l, r, (a, b) => a.mul(b));
                case "./": return broadcastBinary(l, r, (a, b) => a.div(b));
                case ".^": return broadcastBinary(l, r, (a, b) => a.pow(b));
                case "*":
                    if (l instanceof Matrix && r instanceof Matrix) return l.mul(r);
                    if (l instanceof Matrix && r instanceof Complex) return l.map(cell => cell.mul(r));
                    if (l instanceof Complex && r instanceof Matrix) return r.map(cell => l.mul(cell));
                    return l.mul(r);
                case "/":
                    if (l instanceof Matrix && r instanceof Complex) return l.divScalar(r);
                    if (l instanceof Matrix && r instanceof Matrix) return l.mul(r.inv());
                    if (r instanceof Matrix) throw new Error("Không hỗ trợ Số phức chia cho Ma trận trực tiếp! Hãy dùng: x .* inv(A)");
                    return l.div(r);
                default: throw new Error("Toán tử không xác định: " + node.op);
            }
        }
        case "Pow": {
            let base = evaluateAST(node.base, context);
            let exp = evaluateAST(node.exponent, context);
            if (base instanceof Matrix) {
                let nRounded = Math.round(exp.re);
                if (Math.abs(exp.im) > 1e-9 || Math.abs(exp.re - nRounded) > 1e-9) throw new Error("Số mũ trong pow(A, n) phải là số nguyên thực! Dùng .pow(A, n) để lũy thừa từng phần tử.");
                return base.matPow(nRounded);
            }
            return base.pow(exp);
        }
        case "Function": return evaluateAST(node.arg, context)[node.name]();
        case "Deriv": return evaluateAST(diffSymbolic(node.expr), Object.assign({}, context, { x: evaluateAST(node.xVal, context) }));
        case "Solve": {
            let expr = node.expr, diffAST = diffSymbolic(expr), z = evaluateAST(node.guess, context);
            for (let i = 0; i < 64; i++) {
                let ctx = Object.assign({}, context, { x: z });
                let fz = evaluateAST(expr, ctx), dfz = evaluateAST(diffAST, ctx);
                if (Math.hypot(dfz.re, dfz.im) < 1e-9) { z = z.add(new Complex(1e-3, 1e-3)); continue; }
                let nextZ = z.sub(fz.div(dfz));
                if (Math.hypot(nextZ.re - z.re, nextZ.im - z.im) < 1e-7) { z = nextZ; break; }
                z = nextZ;
            }
            return z;
        }
        case "Integ": {
            let a = evaluateAST(node.a, context), b = evaluateAST(node.b, context), steps = 1000, dt = 1 / steps, diff = b.sub(a);
            let sum = evaluateAST(node.expr, Object.assign({}, context, { x: a })).add(evaluateAST(node.expr, Object.assign({}, context, { x: b }))).mul(new Complex(0.5, 0));
            for (let i = 1; i < steps; i++) sum = sum.add(evaluateAST(node.expr, Object.assign({}, context, { x: a.add(diff.mul(new Complex(i * dt, 0))) })));
            return sum.mul(new Complex(dt, 0)).mul(diff);
        }
    }
}

// =======================================================
// ĐĂNG KÝ SỰ KIỆN CHAT
// [SỬA LỖI] Regex cũ tự ý xóa MỌI dấu ' hoặc " đơn lẻ ở đầu/cuối chuỗi, kể cả khi
// đó là toán tử chuyển vị liên hợp hợp lệ (vd: "A'"). Giờ chỉ bóc cặp dấu nháy khi
// cả đầu VÀ cuối cùng khớp nhau (tức là người chơi thực sự bọc cả biểu thức trong ngoặc kép/đơn).
// [SỬA LỖI] Biến ngữ cảnh "x" trước đây là một Number thô của JS (không có .re/.im),
// khiến mọi biểu thức dùng "x" bị lỗi ngay khi gọi .add()/.mul()/... Nay bọc đúng kiểu Complex.
// =======================================================
system.afterEvents.scriptEventReceive.subscribe(ev => {
    if (ev.id !== "math:eval" || !ev.sourceEntity || ev.sourceEntity.typeId !== "minecraft:player") return;
    try {
        let rawMsg = ev.message.trim();
        if ((rawMsg.startsWith('"') && rawMsg.endsWith('"')) || (rawMsg.startsWith("'") && rawMsg.endsWith("'"))) {
            rawMsg = rawMsg.slice(1, -1).trim();
        }

        // --- BỘ TÁCH CHUỖI THÔNG MINH (Smart Splitter) ---
        // Bỏ qua dấu ';' nằm bên trong cặp ngoặc vuông [...] của Ma trận
        let msg = [];
        let bracketLevel = 0;
        let currentToken = "";
        for (let i = 0; i < rawMsg.length; i++) {
            let char = rawMsg[i];
            if (char === '[') bracketLevel++;
            if (char === ']') bracketLevel--;
            if (char === ';' && bracketLevel === 0) {
                msg.push(currentToken.trim());
                currentToken = "";
            } else {
                currentToken += char;
            }
        }
        msg.push(currentToken.trim());

        // Thực thi tính toán biểu thức (ở phần tử mảng đầu tiên)
        let xValue = msg[1] ? parseFloat(msg[1]) : 0;
        let result = evaluateAST(parse(tokenize(msg[0])), { x: new Complex(isNaN(xValue) ? 0 : xValue, 0) });

        // Trả về định dạng hiển thị tùy thuộc vào kiểu dữ liệu kết quả
        if (result instanceof Matrix) {
            ev.sourceEntity.sendMessage(result.toString());
        } else {
            ev.sourceEntity.sendMessage(formatComplex(result));
        }
    } catch (e) {
        ev.sourceEntity.sendMessage("Lỗi: " + e.message);
    }
});

export { Complex, Matrix, tokenize, parse, evaluateAST, formatComplex };