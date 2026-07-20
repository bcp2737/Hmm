import { world } from "@minecraft/server";

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
            
            // Kiểm tra block có BlockEntity không
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

export default BlockAPI;