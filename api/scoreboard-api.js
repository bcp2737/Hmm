import { world } from "@minecraft/server";

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

export default ScoreboardAPI;