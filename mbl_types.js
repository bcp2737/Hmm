import { evaluateMBLAST } from "./mbl_evaluator.js";

export class Environment {
    constructor(parent = null) { this.vars = new Map(); this.parent = parent; }
    set(name, value) { this.vars.set(name, value); return value; }
    assign(name, value) {
        if (this.vars.has(name)) { this.vars.set(name, value); return value; }
        if (this.parent) return this.parent.assign(name, value);
        this.vars.set(name, value); return value;
    }
    get(name) {
        if (this.vars.has(name)) return this.vars.get(name);
        if (this.parent) return this.parent.get(name);
        throw new Error(`Biến chưa được định nghĩa: ${name}`);
    }
    
    getAllVars(obj = {}) {
        for (let [k, v] of this.vars) { if (!(k in obj)) obj[k] = v; }
        if (this.parent) this.parent.getAllVars(obj);
        return obj;
    }
}

export class ReturnSignal { constructor(value) { this.value = value; } }
export class BreakSignal {}
export class ContinueSignal {}
export class MBLThrow { constructor(value) { this.value = value; } }

export class MBLClass {
    constructor(name, methods, superClass, closureEnv) {
        this.name = name; this.methods = methods; this.superClass = superClass; this.closureEnv = closureEnv;
    }
    findMethodOwner(name) {
        if (this.methods[name]) return { method: this.methods[name], owner: this };
        if (this.superClass) return this.superClass.findMethodOwner(name);
        return null;
    }
}

export class MBLInstance {
    constructor(cls) { this.cls = cls; this.fields = new Map(); }
}

export class MBLFunction {
    constructor(params, body, closure) { this.params = params; this.body = body; this.closure = closure; }
    async call(args, state) {
        if (!state) state = {};

        let env = new Environment(this.closure);

        for (let i = 0; i < this.params.length; i++) {
            env.set(this.params[i], args[i] ?? null);
        }

        try {
            return await evaluateMBLAST(this.body, env, state);
        } catch (signal) {
            if (signal instanceof ReturnSignal) return signal.value;
            throw signal;
        }
    }
}