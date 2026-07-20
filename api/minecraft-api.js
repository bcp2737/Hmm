import { world, system, Dimension } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";

/**
 * ==================== BLOCK API ====================
 */
export const BlockAPI = {
    /**
     * block(x, y, z) - Truy cập block tại toạ độ
     */
    block(x, y, z, dimension = "overworld") {
        const dim = world.getDimension(dimension);
        const blockLocation = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
        
        return {
            // Lấy loại block
            getType() {
                const block = dim.getBlock(blockLocation);
                return block ? block.typeId : "minecraft:air";
            },
            
            // Đặt loại block
            setType(blockId, blockStates = {}) {
                try {
                    dim.setBlockType(blockLocation, blockId);
                    if (Object.keys(blockStates).length > 0) {
                        const block = dim.getBlock(blockLocation);
                        for (let [key, value] of Object.entries(blockStates)) {
                            block?.setPermutation(block.permutation.withState(key, value));
                        }
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Lấy thuộc tính block
            getProperties() {
                const block = dim.getBlock(blockLocation);
                if (!block) return {};
                const perm = block.permutation;
                return perm.getAllStates();
            },
            
            // Kiểm tra loại block
            isType(blockId) {
                return this.getType() === blockId;
            },
            
            // Lấy NBT data
            getNBT() {
                const block = dim.getBlock(blockLocation);
                if (!block || !block.isLiquid) return null;
                try {
                    return JSON.stringify(block.permutation.getAllStates());
                } catch (e) {
                    return null;
                }
            },
            
            // Thay đổi trạng thái block (e.g., lit, facing, age)
            setState(key, value) {
                try {
                    const block = dim.getBlock(blockLocation);
                    if (!block) return false;
                    block.setPermutation(block.permutation.withState(key, value));
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Kiểm tra block có BlockEntity không (hộp lạnh, lò, v.v.)
            hasBlockEntity() {
                const block = dim.getBlock(blockLocation);
                return block ? !!block.getComponent("minecraft:block_entity") : false;
            },
            
            // Lấy mức sáng
            getLight() {
                const block = dim.getBlock(blockLocation);
                return block ? block.getLightEmission() : 0;
            },
            
            // Xóa block (thành air)
            destroy() {
                dim.setBlockType(blockLocation, "minecraft:air");
                return true;
            },
            
            // Lấy vị trí
            getLocation() {
                return blockLocation;
            },
            
            // Lấy khoảng cách từ tọa độ
            getDistance(px, py, pz) {
                const dx = x - px, dy = y - py, dz = z - pz;
                return Math.sqrt(dx*dx + dy*dy + dz*dz);
            }
        };
    },
    
    /**
     * region(x1, y1, z1, x2, y2, z2, dimension) - Thao tác region
     */
    region(x1, y1, z1, x2, y2, z2, dimension = "overworld") {
        const dim = world.getDimension(dimension);
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
        
        return {
            // Fill region với block
            fill(blockId, blockStates = {}) {
                try {
                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            for (let z = minZ; z <= maxZ; z++) {
                                const block = dim.getBlock({ x, y, z });
                                if (block) {
                                    block.setType(blockId);
                                    if (Object.keys(blockStates).length > 0) {
                                        for (let [key, value] of Object.entries(blockStates)) {
                                            block.setPermutation(block.permutation.withState(key, value));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Xóa block (thành air)
            clear() {
                return this.fill("minecraft:air");
            },
            
            // Đếm block loại nào
            count(blockId) {
                let count = 0;
                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        for (let z = minZ; z <= maxZ; z++) {
                            const block = dim.getBlock({ x, y, z });
                            if (block && block.typeId === blockId) count++;
                        }
                    }
                }
                return count;
            },
            
            // Thay thế block
            replace(oldBlockId, newBlockId) {
                let count = 0;
                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        for (let z = minZ; z <= maxZ; z++) {
                            const block = dim.getBlock({ x, y, z });
                            if (block && block.typeId === oldBlockId) {
                                block.setType(newBlockId);
                                count++;
                            }
                        }
                    }
                }
                return count;
            },
            
            // Clone region
            clone(destX, destY, destZ) {
                try {
                    const blocks = [];
                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            for (let z = minZ; z <= maxZ; z++) {
                                const block = dim.getBlock({ x, y, z });
                                if (block) {
                                    blocks.push({
                                        ox: x - minX, oy: y - minY, oz: z - minZ,
                                        type: block.typeId,
                                        states: block.permutation.getAllStates()
                                    });
                                }
                            }
                        }
                    }
                    
                    for (let data of blocks) {
                        const destBlock = dim.getBlock({ x: destX + data.ox, y: destY + data.oy, z: destZ + data.oz });
                        if (destBlock) {
                            destBlock.setType(data.type);
                            for (let [key, value] of Object.entries(data.states)) {
                                destBlock.setPermutation(destBlock.permutation.withState(key, value));
                            }
                        }
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Lấy kích thước
            getSize() {
                return {
                    width: maxX - minX + 1,
                    height: maxY - minY + 1,
                    depth: maxZ - minZ + 1
                };
            }
        };
    }
};

/**
 * ==================== ENTITY API ====================
 */
export const EntityAPI = {
    /**
     * entity(selector, dimension) - Lấy entity theo selector (@s, @p, @r, @a, @e)
     */
    entity(selector = "@s", dimension = "overworld", player = null) {
        const dim = world.getDimension(dimension);
        let entities = [];
        
        if (selector === "@s" && player) {
            entities = [player];
        } else if (selector === "@p" && player) {
            const allPlayers = dim.getPlayers();
            if (allPlayers.length > 0) {
                entities = [allPlayers[0]];
            }
        } else if (selector === "@r") {
            const allEntities = dim.getEntities();
            if (allEntities.length > 0) {
                entities = [allEntities[Math.floor(Math.random() * allEntities.length)]];
            }
        } else if (selector === "@a") {
            entities = world.getAllPlayers();
        } else if (selector === "@e") {
            entities = dim.getEntities();
        } else {
            // Tìm entity theo tên
            entities = world.getAllPlayers().filter(p => p.name === selector);
        }
        
        // Trả về wrapper để gọi method
        return entities.map(entity => {
            return {
                // Thông tin cơ bản
                getType() {
                    return entity.typeId || "player";
                },
                
                getName() {
                    return entity.nameTag || entity.name || "Unknown";
                },
                
                setName(name) {
                    try {
                        entity.nameTag = name;
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Vị trí
                getPosition() {
                    const loc = entity.location;
                    return { x: loc.x, y: loc.y, z: loc.z };
                },
                
                setPosition(x, y, z) {
                    try {
                        entity.teleport({ x, y, z });
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Rotation
                getRotation() {
                    const rot = entity.getRotation?.() || { x: 0, y: 0 };
                    return { pitch: rot.x, yaw: rot.y };
                },
                
                setRotation(pitch, yaw) {
                    try {
                        entity.setRotation?.({ x: pitch, y: yaw });
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Velocity
                getVelocity() {
                    const vel = entity.getVelocity();
                    return { x: vel.x, y: vel.y, z: vel.z };
                },
                
                setVelocity(vx, vy, vz) {
                    try {
                        entity.applyKnockback(vx, vy, vz);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Health
                getHealth() {
                    const healthComponent = entity.getComponent("minecraft:health");
                    return healthComponent?.currentValue ?? 0;
                },
                
                setHealth(amount) {
                    try {
                        const healthComponent = entity.getComponent("minecraft:health");
                        if (healthComponent) {
                            healthComponent.setCurrentValue(amount);
                            return true;
                        }
                        return false;
                    } catch (e) {
                        return false;
                    }
                },
                
                getMaxHealth() {
                    const healthComponent = entity.getComponent("minecraft:health");
                    return healthComponent?.effectiveMaxValue ?? 20;
                },
                
                // Damage
                damage(amount, cause = "projectile") {
                    try {
                        entity.applyDamage(amount, { cause });
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Kill entity
                kill() {
                    try {
                        entity.kill();
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Tag management
                addTag(tag) {
                    try {
                        entity.addTag(tag);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                removeTag(tag) {
                    try {
                        entity.removeTag(tag);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                hasTag(tag) {
                    return entity.hasTag(tag);
                },
                
                getTags() {
                    return Array.from(entity.getTags?.() || []);
                },
                
                // Effect
                addEffect(effectId, duration, level = 0) {
                    try {
                        entity.addEffect(effectId, duration, { amplifier: level });
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                removeEffect(effectId) {
                    try {
                        const effectComp = entity.getComponent("minecraft:effects");
                        if (effectComp) {
                            effectComp.removeEffect?.(effectId);
                            return true;
                        }
                        return false;
                    } catch (e) {
                        return false;
                    }
                },
                
                hasEffect(effectId) {
                    const effectComp = entity.getComponent("minecraft:effects");
                    return effectComp ? !!effectComp.getEffect?.(effectId) : false;
                },
                
                getEffects() {
                    const effectComp = entity.getComponent("minecraft:effects");
                    return effectComp?.getEffects?.() || [];
                },
                
                // Item in hand (cho non-player entities)
                getItemInHand() {
                    if (entity.getComponent?.("minecraft:inventory")) {
                        const item = entity.getComponent("minecraft:inventory")?.container?.getItem(entity.selectedSlotIndex);
                        return item?.typeId || "minecraft:air";
                    }
                    return "minecraft:air";
                },
                
                setItemInHand(itemId, count = 1) {
                    try {
                        const invComp = entity.getComponent("minecraft:inventory");
                        if (invComp && invComp.container) {
                            // TODO: Thực hiện gán item
                            return true;
                        }
                        return false;
                    } catch (e) {
                        return false;
                    }
                },
                
                // State checks (players)
                isOnGround() {
                    return entity.isOnGround || false;
                },
                
                isSneaking() {
                    return entity.isSneaking || false;
                },
                
                isSprinting() {
                    return entity.isSprinting || false;
                },
                
                isSwimming() {
                    return entity.isSwimming || false;
                },
                
                isGliding() {
                    return entity.isGliding || false;
                },
                
                isClimbing() {
                    return entity.isClimbing || false;
                },
                
                // Teleport
                teleport(x, y, z, targetDimension = "overworld") {
                    try {
                        entity.teleport({ x, y, z }, { dimension: world.getDimension(targetDimension) });
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                
                // Entity object
                getRawEntity() {
                    return entity;
                }
            };
        });
    }
};

/**
 * ==================== INVENTORY API ====================
 */
export const InventoryAPI = {
    /**
     * inventory(player/entity) - Quản lý inventory
     */
    inventory(entity) {
        const invComponent = entity.getComponent("minecraft:inventory");
        const container = invComponent?.container;
        
        if (!container) {
            return {
                error: "Entity không có inventory",
                getSize: () => 0,
                getSlot: () => null,
                setSlot: () => false
            };
        }
        
        return {
            // Lấy kích thước
            getSize() {
                return container.size;
            },
            
            // Lấy item tại slot
            getSlot(index) {
                try {
                    const item = container.getItem(index);
                    if (!item) return null;
                    return {
                        typeId: item.typeId,
                        count: item.amount,
                        nbt: item.nameTag || null
                    };
                } catch (e) {
                    return null;
                }
            },
            
            // Đặt item tại slot
            setSlot(index, itemId, count = 1, nbt = null) {
                try {
                    // TODO: Implement setItem (API limitation)
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Xóa slot
            clear(index) {
                try {
                    // TODO: Clear implementation
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            // Tìm slot chứa item
            findSlot(itemId) {
                for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item && item.typeId === itemId) return i;
                }
                return -1;
            },
            
            // Đếm item
            count(itemId) {
                let total = 0;
                for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item && item.typeId === itemId) total += item.amount;
                }
                return total;
            },
            
            // Check item tồn tại
            contains(itemId, count = 1) {
                return this.count(itemId) >= count;
            },
            
            // Lấy tất cả items
            getAll() {
                const items = [];
                for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item) {
                        items.push({
                            slot: i,
                            typeId: item.typeId,
                            count: item.amount
                        });
                    }
                }
                return items;
            },
            
            // Lấy selected slot (chỉ player)
            getSelectedSlot() {
                return entity.selectedSlotIndex ?? 0;
            },
            
            // Đặt selected slot
            setSelectedSlot(index) {
                try {
                    entity.selectedSlotIndex = index;
                    return true;
                } catch (e) {
                    return false;
                }
            }
        };
    }
};

/**
 * ==================== SCOREBOARD API ====================
 */
export const ScoreboardAPI = {
    // Lấy score
    getScore(objective, entity) {
        try {
            const obj = world.scoreboard.getObjective(objective);
            if (!obj) return 0;
            return obj.getScore(entity) ?? 0;
        } catch (e) {
            return 0;
        }
    },
    
    // Ghi score
    setScore(objective, entity, value) {
        try {
            let obj = world.scoreboard.getObjective(objective);
            if (!obj) {
                obj = world.scoreboard.addObjective(objective, "dummy");
            }
            obj.setScore(entity, value);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Cộng score
    addScore(objective, entity, delta) {
        try {
            const obj = world.scoreboard.getObjective(objective);
            if (!obj) return false;
            const current = obj.getScore(entity) ?? 0;
            obj.setScore(entity, current + delta);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Xóa score
    removeScore(objective, entity) {
        try {
            const obj = world.scoreboard.getObjective(objective);
            if (!obj) return false;
            // TODO: Remove implementation
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Tạo objective
    createObjective(name, type = "dummy", displayName = null) {
        try {
            const obj = world.scoreboard.addObjective(name, type);
            if (displayName) {
                obj.displayName = displayName;
            }
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Xóa objective
    removeObjective(name) {
        try {
            const obj = world.scoreboard.getObjective(name);
            if (obj) {
                world.scoreboard.removeObjective(name);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    },
    
    // Lấy tất cả objectives
    listObjectives() {
        try {
            return world.scoreboard.getObjectives?.() || [];
        } catch (e) {
            return [];
        }
    },
    
    // Hiển thị objective
    showObjective(objective, slot = "sidebar") {
        try {
            const obj = world.scoreboard.getObjective(objective);
            if (!obj) return false;
            world.scoreboard.setObjectiveAtDisplaySlot(slot, { objective: obj });
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Ẩn objective
    hideObjective(objective) {
        try {
            world.scoreboard.clearObjectiveAtDisplaySlot(objective);
            return true;
        } catch (e) {
            return false;
        }
    }
};

/**
 * ==================== UI API ====================
 */
export const UIAPI = {
    // Modal form (text input, dropdown, toggle, slider)
    async modalForm(player, title = "Input", fields = []) {
        const form = new ModalFormData()
            .title(title);
        
        for (let field of fields) {
            if (field.type === "text") {
                form.textField(field.label, field.placeholder || "");
            } else if (field.type === "dropdown") {
                form.dropdown(field.label, field.options, field.default || 0);
            } else if (field.type === "toggle") {
                form.toggle(field.label, field.default || false);
            } else if (field.type === "slider") {
                form.slider(field.label, field.min || 0, field.max || 100, field.step || 1, field.default || 0);
            }
        }
        
        const response = await form.show(player);
        if (response.canceled) return null;
        return response.formValues;
    },
    
    // Action form (buttons)
    async actionForm(player, title = "Actions", body = "", buttons = []) {
        const form = new ActionFormData()
            .title(title)
            .body(body);
        
        for (let btn of buttons) {
            form.button(btn.text, btn.icon || null);
        }
        
        const response = await form.show(player);
        if (response.canceled) return -1;
        return response.selection;
    },
    
    // Message form (yes/no)
    async messageForm(player, title = "Confirm", body = "", buttonYes = "Yes", buttonNo = "No") {
        const form = new MessageFormData()
            .title(title)
            .body(body)
            .button1(buttonYes)
            .button2(buttonNo);
        
        const response = await form.show(player);
        if (response.canceled) return null;
        return response.selection === 0; // true = yes, false = no
    },
    
    // Title screen
    showTitle(player, title, subtitle = "", fadeIn = 0.5, stay = 3, fadeOut = 1) {
        try {
            player.onScreenDisplay.setTitle(title, { 
                fadeInDuration: fadeIn * 20,
                stayDuration: stay * 20,
                fadeOutDuration: fadeOut * 20,
                subtitle: subtitle
            });
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Action bar
    showActionBar(player, text) {
        try {
            player.onScreenDisplay.setActionBar(text);
            return true;
        } catch (e) {
            return false;
        }
    }
};

/**
 * ==================== TIME API ====================
 */
export const TimeAPI = {
    // Lấy game ticks
    getTicks() {
        return world.gameRules.get?.("gamerule:currentTick") || 0;
    },
    
    // Lấy thời gian thực tế (ms)
    getTime() {
        return Date.now();
    },
    
    // Lấy day time (0-24000)
    getDayTime() {
        return world.getTimeOfDay?.() || 0;
    },
    
    // Đặt day time
    setDayTime(ticks) {
        try {
            world.setTimeOfDay(ticks);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Lấy game rule
    getGameRule(rule) {
        try {
            return world.gameRules.get?.(rule) ?? null;
        } catch (e) {
            return null;
        }
    },
    
    // Đặt game rule
    setGameRule(rule, value) {
        try {
            world.gameRules.set?.(rule, value);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Schedule callback sau N ticks
    schedule(callback, ticks = 1) {
        system.runTimeout(() => {
            callback?.();
        }, ticks);
    },
    
    // Schedule callback mỗi N ticks
    scheduleRepeat(callback, ticks = 1) {
        const interval = system.runInterval(() => {
            callback?.();
        }, ticks);
        return interval;
    },
    
    // Cancel schedule
    unschedule(intervalId) {
        system.clearRun?.(intervalId);
    }
};

/**
 * ==================== WORLD API ====================
 */
export const WorldAPI = {
    // Lấy tất cả players
    getPlayers() {
        return world.getAllPlayers();
    },
    
    // Lấy player theo tên
    getPlayer(name) {
        return world.getAllPlayers().find(p => p.name === name);
    },
    
    // Lấy tất cả entities
    getEntities(dimension = "overworld") {
        const dim = world.getDimension(dimension);
        return dim.getEntities();
    },
    
    // Spawn entity
    spawnEntity(typeId, x, y, z, dimension = "overworld") {
        try {
            const dim = world.getDimension(dimension);
            return dim.spawnEntity(typeId, { x, y, z });
        } catch (e) {
            return null;
        }
    },
    
    // Set weather
    setWeather(type, duration = 600) {
        try {
            if (type === "clear") world.setWeather("clear", duration);
            else if (type === "rain") world.setWeather("rain", duration);
            else if (type === "thunder") world.setWeather("thunder", duration);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Lấy player count
    getPlayerCount() {
        return world.getAllPlayers().length;
    },
    
    // Broadcast message
    broadcast(message) {
        try {
            for (let player of world.getAllPlayers()) {
                player.sendMessage(message);
            }
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Get difficulty
    getDifficulty() {
        return world.difficulty || 1;
    },
    
    // Set difficulty
    setDifficulty(level) {
        try {
            world.difficulty = level; // 0=peaceful, 1=easy, 2=normal, 3=hard
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Explosion
    explode(x, y, z, radius = 5, damage = true, dimension = "overworld") {
        try {
            const dim = world.getDimension(dimension);
            // TODO: Implement explosion
            return true;
        } catch (e) {
            return false;
        }
    }
};

/**
 * ==================== DIMENSION API ====================
 */
export const DimensionAPI = {
    // Lấy dimension
    getDimension(name = "overworld") {
        try {
            return world.getDimension(name);
        } catch (e) {
            return null;
        }
    },
    
    // Lấy tất cả dimensions
    getAllDimensions() {
        return ["overworld", "nether", "the_end"];
    },
    
    // Spawn particle
    spawnParticle(name, x, y, z, count = 1, dimension = "overworld", options = {}) {
        try {
            // TODO: Implement particle spawn (API limitation)
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Play sound
    playSound(nameId, x, y, z, volume = 1.0, pitch = 1.0, dimension = "overworld") {
        try {
            const dim = world.getDimension(dimension);
            // TODO: Implement sound play (API limitation)
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Run command
    async runCommand(command, dimension = "overworld") {
        try {
            const dim = world.getDimension(dimension);
            const result = await dim.runCommandAsync(command);
            return result;
        } catch (e) {
            return null;
        }
    }
};

/**
 * ==================== CHAT API ====================
 */
export const ChatAPI = {
    // Send message
    send(player, message) {
        try {
            player.sendMessage(message);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Send raw JSON message
    sendRaw(player, jsonMessage) {
        try {
            player.sendMessage(JSON.parse(jsonMessage));
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Broadcast
    broadcast(message) {
        return WorldAPI.broadcast(message);
    },
    
    // Format text
    color(text, colorCode) {
        return `§${colorCode}${text}§r`;
    },
    
    bold(text) {
        return `§l${text}§r`;
    },
    
    italic(text) {
        return `§o${text}§r`;
    },
    
    underline(text) {
        return `§n${text}§r`;
    },
    
    strikethrough(text) {
        return `§m${text}§r`;
    },
    
    // Minecraft color codes
    colors: {
        black: "0", darkBlue: "1", darkGreen: "2", darkCyan: "3",
        darkRed: "4", purple: "5", gold: "6", gray: "7",
        darkGray: "8", blue: "9", green: "a", cyan: "b",
        red: "c", magenta: "d", yellow: "e", white: "f"
    }
};

/**
 * ==================== MATH API ====================
 */
export const MathAPI = {
    // Random
    random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    },
    
    // Clamp
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // Lerp
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    // Distance
    distance(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    // Manhattan distance
    manhattanDistance(x1, y1, z1, x2, y2, z2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.abs(z2 - z1);
    },
    
    // Block distance (Chebyshev)
    blockDistance(x1, y1, z1, x2, y2, z2) {
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1));
    },
    
    // Direction vector
    direction(x1, y1, z1, x2, y2, z2) {
        const dist = this.distance(x1, y1, z1, x2, y2, z2);
        if (dist === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: (x2 - x1) / dist,
            y: (y2 - y1) / dist,
            z: (z2 - z1) / dist
        };
    }
};

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

/**
 * ==================== Export All APIs ====================
 */
export default {
    block: BlockAPI,
    entity: EntityAPI,
    inventory: InventoryAPI,
    scoreboard: ScoreboardAPI,
    ui: UIAPI,
    time: TimeAPI,
    world: WorldAPI,
    dimension: DimensionAPI,
    chat: ChatAPI,
    math: MathAPI,
    string: StringAPI,
    array: ArrayAPI
};