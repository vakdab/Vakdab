/** Small observable state primitive for newly isolated modules. */
export function createStore(initialState = {}) {
    let state = { ...initialState };
    const listeners = new Set();
    return {
        get: () => state,
        set: patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; listeners.forEach(fn => fn(state)); return state; },
        subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }
    };
}
