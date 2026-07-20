// Signal classes để xử lý luồng điều khiển
class ReturnSignal { 
    constructor(value) { this.value = value; } 
}

class BreakSignal {}

class ContinueSignal {}

class MBLThrow { 
    constructor(value) { this.value = value; } 
}

export { ReturnSignal, BreakSignal, ContinueSignal, MBLThrow };
