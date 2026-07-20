import { Complex } from "./math_eval.js";
import { 
    Environment, ReturnSignal, BreakSignal, ContinueSignal, MBLThrow, 
    MBLClass, MBLInstance, MBLFunction 
} from "./mbl_types.js";
import { stringifyMBL, isMBLStrictEqual } from "./mbl_helpers.js";
import { loadMBLModule } from "./mbl_modules.js";

export async function invokeMethod(instance, method, owner, args, state) {
    if (!state) state = {};

    let methodEnv = new Environment(owner.closureEnv);
    methodEnv.set("this", instance);
    methodEnv.set("__class", owner);

    for (let i = 0; i < method.params.length; i++) {
        methodEnv.set(method.params[i], args[i] ?? null);
    }

    try {
        await evaluateMBLAST(method.body, methodEnv, state);
    } catch (signal) {
        if (signal instanceof ReturnSignal) return signal.value;
        throw signal;
    }
    return null;
}

export async function callMethodByName(instance, cls, methodName, args, state) {
    let found = cls.findMethodOwner(methodName);
    if (!found) throw new Error(`Lớp '${cls.name}' không có phương thức: ${methodName}`);
    return await invokeMethod(instance, found.method, found.owner, args, state);
}

export const MBL_AST_DISPATCH = {
    "Block": async (node, env, state) => {
        let blockEnv = new Environment(env);
        let last = null;
        for (let stmt of node.body) last = await evaluateMBLAST(stmt, blockEnv, state);
        return last;
    },
    "LetDecl": async (node, env, state) => {
        let val = node.value ? await evaluateMBLAST(node.value, env, state) : null;
        env.set(node.name, val);
        return val;
    },
    "FunctionDecl": async (node, env, state) => {
        return env.set(node.name, new MBLFunction(node.params, node.body, env));
    },
    "Assignment": async (node, env, state) => {
        return env.assign(node.name, await evaluateMBLAST(node.value, env, state));
    },
    "Variable": async (node, env, state) => {
        return env.get(node.name);
    },
    "Number": async (node) => node.value,
    "String": async (node) => node.value,
    "If": async (node, env, state) => {
        return await evaluateMBLAST(node.cond, env, state) 
            ? await evaluateMBLAST(node.thenBranch, env, state) 
            : await evaluateMBLAST(node.elseBranch, env, state);
    },
    "While": async (node, env, state) => {
        while (await evaluateMBLAST(node.cond, env, state)) {
            try {
                await evaluateMBLAST(node.body, env, state);
            } catch (s) {
                if (s instanceof BreakSignal) break;
                if (s instanceof ContinueSignal) continue;
                throw s;
            }
        }
        return null;
    },
    "For": async (node, env, state) => {
        let forEnv = new Environment(env);
        if (node.init) await evaluateMBLAST(node.init, forEnv, state);
        while (await evaluateMBLAST(node.cond, forEnv, state)) {
            try {
                await evaluateMBLAST(node.body, forEnv, state);
            } catch (s) {
                if (s instanceof BreakSignal) break;
                if (s instanceof ContinueSignal) {
                    if (node.update) await evaluateMBLAST(node.update, forEnv, state);
                    continue;
                }
                throw s;
            }
            if (node.update) await evaluateMBLAST(node.update, forEnv, state);
        }
        return null;
    },
    "Break": async () => { throw new BreakSignal(); },
    "Continue": async () => { throw new ContinueSignal(); },
    "Return": async (node, env, state) => {
        throw new ReturnSignal(node.value ? await evaluateMBLAST(node.value, env, state) : null);
    },
    "Try": async (node, env, state) => {
        let pending = null;
        try {
            await evaluateMBLAST(node.tryBlock, env, state);
        } catch (err) {
            if (err instanceof BreakSignal || err instanceof ContinueSignal || err instanceof ReturnSignal) {
                pending = err;
            } else if (node.catchBlock) {
                let catchEnv = new Environment(env);
                let errValue = (err instanceof MBLThrow) ? err.value : String(err?.message ?? err);
                catchEnv.set(node.errName, errValue);
                try { await evaluateMBLAST(node.catchBlock, catchEnv, state); }
                catch (catchErr) { pending = catchErr; }
            } else {
                pending = err;
            }
        }
        if (node.finallyBlock) {
            try { await evaluateMBLAST(node.finallyBlock, env, state); }
            catch (finallyErr) { pending = finallyErr; }
        }
        if (pending) throw pending;
        return null;
    },
    "Throw": async (node, env, state) => {
        throw new MBLThrow(await evaluateMBLAST(node.expr, env, state));
    },
    "ArrayLiteral": async (node, env, state) => {
        let res = [];
        for (let el of node.elements) res.push(await evaluateMBLAST(el, env, state));
        return res;
    },
    "IndexAccess": async (node, env, state) => {
        let obj = await evaluateMBLAST(node.object, env, state);
        let idx = await evaluateMBLAST(node.index, env, state);
        if (!Array.isArray(obj) && typeof obj !== "string") throw new Error("Chỉ có thể dùng chỉ số [] trên Mảng hoặc Chuỗi.");
        let numIdx = idx instanceof Complex ? idx.re : Number(idx);
        if (isNaN(numIdx) || !Number.isInteger(numIdx)) {
            throw new Error(`Chỉ số mảng phải là số nguyên hợp lệ, nhận được: ${idx}`);
        }
        if (numIdx < 0 || numIdx >= obj.length) {
            throw new Error(`Chỉ số mảng vượt phạm vi: ${numIdx} (Độ dài mảng/chuỗi là ${obj.length})`);
        }
        return obj[numIdx];
    },
    "IndexAssignment": async (node, env, state) => {
        let obj = await evaluateMBLAST(node.object, env, state);
        let idx = await evaluateMBLAST(node.index, env, state);
        let val = await evaluateMBLAST(node.value, env, state);
        if (!Array.isArray(obj)) throw new Error("Chỉ có thể gán chỉ số trên thực thể Mảng.");
        let numIdx = idx instanceof Complex ? idx.re : Number(idx);
        if (isNaN(numIdx) || !Number.isInteger(numIdx)) {
            throw new Error(`Chỉ số mảng phải là số nguyên hợp lệ, nhận được: ${idx}`);
        }
        if (numIdx < 0) {
            throw new Error(`Chỉ số mảng không được âm: ${numIdx}`);
        }
        
        obj[numIdx] = val;
        return val;
    },
    "MemberAccess": async (node, env, state) => {
        let obj = await evaluateMBLAST(node.object, env, state);
        if (obj instanceof MBLInstance) {
            if (obj.fields.has(node.property)) return obj.fields.get(node.property);
            throw new Error(`Đối tượng lớp '${obj.cls.name}' không có thuộc tính: ${node.property}`);
        }
        let typeStr = typeof obj;
        if (obj === null) typeStr = "null";
        else if (Array.isArray(obj)) typeStr = "Mảng (Array)";
        else if (obj instanceof Complex) typeStr = "Số phức (Complex)";
        else if (obj instanceof MBLClass) typeStr = "Lớp (Class)";
        else if (obj instanceof MBLFunction) typeStr = "Hàm (Function)";
        throw new Error(`Toán tử '.' chỉ dùng được trên đối tượng. Giá trị có kiểu ${typeStr} (${stringifyMBL(obj)}) không thể truy cập thuộc tính '${node.property}'.`);
    },
    "MemberAssignment": async (node, env, state) => {
        let obj = await evaluateMBLAST(node.object, env, state);
        let val = await evaluateMBLAST(node.value, env, state);
        if (!(obj instanceof MBLInstance)) throw new Error(`Chỉ có thể gán thuộc tính trên một đối tượng (object).`);
        obj.fields.set(node.property, val);
        return val;
    },
    "ClassDecl": async (node, env, state) => {
        let superClass = null;
        if (node.superName) {
            superClass = env.get(node.superName);
            if (!(superClass instanceof MBLClass)) throw new Error(`'${node.superName}' không phải là một lớp (class) hợp lệ để kế thừa.`);
            
            let current = superClass;
            while (current) {
                if (current.name === node.name) {
                    throw new Error(`Phát hiện kế thừa vòng (Cyclic inheritance): Lớp '${node.name}' không thể kế thừa chính nó hoặc con của nó.`);
                }
                current = current.superClass;
            }
        }
        return env.set(node.name, new MBLClass(node.name, node.methods, superClass, env));
    },
    "New": async (node, env, state) => {
        let cls = env.get(node.className);
        if (!(cls instanceof MBLClass)) throw new Error(`'${node.className}' không phải là một lớp (class) hợp lệ.`);
        let args = [];
        for (let a of node.args) args.push(await evaluateMBLAST(a, env, state));
        let instance = new MBLInstance(cls);
        let found = cls.findMethodOwner("constructor");
        if (found) await invokeMethod(instance, found.method, found.owner, args, state);
        return instance;
    },
    "SuperCall": async (node, env, state) => {
        let currentClass = env.get("__class");
        let parentClass = currentClass?.superClass;
        if (!parentClass) throw new Error(`Không có lớp cha để gọi 'super(...)'.`);
        let instance = env.get("this");
        let args = [];
        for (let a of node.args) args.push(await evaluateMBLAST(a, env, state));
        let found = parentClass.findMethodOwner("constructor");
        if (found) await invokeMethod(instance, found.method, found.owner, args, state);
        return null;
    },
    "MethodCall": async (node, env, state) => {
        if (node.object.type === "Super") {
            let currentClass = env.get("__class");
            let parentClass = currentClass?.superClass;
            if (!parentClass) throw new Error(`Không có lớp cha để gọi 'super.${node.method}(...)'.`);
            let instance = env.get("this");
            let args = [];
            for (let a of node.args) args.push(await evaluateMBLAST(a, env, state));
            let found = parentClass.findMethodOwner(node.method);
            if (!found) throw new Error(`Lớp cha không có phương thức: ${node.method}`);
            return await invokeMethod(instance, found.method, found.owner, args, state);
        }
        let obj = await evaluateMBLAST(node.object, env, state);
        let args = [];
        for (let a of node.args) args.push(await evaluateMBLAST(a, env, state));
        if (obj instanceof MBLInstance) return await callMethodByName(obj, obj.cls, node.method, args, state);
        throw new Error(`Không thể gọi phương thức '${node.method}' — giá trị không phải là đối tượng.`);
    },
    "Import": async (node, env, state) => {
        let bindings = await loadMBLModule(node.name, env);
        for (let [k, v] of bindings) env.set(k, v);
        return null;
    },
    "UpdateExpr": async (node, env, state) => {
        let delta = node.op === "++" ? 1 : -1;

        if (node.target.type === "Variable") {
            let oldVal = env.get(node.target.name);
            let newVal = (oldVal instanceof Complex) ? oldVal.add(new Complex(delta, 0)) : oldVal + delta;
            env.assign(node.target.name, newVal);
            return oldVal;
        }

        if (node.target.type === "IndexAccess") {
            let obj = await evaluateMBLAST(node.target.object, env, state);
            let idx = await evaluateMBLAST(node.target.index, env, state);
            let numIdx = idx instanceof Complex ? idx.re : Number(idx);
            let oldVal = obj[numIdx];
            let newVal = (oldVal instanceof Complex) ? oldVal.add(new Complex(delta, 0)) : oldVal + delta;
            obj[numIdx] = newVal;
            return oldVal;
        }
        return null;
    },
    "Print": async (node, env, state) => {
        let v = await evaluateMBLAST(node.expr, env, state); 
        env.get("__player")?.sendMessage(`§b[MBL Out] §f${stringifyMBL(v)}`); 
        return v; 
    },
    "UnaryOp": async (node, env, state) => {
        let r = await evaluateMBLAST(node.right, env, state); 
        if (r instanceof Complex) { return node.op === "!" ? null : (new Complex(-1, 0)).mul(r); }
        return node.op === "!" ? !r : -r; 
    },
    "BinaryOp": async (node, env, state) => {
        let l = await evaluateMBLAST(node.left, env, state);
        if (node.op === "&&") return l && await evaluateMBLAST(node.right, env, state);
        if (node.op === "||") return l || await evaluateMBLAST(node.right, env, state);
        let r = await evaluateMBLAST(node.right, env, state);
        
        if (node.op === "+" && (typeof l === "string" || typeof r === "string" || Array.isArray(l) || Array.isArray(r))) {
            return stringifyMBL(l) + stringifyMBL(r);
        }

        if (l instanceof Complex || r instanceof Complex) {
            let compL = l instanceof Complex ? l : new Complex(Number(l), 0);
            let compR = r instanceof Complex ? r : new Complex(Number(r), 0);
            switch (node.op) {
                case "+": return compL.add(compR); case "-": return compL.sub(compR); case "*": return compL.mul(compR);
                case "/": {
                    if (compR.re === 0 && compR.im === 0) throw new Error("Lỗi toán học: Không thể chia một số phức cho 0.");
                    return compL.div(compR);
                }
                case "==": return compL.re === compR.re && compL.im === compR.im;
                case "!=": return compL.re !== compR.re || compL.im !== compR.im;
                default: throw new Error(`Toán tử '${node.op}' không hỗ trợ số phức.`);
            }
        }

        switch (node.op) {
            case "+": return l + r; case "-": return l - r; case "*": return l * r; 
            case "/": {
                if (r === 0) throw new Error("Lỗi toán học: Không thể chia cho 0.");
                return l / r;
            }
            case "%": return l % r;
            case "==": return isMBLStrictEqual(l, r);
            case "!=": return !isMBLStrictEqual(l, r);
            case "<": return l < r; case "<=": return l <= r; case ">": return l > r; case ">=": return l >= r;
        }
    },
    "Call": async (node, env, state) => {
        let fn = env.get(node.callee); 
        let args = [];
        for (let a of node.args) { args.push(await evaluateMBLAST(a, env, state)); }
        
        if (fn instanceof MBLFunction) return await fn.call(args, state); 
        if (typeof fn === "function") {
            return await fn.call(env, ...args);
        }
        throw new Error(`${node.callee} không phải là một hàm.`); 
    },
    "Empty": async () => null
};

export async function evaluateMBLAST(node, env, state) {
    if (!node) return null;
    if (!state) state = {};

    const handler = MBL_AST_DISPATCH[node.type];
    if (!handler) {
        throw new Error(`Loại nút AST không được hỗ trợ: ${node.type}`);
    }

    return await handler(node, env, state);
}