import { world } from "@minecraft/server";

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
                
                // Item in hand
                getItemInHand() {
                    if (entity.getComponent?.("minecraft:inventory")) {
                        const item = entity.getComponent("minecraft:inventory")?.container?.getItem(entity.selectedSlotIndex);
                        return item?.typeId || "minecraft:air";
                    }
                    return "minecraft:air";
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

export default EntityAPI;