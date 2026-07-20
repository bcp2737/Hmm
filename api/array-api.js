/**
 * ==================== ARRAY API ====================
 */
export const ArrayAPI = {
    // Find
    find(arr, predicate) {
        if (!Array.isArray(arr)) return null;
        for (let item of arr) {
            if (predicate(item)) return item;
        }
        return null;
    },
    
    // Find index
    findIndex(arr, predicate) {
        if (!Array.isArray(arr)) return -1;
        for (let i = 0; i < arr.length; i++) {
            if (predicate(arr[i])) return i;
        }
        return -1;
    },
    
    // Includes
    includes(arr, item) {
        return Array.isArray(arr) && arr.includes(item);
    },
    
    // Index of
    indexOf(arr, item) {
        return Array.isArray(arr) ? arr.indexOf(item) : -1;
    },
    
    // Reverse
    reverse(arr) {
        if (!Array.isArray(arr)) return arr;
        return arr.reverse();
    },
    
    // Some
    some(arr, predicate) {
        if (!Array.isArray(arr)) return false;
        return arr.some(predicate);
    },
    
    // Every
    every(arr, predicate) {
        if (!Array.isArray(arr)) return false;
        return arr.every(predicate);
    },
    
    // Reduce
    reduce(arr, callback, initialValue = null) {
        if (!Array.isArray(arr)) return initialValue;
        return arr.reduce(callback, initialValue);
    },
    
    // Unique
    unique(arr) {
        if (!Array.isArray(arr)) return arr;
        return [...new Set(arr)];
    },
    
    // Flatten
    flatten(arr) {
        if (!Array.isArray(arr)) return [arr];
        return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? this.flatten(val) : val), []);
    }
};

export default ArrayAPI;