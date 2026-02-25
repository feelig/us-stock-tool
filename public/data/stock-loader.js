(function (global) {
    const STORE = global.STOCK_HISTORICAL_DATA = global.STOCK_HISTORICAL_DATA || {};
    const PENDING = new Map();

    function normalizeTicker(ticker) {
        return String(ticker || "").trim().toUpperCase();
    }

    function detectBasePath() {
        const current = document.currentScript && document.currentScript.src ? document.currentScript.src : "";
        const src = current || (function () {
            const scripts = Array.from(document.getElementsByTagName("script"));
            const hit = scripts.reverse().find(s => /stock-loader\.js(\?.*)?$/.test(s.src || ""));
            return hit ? hit.src : "";
        })();
        if (!src) return "data/";
        return src.slice(0, src.lastIndexOf("/") + 1);
    }

    const BASE_PATH = detectBasePath();

    function registerChunk(ticker, payload) {
        const key = normalizeTicker(ticker);
        if (!key || !payload || typeof payload !== "object") return;
        STORE[key] = payload;
    }

    function loadTickerData(ticker) {
        const key = normalizeTicker(ticker);
        if (!key) return Promise.resolve(null);
        if (STORE[key]) return Promise.resolve(STORE[key]);
        if (PENDING.has(key)) return PENDING.get(key);

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `${BASE_PATH}tickers/${key}.js`;
            script.async = true;
            script.onload = function () {
                if (STORE[key]) resolve(STORE[key]);
                else reject(new Error(`Ticker chunk loaded but no payload: ${key}`));
            };
            script.onerror = function () {
                reject(new Error(`Failed to load ticker chunk: ${key}`));
            };
            document.head.appendChild(script);
        }).finally(() => {
            PENDING.delete(key);
        });

        PENDING.set(key, promise);
        return promise;
    }

    function loadTickersData(tickers) {
        const list = [...new Set((Array.isArray(tickers) ? tickers : [])
            .map(normalizeTicker)
            .filter(Boolean))];
        if (!list.length) return Promise.resolve(STORE);
        return Promise.all(list.map(loadTickerData)).then(() => STORE);
    }

    function isTickerLoaded(ticker) {
        const key = normalizeTicker(ticker);
        return !!(key && STORE[key]);
    }

    global.__registerStockChunk = registerChunk;
    global.loadTickerData = loadTickerData;
    global.loadTickersData = loadTickersData;
    global.isTickerLoaded = isTickerLoaded;
})(window);

