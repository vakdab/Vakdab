/**
 * LRU (Least Recently Used) Cache — обмежує кількість записів,
 * автоматично видаляючи найстарішим при переповненні.
 */
export class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * Debounce — утримує функцію від частого виконання
 */
export function debounce(fn, delayMs = 250) {
  let timeoutId = null;
  let lastThis = null;
  let lastArgs = null;

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const debounced = function(...args) {
    lastThis = this;
    lastArgs = args;
    cancel();
    timeoutId = setTimeout(() => {
      fn.apply(lastThis, lastArgs);
      timeoutId = null;
    }, delayMs);
  };

  debounced.cancel = cancel;
  debounced.flush = () => {
    if (timeoutId !== null) {
      fn.apply(lastThis, lastArgs);
      cancel();
    }
  };

  return debounced;
}

/**
 * Throttle — гарантує виконання функції не частіше ніж раз на N мс
 */
export function throttle(fn, delayMs = 300) {
  let lastCall = 0;
  let timeoutId = null;
  let lastThis = null;
  let lastArgs = null;
  let lastReturn = undefined;

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const throttled = function(...args) {
    const now = Date.now();
    lastThis = this;
    lastArgs = args;

    if (now - lastCall >= delayMs) {
      lastCall = now;
      lastReturn = fn.apply(lastThis, lastArgs);
      cancel();
    } else {
      cancel();
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        lastReturn = fn.apply(lastThis, lastArgs);
      }, delayMs - (now - lastCall));
    }

    return lastReturn;
  };

  throttled.cancel = cancel;

  return throttled;
}
