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
                getSlot: () => null
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
                        count: item.amount
                    };
                } catch (e) {
                    return null;
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
            }
        };
    }
};

export default InventoryAPI;