type Listener<T = any> = (data: T) => void;

export class EventEmitter {
    private listeners: Record<string, Listener[]> = {};

    on<T = any>(event: string, callback: Listener<T>) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit<T = any>(event: string, data: T) {
        if (!this.listeners[event]) return;
        for (const cb of this.listeners[event]) {
            cb(data);
        }
    }

    off(event: string, callback: Listener) {
        if (!this.listeners[event]) return;

        this.listeners[event] = this.listeners[event].filter(
            cb => cb !== callback
        );
    }
}
