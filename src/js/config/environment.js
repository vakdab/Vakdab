export const ENVIRONMENT = Object.freeze({
    production: /github\.io|web\.app$/i.test(window.location.hostname),
    development: /localhost|127\.0\.0\.1/i.test(window.location.hostname),
    debug: new URLSearchParams(window.location.search).get('debug') === '1'
});

export const PUBLIC_PATH = new URL('./', document.baseURI).href;
