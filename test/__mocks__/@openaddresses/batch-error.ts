export default class MockError {
    public errors: string[] = [];
    
    constructor(message?: string) {
        if (message) this.errors.push(message);
    }
    
    add(error: string) {
        this.errors.push(error);
        return this;
    }
    
    json() {
        return { errors: this.errors };
    }
    
    toString() {
        return this.errors.join(', ');
    }
}
