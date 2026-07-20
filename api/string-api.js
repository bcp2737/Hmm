/**
 * ==================== STRING API ====================
 */
export const StringAPI = {
    // Format
    format(template, values) {
        let result = template;
        for (let [key, value] of Object.entries(values)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        return result;
    },
    
    // Trim
    trim(str) {
        return String(str).trim();
    },
    
    // Starts with
    startsWith(str, prefix) {
        return String(str).startsWith(String(prefix));
    },
    
    // Ends with
    endsWith(str, suffix) {
        return String(str).endsWith(String(suffix));
    },
    
    // Contains
    contains(str, substring) {
        return String(str).includes(String(substring));
    },
    
    // Replace
    replace(str, old, newVal) {
        return String(str).replace(new RegExp(String(old), 'g'), String(newVal));
    },
    
    // Upper case
    toUpperCase(str) {
        return String(str).toUpperCase();
    },
    
    // Lower case
    toLowerCase(str) {
        return String(str).toLowerCase();
    },
    
    // Split
    split(str, delimiter = ",") {
        return String(str).split(String(delimiter));
    },
    
    // Join
    join(arr, delimiter = ",") {
        return Array.isArray(arr) ? arr.join(String(delimiter)) : String(arr);
    },
    
    // Substring
    substr(str, start, length) {
        return String(str).substr(start, length);
    },
    
    // Index of
    indexOf(str, search) {
        return String(str).indexOf(String(search));
    }
};

export default StringAPI;