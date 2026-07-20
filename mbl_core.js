import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Complex, tokenize as tokenizeMath, parse as parseMath, evaluateAST } from "./math_eval.js";
import { Environment } from "./mbl_types.js";
import { tokenizeMBL, parseMBL } from "./mbl_parser.js";
import { evaluateMBLAST } from "./mbl_evaluator.js";
import { stringifyMBL } from "./mbl_helpers.js";
import { USER_MODULE_CACHE } from "./mbl_modules.js";
import MinecraftAPI from "./api/index.js";

async function runMBL(code, player) {
    if (!code || code.trim() === "") return;
    try {
        let globalEnv = new Environment(); 
        globalEnv.set("__player", player);
        
        // ================= MINECRAFT APIs =================
        globalEnv.set("block", (x, y, z, dim = "overworld") => MinecraftAPI.block.block(x, y, z, dim));
        globalEnv.set("entity", (selector = "@s", dim = "overworld") => MinecraftAPI.entity.entity(selector, dim, player));
        globalEnv.set("inventory", (entity) => MinecraftAPI.inventory.inventory(entity));
        globalEnv.set("region", (x1, y1, z1, x2, y2, z2, dim = "overworld") => MinecraftAPI.block.region(x1, y1, z1, x2, y2, z2, dim));
        
        // Scoreboard
        globalEnv.set("score", (objective, entity, value = null) => {
            if (value === null) return MinecraftAPI.scoreboard.getScore(objective, entity);
            return MinecraftAPI.scoreboard.setScore(objective, entity, value);
        });
        globalEnv.set("addScore", (objective, entity, delta) => MinecraftAPI.scoreboard.addScore(objective, entity, delta));
        globalEnv.set("createScore", (name, type = "dummy") => MinecraftAPI.scoreboard.createObjective(name, type));
        
        // UI
        globalEnv.set("ui_modal", async (title, fields) => MinecraftAPI.ui.modalForm(player, title, fields));
        globalEnv.set("ui_action", async (title, body, buttons) => MinecraftAPI.ui.actionForm(player, title, body, buttons));
        globalEnv.set("ui_confirm", async (title, body) => MinecraftAPI.ui.messageForm(player, title, body));
        globalEnv.set("showTitle", (title, subtitle = "") => MinecraftAPI.ui.showTitle(player, title, subtitle));
        globalEnv.set("showActionBar", (text) => MinecraftAPI.ui.showActionBar(player, text));
        
        // Time
        globalEnv.set("getTicks", () => MinecraftAPI.time.getTicks());
        globalEnv.set("schedule", (callback, ticks) => MinecraftAPI.time.schedule(callback, ticks));
        globalEnv.set("repeat", (callback, ticks) => MinecraftAPI.time.scheduleRepeat(callback, ticks));
        
        // World
        globalEnv.set("getPlayers", () => MinecraftAPI.world.getPlayers());
        globalEnv.set("getPlayer", (name) => MinecraftAPI.world.getPlayer(name));
        globalEnv.set("getEntities", (dim = "overworld") => MinecraftAPI.world.getEntities(dim));
        globalEnv.set("spawnEntity", (type, x, y, z, dim = "overworld") => MinecraftAPI.world.spawnEntity(type, x, y, z, dim));
        globalEnv.set("broadcast", (msg) => MinecraftAPI.world.broadcast(msg));
        globalEnv.set("setWeather", (type, duration) => MinecraftAPI.world.setWeather(type, duration));
        
        // Chat
        globalEnv.set("chat_send", (msg) => MinecraftAPI.chat.send(player, msg));
        globalEnv.set("chat_broadcast", (msg) => MinecraftAPI.chat.broadcast(msg));
        globalEnv.set("chat_color", (text, color) => MinecraftAPI.chat.color(text, color));
        globalEnv.set("chat_bold", (text) => MinecraftAPI.chat.bold(text));
        
        // Math
        globalEnv.set("random", (min = 0, max = 1) => MinecraftAPI.math.random(min, max));
        globalEnv.set("distance", (x1, y1, z1, x2, y2, z2) => MinecraftAPI.math.distance(x1, y1, z1, x2, y2, z2));
        globalEnv.set("clamp", (val, min, max) => MinecraftAPI.math.clamp(val, min, max));
        
        // String
        globalEnv.set("str_format", (template, values) => MinecraftAPI.string.format(template, values));
        globalEnv.set("str_split", (str, sep) => MinecraftAPI.string.split(str, sep));
        globalEnv.set("str_trim", (str) => MinecraftAPI.string.trim(str));
        
        // Array
        globalEnv.set("arr_unique", (arr) => MinecraftAPI.array.unique(arr));
        globalEnv.set("arr_flatten", (arr) => MinecraftAPI.array.flatten(arr));
        
        // ================= ORIGINAL APIs =================
        globalEnv.set("math", function(expr, xVal = 0) {
            try {
                let interpolatedExpr = expr;
                if (this && typeof this.getAllVars === "function") {
                    let mblVars = this.getAllVars();
                    let varNames = Object.keys(mblVars).sort((a, b) => b.length - a.length);
                    
                    for (let name of varNames) {
                        if (["x", "i", "sin", "cos", "tan", "asin", "acos", "atan", "log", "pow", "deriv", "integ", "abs", "solve"].includes(name)) continue;
                        let val = mblVars[name];
                        let strVal = stringifyMBL(val);
                        
                        if (typeof val === "number" || val instanceof Complex || typeof val === "string") {
                            let regex = new RegExp("\\b" + name + "\\b", "g");
                            interpolatedExpr = interpolatedExpr.replace(regex, strVal);
                        }
                    }
                }
                let tokens = tokenizeMath(interpolatedExpr);
                let ast = parseMath(tokens);
                let context = { x: new Complex(Number(xVal), 0) };
                return evaluateAST(ast, context); 
            } catch (err) {
                return new Complex(0, 0); 
            }
        });

        globalEnv.set("cmd", async function(cmdStr) {
            cmdStr = stringifyMBL(cmdStr);
            const player = this.get("__player");
            if (!player) return 0;

            try {
                let result = await player.dimension.runCommandAsync(String(cmdStr));
                return result.successCount;
            } catch {
                return 0;
            }
        });

        globalEnv.set("input", async function(promptText = "Mời nhập dữ liệu:") {
            const p = this.get("__player");
            if (!p) return "";
            
            const form = new ModalFormData()
                .title("MBL Input UI")
                .textField(String(promptText), "Điền thông tin hoặc số tại đây...");
            
            const response = await form.show(p);
            if (response.canceled) return "";
            
            let val = response.formValues[0].trim();
            if (!isNaN(val) && val !== "") return Number(val);
            return val;
        });
        
        globalEnv.set("player", function(target = "@s", key, arg = null) {
            let p = null;
            switch (String(target)) {
                case "@s":
                    p = this.get("__player");
                    break;
                case "@p":
                    p = this.get("__player")?.dimension.getPlayers()[0] ?? null;
                    break;
                case "@r": {
                    const list = world.getAllPlayers();
                    if (list.length) p = list[Math.floor(Math.random() * list.length)];
                    break;
                }
                default:
                    p = world.getAllPlayers().find(pl => pl.name === String(target));
            }

            if (!p) return 0;

            switch (key) {
                case "name": return p.name;
                case "x": return Math.round(p.location.x * 100) / 100;
                case "y": return Math.round(p.location.y * 100) / 100;
                case "z": return Math.round(p.location.z * 100) / 100;
                case "hp": {
                    const c = p.getComponent("health");
                    return c ? c.currentValue : 0;
                }
                case "max_hp": {
                    const c = p.getComponent("health");
                    return c ? c.effectiveMaxValue : 0;
                }
                case "food": {
                    const c = p.getComponent("hunger");
                    return c ? c.currentValue : 0;
                }
                case "air": {
                    const c = p.getComponent("breathable");
                    return c ? c.currentSupply : 0;
                }
                case "level":
                    return p.level;
                case "xp":
                    return p.xpEarnedAtCurrentLevel;
                case "ground":
                    return p.isOnGround ? 1 : 0;
                case "sneaking":
                    return p.isSneaking ? 1 : 0;
                case "sprint":
                    return p.isSprinting ? 1 : 0;
                case "swim":
                    return p.isSwimming ? 1 : 0;
                case "glide":
                    return p.isGliding ? 1 : 0;
                case "climb":
                    return p.isClimbing ? 1 : 0;
                case "falling": {
                    const v = p.getVelocity();
                    return (v.y < 0 && !p.isOnGround) ? 1 : 0;
                }
                case "speed": {
                    const v = p.getVelocity();
                    return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
                }
                case "yaw":
                    return p.getRotation().yaw;
                case "pitch":
                    return p.getRotation().pitch;
                case "gamemode":
                    return p.getGameMode();
                case "mainhand": {
                    const inv = p.getComponent("inventory")?.container;
                    const item = inv?.getItem(p.selectedSlotIndex);
                    return item ? item.typeId : "minecraft:air";
                }
                case "has_effect": {
                    const c = p.getComponent("effects");
                    return (c && c.getEffect(String(arg))) ? 1 : 0;
                }
                case "tag":
                    return p.hasTag(String(arg)) ? 1 : 0;
                case "score":
                    try {
                        const obj = world.scoreboard.getObjective(String(arg));
                        return obj ? obj.getScore(p) ?? 0 : 0;
                    } catch {
                        return 0;
                    }
                default:
                    return 0;
            }
        });

        let tokens = tokenizeMBL(code); 
        let ast = parseMBL(tokens, code);
        await evaluateMBLAST(ast, globalEnv);
    } catch (err) { player?.sendMessage(`§c[MBL Lỗi]: ${err.message}`); }
}

const MBL_ESCAPE_MAP = { "$lt$": "<", "$gt$": ">", "$semi$": ";" };

function decodeBase64MBL(b64) {
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
    let output = "", buffer = 0, bits = 0;
    for (let ch of clean) {
        if (ch === "=") break;
        let val = CHARS.indexOf(ch);
        if (val === -1) continue;
        buffer = (buffer << 6) | val; bits += 6;
        if (bits >= 8) { bits -= 8; output += String.fromCharCode((buffer >> bits) & 0xFF); }
    }
    return output;
}

function preprocessMBL(raw) {
    let src = raw.trim();
    if (src.startsWith("b64:")) src = decodeBase64MBL(src.slice(4));
    for (let [alias, real] of Object.entries(MBL_ESCAPE_MAP)) src = src.split(alias).join(real);
    return src;
}

system.afterEvents.scriptEventReceive.subscribe(ev => {
    if (ev.id !== "mbl:run") return;
    const player = ev.sourceEntity;
    if (!player) return;
    let codeToRun = ev.message.trim();
    if (codeToRun.startsWith('"') && codeToRun.endsWith('"')) { codeToRun = codeToRun.slice(1, -1); }
    else if (codeToRun.startsWith("'") && codeToRun.endsWith("'")) { codeToRun = codeToRun.slice(1, -1); }

    codeToRun = preprocessMBL(codeToRun);
    
    system.run(() => {
        runMBL(codeToRun, player);
    });
});

system.afterEvents.scriptEventReceive.subscribe(ev => {
    if (ev.id !== "mbl:module_def") return;
    const player = ev.sourceEntity;
    if (!player) return;

    let raw = ev.message.trim();
    let spaceIdx = raw.indexOf(" ");
    if (spaceIdx === -1) { player.sendMessage(`§c[MBL Lỗi]: Cú pháp: mbl:module_def <tên_module> <mã_nguồn...>`); return; }

    let modName = raw.slice(0, spaceIdx).trim();
    let modCode = preprocessMBL(raw.slice(spaceIdx + 1));

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(modName)) { player.sendMessage(`§c[MBL Lỗi]: Tên module không hợp lệ: "${modName}" (chỉ chữ, số, dấu gạch dưới, không bắt đầu bằng số).`); return; }
    if (modCode.length > 32000) { player.sendMessage(`§c[MBL Lỗi]: Mã nguồn module quá dài (${modCode.length} ký tự, giới hạn ~32000).`); return; }

    system.run(() => {
        try {
            parseMBL(tokenizeMBL(modCode), modCode);
            world.setDynamicProperty(`mbl_module_${modName}`, modCode);
            USER_MODULE_CACHE.delete(modName); 
            player.sendMessage(`§a[MBL] Đã đăng ký module "${modName}" (${modCode.length} ký tự). Dùng import "${modName}"; để nạp.`);
        } catch (err) {
            player.sendMessage(`§c[MBL Lỗi] Module "${modName}" có lỗi cú pháp, chưa được lưu: ${err.message}`);
        }
    });
});