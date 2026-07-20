// Re-export tất cả APIs cho compatibility
export { BlockAPI } from './block-api.js';
export { EntityAPI } from './entity-api.js';
export { InventoryAPI } from './inventory-api.js';
export { ScoreboardAPI } from './scoreboard-api.js';
export { UIAPI } from './ui-api.js';
export { TimeAPI } from './time-api.js';
export { ChatAPI } from './chat-api.js';
export { MathAPI } from './math-api.js';
export { StringAPI } from './string-api.js';
export { ArrayAPI } from './array-api.js';

export default {
    block: (require('./block-api.js')).BlockAPI,
    entity: (require('./entity-api.js')).EntityAPI,
    inventory: (require('./inventory-api.js')).InventoryAPI,
    scoreboard: (require('./scoreboard-api.js')).ScoreboardAPI,
    ui: (require('./ui-api.js')).UIAPI,
    time: (require('./time-api.js')).TimeAPI,
    chat: (require('./chat-api.js')).ChatAPI,
    math: (require('./math-api.js')).MathAPI,
    string: (require('./string-api.js')).StringAPI,
    array: (require('./array-api.js')).ArrayAPI
};