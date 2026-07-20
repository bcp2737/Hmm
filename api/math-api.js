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

export default MathAPI;