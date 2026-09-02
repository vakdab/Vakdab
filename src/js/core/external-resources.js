const resourcePromises = new Map();

export function loadExternalScript(src) {
    if (resourcePromises.has(src)) return resourcePromises.get(src);
    const existing = [...document.scripts].find(script => script.dataset.externalResource === src);
    if (existing) return Promise.resolve(existing);

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.externalResource = src;
        script.onload = () => resolve(script);
        script.onerror = () => reject(new Error(`Не вдалося завантажити зовнішній ресурс: ${src}`));
        document.head.appendChild(script);
    });
    resourcePromises.set(src, promise);
    return promise;
}

export function ensureTailwind() {
    return loadExternalScript('https://cdn.tailwindcss.com');
}
