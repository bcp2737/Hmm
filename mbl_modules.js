import { world } from "@minecraft/server";
import { Complex } from "./math_eval.js";
import { Environment, MBLFunction } from "./mbl_types.js";
import { stringifyMBL } from "./mbl_helpers.js";
import { tokenizeMBL, parseMBL } from "./mbl_parser.js";
import { evaluateMBLAST } from "./mbl_evaluator.js";

export const STD_MODULE = new Map([
    ["len", function (x) {
        if (Array.isArray(x) || typeof x === "string") return x.length;
        throw new Error("len() chỉ dùng được cho Mảng hoặc Chuỗi.");
    }],
    ["push", function (arr, val) {
        if (!Array.isArray(arr)) throw new Error("push() chỉ dùng được cho Mảng.");
        arr.push(val ?? null); return arr;
    }],
    ["pop", function (arr) {
        if (!Array.isArray(arr)) throw new Error("pop() chỉ dùng được cho Mảng.");
        return arr.length ? arr.pop() : null;
    }],
    ["split", function (str, sep = "") {
        if (typeof str !== "string") throw new Error("split() chỉ dùng được cho Chuỗi.");
        return String(str).split(String(sep));
    }],
    ["join", function (arr, sep = ",") {
        if (!Array.isArray(arr)) throw new Error("join() chỉ dùng được cho Mảng.");
        return arr.map(stringifyMBL).join(String(sep));
    }],
    ["range", function (a, b = null) {
        let start = b === null ? 0 : Number(a instanceof Complex ? a.re : a);
        let end = b === null ? Number(a instanceof Complex ? a.re : a) : Number(b instanceof Complex ? b.re : b);
        let res = []; for (let i = start; i < end; i++) res.push(i); return res;
    }],
    ["map", async function (arr, fn) {
        if (!Array.isArray(arr)) throw new Error("map() chỉ dùng được cho Mảng.");
        if (!(fn instanceof MBLFunction)) throw new Error("map() cần tham số thứ hai là một hàm MBL.");
        let res = []; for (let el of arr) res.push(await fn.call([el])); return res;
    }],
    ["filter", async function (arr, fn) {
        if (!Array.isArray(arr)) throw new Error("filter() chỉ dùng được cho Mảng.");
        if (!(fn instanceof MBLFunction)) throw new Error("filter() cần tham số thứ hai là một hàm MBL.");
        let res = []; for (let el of arr) if (await fn.call([el])) res.push(el); return res;
    }],
    ["sort", async function (arr, cmpFn = null) {
        if (!Array.isArray(arr)) throw new Error("sort() chỉ dùng được cho Mảng.");
        if (cmpFn !== null && !(cmpFn instanceof MBLFunction)) throw new Error("Tham số so sánh của sort() phải là một hàm MBL.");
        const compare = cmpFn
            ? async (a, b) => Number(await cmpFn.call([a, b]))
            : async (a, b) => {
                let av = a instanceof Complex ? a.re : a, bv = b instanceof Complex ? b.re : b;
                if (typeof av === "string" || typeof bv === "string") return String(av) < String(bv) ? -1 : (String(av) > String(bv) ? 1 : 0);
                return av - bv;
            };
        async function mergeSort(list) {
            if (list.length <= 1) return list;
            let mid = Math.floor(list.length / 2);
            let left = await mergeSort(list.slice(0, mid));
            let right = await mergeSort(list.slice(mid));
            let out = [], i = 0, j = 0;
            while (i < left.length && j < right.length) { if ((await compare(left[i], right[j])) <= 0) out.push(left[i++]); else out.push(right[j++]); }
            return out.concat(left.slice(i), right.slice(j));
        }
        let sorted = await mergeSort(arr);
        for (let k = 0; k < sorted.length; k++) arr[k] = sorted[k];
        return arr;
    }],
]);

export const NATIVE_MODULES = new Map([
    ["std", STD_MODULE],
]);

export const USER_MODULE_CACHE = new Map();
const IMPORT_STACK = new Set();

export async function loadMBLModule(name, callerEnv) {
    if (NATIVE_MODULES.has(name)) return NATIVE_MODULES.get(name);
    if (USER_MODULE_CACHE.has(name)) return USER_MODULE_CACHE.get(name);
    if (IMPORT_STACK.has(name)) {
        throw new Error(`Phát hiện nhập vòng lặp (Cyclic import): ${Array.from(IMPORT_STACK).join(" -> ")} -> ${name}`);
    }

    let src = null;
    try { src = world.getDynamicProperty(`mbl_module_${name}`); } catch { src = null; }
    if (typeof src !== "string" || !src) {
        throw new Error(`Không tìm thấy module "${name}". Dùng lệnh mbl:module_def để đăng ký trước, hoặc dùng module dựng sẵn "std".`);
    }

    IMPORT_STACK.add(name);
    try {
        let modEnv = new Environment(callerEnv);
        let tokens = tokenizeMBL(src);
        let ast = parseMBL(tokens, src);
        for (let stmt of ast.body) await evaluateMBLAST(stmt, modEnv);
        
        USER_MODULE_CACHE.set(name, modEnv.vars);
        return modEnv.vars;
    } finally {
        IMPORT_STACK.delete(name);
    }
}