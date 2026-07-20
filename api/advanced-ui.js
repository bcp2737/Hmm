import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { ChatAPI } from "./minecraft-api.js";

/**
 * ==================== ADVANCED UI MODULE ====================
 * Form Builder, Menus, Dialogs, Notifications, Validation
 */

/**
 * ==================== FORM BUILDER ====================
 */
export const FormBuilder = {
    /**
     * createForm() - Tạo form với validation
     */
    createForm(title = "Form") {
        return {
            title,
            fields: [],
            validators: {},
            
            // Thêm text field
            addText(label, placeholder = "", defaultValue = "", validator = null) {
                this.fields.push({
                    type: "text",
                    label,
                    placeholder,
                    default: defaultValue
                });
                if (validator) this.validators[label] = validator;
                return this;
            },
            
            // Thêm number field
            addNumber(label, defaultValue = 0, min = null, max = null) {
                this.fields.push({
                    type: "number",
                    label,
                    default: defaultValue,
                    min,
                    max
                });
                this.validators[label] = (val) => {
                    let num = Number(val);
                    if (isNaN(num)) return "Phải là số";
                    if (min !== null && num < min) return `Phải >= ${min}`;
                    if (max !== null && num > max) return `Phải <= ${max}`;
                    return null;
                };
                return this;
            },
            
            // Thêm dropdown
            addDropdown(label, options = [], defaultIndex = 0) {
                this.fields.push({
                    type: "dropdown",
                    label,
                    options,
                    default: defaultIndex
                });
                return this;
            },
            
            // Thêm toggle
            addToggle(label, defaultValue = false) {
                this.fields.push({
                    type: "toggle",
                    label,
                    default: defaultValue
                });
                return this;
            },
            
            // Thêm slider
            addSlider(label, min = 0, max = 100, step = 1, defaultValue = 50) {
                this.fields.push({
                    type: "slider",
                    label,
                    min,
                    max,
                    step,
                    default: defaultValue
                });
                return this;
            },
            
            // Validate input
            validate(values) {
                const errors = {};
                for (let i = 0; i < this.fields.length; i++) {
                    const field = this.fields[i];
                    const value = values[i];
                    
                    if (this.validators[field.label]) {
                        const error = this.validators[field.label](value);
                        if (error) errors[field.label] = error;
                    }
                }
                return Object.keys(errors).length === 0 ? null : errors;
            },
            
            // Show form
            async show(player) {
                const form = new ModalFormData().title(this.title);
                
                for (let field of this.fields) {
                    if (field.type === "text") {
                        form.textField(field.label, field.placeholder, field.default);
                    } else if (field.type === "number") {
                        form.textField(field.label, "Nhập số", String(field.default));
                    } else if (field.type === "dropdown") {
                        form.dropdown(field.label, field.options, field.default);
                    } else if (field.type === "toggle") {
                        form.toggle(field.label, field.default);
                    } else if (field.type === "slider") {
                        form.slider(field.label, field.min, field.max, field.step, field.default);
                    }
                }
                
                const response = await form.show(player);
                if (response.canceled) return null;
                
                // Validate
                const errors = this.validate(response.formValues);
                if (errors) {
                    let errorMsg = "Lỗi nhập liệu:\n";
                    for (let [field, error] of Object.entries(errors)) {
                        errorMsg += `${field}: ${error}\n`;
                    }
                    player.sendMessage(`§c${errorMsg}`);
                    return null;
                }
                
                // Return với labels
                const result = {};
                for (let i = 0; i < this.fields.length; i++) {
                    result[this.fields[i].label] = response.formValues[i];
                }
                return result;
            }
        };
    }
};

/**
 * ==================== MENU SYSTEM ====================
 */
export const MenuSystem = {
    /**
     * createMenu() - Tạo menu với support pagination
     */
    createMenu(title = "Menu", items = []) {
        return {
            title,
            items,
            itemsPerPage: 10,
            currentPage: 0,
            
            // Thêm item
            addItem(text, icon = null, callback = null) {
                this.items.push({ text, icon, callback });
                return this;
            },
            
            // Thêm separator
            addSeparator() {
                this.items.push({ text: "----------", separator: true });
                return this;
            },
            
            // Lấy items trong page
            getPageItems() {
                const start = this.currentPage * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.items.slice(start, end);
            },
            
            // Tính tổng pages
            getTotalPages() {
                return Math.ceil(this.items.length / this.itemsPerPage);
            },
            
            // Tạo form
            async show(player) {
                const pageItems = this.getPageItems();
                const totalPages = this.getTotalPages();
                const form = new ActionFormData()
                    .title(this.title)
                    .body(`Trang ${this.currentPage + 1}/${totalPages}`);
                
                for (let item of pageItems) {
                    if (!item.separator) {
                        form.button(item.text, item.icon);
                    }
                }
                
                // Thêm navigation buttons
                if (this.currentPage > 0) form.button("⬅ Trang trước");
                if (this.currentPage < totalPages - 1) form.button("Trang sau ➡");
                form.button("❌ Đóng");
                
                const response = await form.show(player);
                if (response.canceled) return null;
                
                // Handle pagination
                const selection = response.selection;
                const prevExists = this.currentPage > 0 ? 1 : 0;
                const nextExists = this.currentPage < totalPages - 1 ? 1 : 0;
                const totalButtons = pageItems.length + prevExists + nextExists + 1;
                
                if (selection === totalButtons - 1) {
                    return null; // Close
                }
                if (selection === pageItems.length + prevExists && nextExists) {
                    this.currentPage++;
                    return await this.show(player);
                }
                if (selection === pageItems.length && prevExists) {
                    this.currentPage--;
                    return await this.show(player);
                }
                
                const item = pageItems[selection];
                if (item && item.callback) {
                    return await item.callback(player);
                }
                return selection;
            }
        };
    }
};

/**
 * ==================== DIALOG BOXES ====================
 */
export const DialogBox = {
    // Alert dialog
    async alert(player, title = "Alert", message = "") {
        const form = new MessageFormData()
            .title(title)
            .body(message)
            .button1("OK")
            .button2("");
        
        await form.show(player);
        return true;
    },
    
    // Confirm dialog
    async confirm(player, title = "Confirm", message = "", yesText = "Yes", noText = "No") {
        const form = new MessageFormData()
            .title(title)
            .body(message)
            .button1(yesText)
            .button2(noText);
        
        const response = await form.show(player);
        if (response.canceled) return false;
        return response.selection === 0;
    },
    
    // Warning dialog
    async warning(player, title = "Warning", message = "") {
        return await this.alert(player, `§6⚠ ${title}`, message);
    },
    
    // Error dialog
    async error(player, title = "Error", message = "") {
        return await this.alert(player, `§c❌ ${title}`, message);
    },
    
    // Success dialog
    async success(player, title = "Success", message = "") {
        return await this.alert(player, `§a✓ ${title}`, message);
    },
    
    // Info dialog
    async info(player, title = "Info", message = "") {
        return await this.alert(player, `§bℹ ${title}`, message);
    }
};

/**
 * ==================== NOTIFICATION SYSTEM ====================
 */
export const Notification = {
    // Toast notification (action bar)
    toast(player, message, duration = 3) {
        player.onScreenDisplay.setActionBar(message);
        return true;
    },
    
    // Title notification
    titleNotify(player, title, subtitle = "", fadeIn = 0.5, stay = 2, fadeOut = 0.5) {
        player.onScreenDisplay.setTitle(title, {
            fadeInDuration: fadeIn * 20,
            stayDuration: stay * 20,
            fadeOutDuration: fadeOut * 20,
            subtitle
        });
        return true;
    },
    
    // Success notification
    success(player, message) {
        return this.toast(player, `§a✓ ${message}`);
    },
    
    // Error notification
    error(player, message) {
        return this.toast(player, `§c✗ ${message}`);
    },
    
    // Warning notification
    warning(player, message) {
        return this.toast(player, `§6⚠ ${message}`);
    },
    
    // Info notification
    info(player, message) {
        return this.toast(player, `§bℹ ${message}`);
    }
};

/**
 * ==================== INPUT VALIDATION ====================
 */
export const Validation = {
    // Email validator
    isEmail(value) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(value);
    },
    
    // Number validator
    isNumber(value) {
        return !isNaN(Number(value)) && Number.isFinite(Number(value));
    },
    
    // Integer validator
    isInteger(value) {
        return Number.isInteger(Number(value));
    },
    
    // Min length
    minLength(value, length) {
        return String(value).length >= length;
    },
    
    // Max length
    maxLength(value, length) {
        return String(value).length <= length;
    },
    
    // Range length
    rangeLength(value, min, max) {
        const len = String(value).length;
        return len >= min && len <= max;
    },
    
    // Regex match
    matches(value, pattern) {
        const regex = new RegExp(pattern);
        return regex.test(String(value));
    },
    
    // Alphanumeric
    isAlphanumeric(value) {
        return /^[a-zA-Z0-9]+$/.test(String(value));
    },
    
    // Alpha only
    isAlpha(value) {
        return /^[a-zA-Z]+$/.test(String(value));
    },
    
    // Username validator (3-16 chars, alphanumeric + underscore)
    isUsername(value) {
        return /^[a-zA-Z0-9_]{3,16}$/.test(String(value));
    },
    
    // UUID validator
    isUUID(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
    },
    
    // URL validator
    isURL(value) {
        try {
            new URL(String(value));
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Not empty
    required(value) {
        return value !== null && value !== undefined && String(value).trim() !== "";
    },
    
    // In array
    inArray(value, array) {
        return array.includes(value);
    }
};

/**
 * ==================== LIST DISPLAY ====================
 */
export const ListDisplay = {
    /**
     * createList() - Hiển thị danh sách items
     */
    createList(title = "List", items = []) {
        return {
            title,
            items,
            itemsPerPage: 10,
            currentPage: 0,
            
            addItem(text, value = null) {
                this.items.push({ text, value });
                return this;
            },
            
            getPageItems() {
                const start = this.currentPage * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.items.slice(start, end);
            },
            
            getTotalPages() {
                return Math.ceil(this.items.length / this.itemsPerPage);
            },
            
            async show(player) {
                const pageItems = this.getPageItems();
                const totalPages = this.getTotalPages();
                const form = new ActionFormData()
                    .title(this.title)
                    .body(`${this.items.length} items • Trang ${this.currentPage + 1}/${totalPages}\n\n`);
                
                for (let i = 0; i < pageItems.length; i++) {
                    form.button(`${this.currentPage * this.itemsPerPage + i + 1}. ${pageItems[i].text}`);
                }
                
                // Navigation
                if (this.currentPage > 0) form.button("⬅ Trước");
                if (this.currentPage < totalPages - 1) form.button("Sau ➡");
                form.button("❌ Đóng");
                
                const response = await form.show(player);
                if (response.canceled) return null;
                
                const selection = response.selection;
                const prevExists = this.currentPage > 0 ? 1 : 0;
                const nextExists = this.currentPage < totalPages - 1 ? 1 : 0;
                const totalButtons = pageItems.length + prevExists + nextExists + 1;
                
                if (selection === totalButtons - 1) return null;
                if (selection === pageItems.length + prevExists && nextExists) {
                    this.currentPage++;
                    return await this.show(player);
                }
                if (selection === pageItems.length && prevExists) {
                    this.currentPage--;
                    return await this.show(player);
                }
                
                const item = pageItems[selection];
                return item ? item.value : selection;
            }
        };
    }
};

/**
 * ==================== PROGRESS BAR ====================
 */
export const ProgressBar = {
    /**
     * showProgress() - Hiển thị progress bar với visual
     */
    showProgress(player, title = "Progress", current = 0, max = 100) {
        const percentage = Math.min(100, Math.round((current / max) * 100));
        const filledBlocks = Math.round(percentage / 10);
        const emptyBlocks = 10 - filledBlocks;
        
        let bar = "";
        if (percentage < 50) bar += "§c";
        else if (percentage < 80) bar += "§e";
        else bar += "§a";
        
        bar += "█".repeat(filledBlocks) + "§7" + "█".repeat(emptyBlocks);
        
        const message = `§l${title}\n${bar} §f${percentage}% (${current}/${max})`;
        player.onScreenDisplay.setActionBar(message);
        return true;
    }
};

/**
 * ==================== TEXT FORMATTING ====================
 */
export const TextFormat = {
    // Create header
    header(text) {
        const line = "§7═══════════════════";
        return `${line}\n§l§b${text}\n${line}`;
    },
    
    // Create footer
    footer(text) {
        return `§7${"-".repeat(20)}\n${text}`;
    },
    
    // Create box
    box(text) {
        return `§7┌─────────────────────┐\n│ ${text}\n└─────────────────────┘`;
    },
    
    // Rainbow colors
    rainbow(text) {
        const colors = ["c", "6", "e", "a", "b", "3", "d"];
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += `§${colors[i % colors.length]}${text[i]}`;
        }
        return result + "§r";
    },
    
    // Gradient (từ color1 sang color2)
    gradient(text, color1, color2) {
        const colors = [color1, color2];
        let result = "";
        for (let i = 0; i < text.length; i++) {
            const colorIndex = Math.round((i / text.length) * (colors.length - 1));
            result += `§${colors[colorIndex]}${text[i]}`;
        }
        return result + "§r";
    },
    
    // Table
    table(headers, rows) {
        let table = "\n";
        table += "§7" + headers.map(h => h.padEnd(15)).join("│") + "\n";
        table += "§7" + "-".repeat(headers.length * 16) + "\n";
        
        for (let row of rows) {
            table += "§f" + row.map(r => String(r).padEnd(15)).join("§7│§f") + "\n";
        }
        
        return table;
    },
    
    // Centered text
    center(text, width = 40) {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return " ".repeat(padding) + text;
    }
};

/**
 * ==================== Export All ====================
 */
export default {
    FormBuilder,
    MenuSystem,
    DialogBox,
    Notification,
    Validation,
    ListDisplay,
    ProgressBar,
    TextFormat
};
