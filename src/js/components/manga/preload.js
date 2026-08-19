function limitForConnection() {
    const type = navigator.connection?.effectiveType || '';
    if (/2g|slow-2g/i.test(type)) return 1;
    if (/3g/i.test(type)) return 2;
    return 3;
}

function isLoadedState(state) {
    return state === 'loading' || state === 'loaded';
}

export function createPagePreloader(figures, options = {}) {
    const queue = [];
    const queued = new Set();
    const attempts = new WeakMap();
    let running = 0;
    const limit = Math.max(1, Number(options.limit) || limitForConnection());
    const maxAttempts = Math.max(1, Number(options.maxAttempts) || 3);
    const debug = typeof options.debug === 'function' ? options.debug : () => {};

    const setRetryVisibility = (figure, visible) => {
        const retry = figure?.querySelector('.manga-reader__page-retry');
        if (retry) retry.hidden = !visible;
    };

    const run = () => {
        while (running < limit && queue.length) {
            const figure = queue.shift();
            queued.delete(figure);
            const image = figure?.querySelector('img');
            if (!image || isLoadedState(figure.dataset.imageState)) continue;
            const source = image.dataset.pageSrc || image.dataset.src || image.currentSrc;
            if (!source) {
                figure.dataset.imageState = 'error';
                setRetryVisibility(figure, true);
                continue;
            }
            const attempt = (attempts.get(figure) || 0) + 1;
            attempts.set(figure, attempt);
            figure.dataset.imageState = 'loading';
            setRetryVisibility(figure, false);
            running += 1;
            debug('page-request-start', { index: Number(figure.dataset.pageIndex), attempt, running });

            let settled = false;
            const finish = (state, detail = {}) => {
                if (settled) return;
                settled = true;
                image.removeEventListener('load', onLoad);
                image.removeEventListener('error', onError);
                figure.dataset.imageState = state;
                running -= 1;
                if (state === 'error') setRetryVisibility(figure, true);
                debug(`page-${state}`, { index: Number(figure.dataset.pageIndex), attempt, running, ...detail });
                run();
            };
            const onLoad = () => finish('loaded');
            const onError = () => {
                const fallback = image.dataset.fallbackSrc || '';
                const usingFallback = image.dataset.imageFallback === '1';
                if (fallback && !usingFallback && image.src !== fallback) {
                    image.dataset.imageFallback = '1';
                    image.src = fallback;
                    debug('page-fallback', { index: Number(figure.dataset.pageIndex), attempt });
                    return;
                }
                if (attempt < maxAttempts) {
                    finish('retrying', { fallback: usingFallback });
                    const delay = Math.min(4000, 400 * (2 ** Math.max(0, attempt - 1)));
                    setTimeout(() => enqueue(figure, true, true), delay);
                    return;
                }
                finish('error', { fallback: usingFallback });
            };
            image.addEventListener('load', onLoad, { once: true });
            image.addEventListener('error', onError);
            image.dataset.src = source;
            image.src = source;
            image.removeAttribute('data-src');
        }
    };

    const enqueue = (figure, priority = false, force = false) => {
        if (!figure || queued.has(figure)) return;
        if (!force && isLoadedState(figure.dataset.imageState)) return;
        if (force) {
            const image = figure.querySelector('img');
            if (image) {
                image.dataset.imageFallback = '';
                image.dataset.src = image.dataset.pageSrc || image.dataset.src || '';
            }
            figure.dataset.imageState = 'idle';
            setRetryVisibility(figure, false);
        }
        if (priority) queue.unshift(figure); else queue.push(figure);
        queued.add(figure);
        run();
    };

    const retry = figure => {
        attempts.delete(figure);
        enqueue(figure, true, true);
    };

    const preloadAround = (index, radius = 3) => {
        for (let i = Math.max(0, index - 1); i <= index + radius; i += 1) {
            if (i !== index) enqueue(figures[i], i < index + 2);
        }
        enqueue(figures[index], true);
    };

    const observer = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const index = Number(entry.target.dataset.pageIndex);
            enqueue(entry.target, true);
            preloadAround(index);
        }), { root: options.root || null, rootMargin: '800px 0px' })
        : null;
    figures.forEach(figure => {
        observer?.observe(figure);
        figure.querySelector('.manga-reader__page-retry')?.addEventListener('click', event => {
            event.preventDefault();
            retry(figure);
        });
    });

    return {
        enqueue,
        retry,
        preloadAround,
        dispose() { observer?.disconnect(); },
        limit,
        maxAttempts
    };
}
