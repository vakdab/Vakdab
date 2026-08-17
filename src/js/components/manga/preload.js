function limitForConnection() {
    const type = navigator.connection?.effectiveType || '';
    if (/2g|slow-2g/i.test(type)) return 1;
    if (/3g/i.test(type)) return 2;
    return 3;
}

export function createPagePreloader(figures, options = {}) {
    const queue = [];
    const queued = new Set();
    let running = 0;
    const limit = options.limit || limitForConnection();

    const run = () => {
        while (running < limit && queue.length) {
            const figure = queue.shift();
            queued.delete(figure);
            const image = figure?.querySelector('img[data-src]');
            if (!image || ['loading', 'loaded'].includes(figure.dataset.imageState)) continue;
            figure.dataset.imageState = 'loading';
            running += 1;
            const finish = state => {
                figure.dataset.imageState = state;
                running -= 1;
                run();
            };
            image.addEventListener('load', () => finish('loaded'), { once: true });
            image.addEventListener('error', () => finish('error'), { once: true });
            image.src = image.dataset.src;
            image.removeAttribute('data-src');
        }
    };

    const enqueue = (figure, priority = false) => {
        if (!figure || queued.has(figure) || ['loading', 'loaded'].includes(figure.dataset.imageState)) return;
        if (priority) queue.unshift(figure); else queue.push(figure);
        queued.add(figure);
        run();
    };

    const preloadAround = (index, radius = 3) => {
        for (let i = index + 1; i <= index + radius; i += 1) enqueue(figures[i]);
    };

    const observer = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const index = Number(entry.target.dataset.pageIndex);
            enqueue(entry.target);
            preloadAround(index);
        }), { rootMargin: '800px 0px' })
        : null;
    figures.forEach(figure => observer?.observe(figure));

    return {
        enqueue,
        preloadAround,
        dispose() { observer?.disconnect(); },
        limit
    };
}
