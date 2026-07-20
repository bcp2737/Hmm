import { world, system } from "@minecraft/server";

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
    
    // Lấy game rule
    getGameRule(rule) {
        try {
            return world.gameRules.get?.(rule) ?? null;
        } catch (e) {
            return null;
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

export default TimeAPI;