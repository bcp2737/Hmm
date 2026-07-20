/**
 * ==================== CHAT API ====================
 */
export const ChatAPI = {
    // Format text - Color
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

export default ChatAPI;