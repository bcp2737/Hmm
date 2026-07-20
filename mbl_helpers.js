import { Complex, Matrix, formatComplex } from "./math_eval.js";
import { MBLInstance, MBLClass, MBLFunction } from "./mbl_types.js";

export function stringifyMBL(v) {
    if (v instanceof Complex) return formatComplex(v);
    if (v instanceof Matrix) return v.toString();
    if (v instanceof MBLInstance) {
        let inner = Array.from(v.fields.entries()).map(([k, val]) => `${k}: ${stringifyMBL(val)}`).join(", ");
        return `${v.cls.name} { ${inner} }`;
    }
    if (v instanceof MBLClass) return `[class ${v.name}]`;
    if (v instanceof MBLFunction) return `[function]`;
    if (Array.isArray(v)) return "[" + v.map(stringifyMBL).join(", ") + "]";
    return String(v);
}

export function isMBLStrictEqual(a, b) {
    if (a === b) return true;
    if (a instanceof Complex && b instanceof Complex) {
        return a.re === b.re && a.im === b.im;
    }
    if (a instanceof Complex && typeof b === "number") {
        return a.re === b && a.im === 0;
    }
    if (b instanceof Complex && typeof a === "number") {
        return b.re === a && b.im === 0;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!isMBLStrictEqual(a[i], b[i])) return false;
        }
        return true;
    }
    return false;
}