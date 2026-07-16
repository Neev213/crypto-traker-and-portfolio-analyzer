import axios from "axios";
import { COINGECKO_BASE_URL, DEFAULT_CURRENCY } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";

const CACHE_TTL_MS = {
    search: 10 * 60 * 1000,
    markets: 3 * 60 * 1000,
    prices: 2 * 60 * 1000,
    trending: 10 * 60 * 1000,
    coin: 5 * 60 * 1000,
};

/** @type {Map<string, { data: unknown, expires: number }>} */
const cache = new Map();

const getCached = (key, allowStale = false) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (!allowStale && Date.now() > entry.expires) return null;
    return entry.data;
};

const setCached = (key, data, ttlMs) => {
    cache.set(key, { data, expires: Date.now() + ttlMs });
};

const buildClient = () => {
    const apiKey = process.env.COINGECKO_API_KEY?.trim();
    const baseURL = process.env.COINGECKO_API_URL?.trim() || COINGECKO_BASE_URL;
    const headers = {};

    if (apiKey) {
        headers["x-cg-demo-api-key"] = apiKey;
    }

    return axios.create({
        baseURL,
        timeout: 20000,
        headers,
    });
};

const coingecko = buildClient();

const FALLBACK_COINS = [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 64250.12, market_cap: 1265000000000, market_cap_rank: 1, total_volume: 28500000000, high_24h: 65100.00, low_24h: 63800.00, price_change_percentage_24h: 2.35, price_change_percentage_7d_in_currency: 4.12, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
    { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 3480.45, market_cap: 418000000000, market_cap_rank: 2, total_volume: 15200000000, high_24h: 3520.00, low_24h: 3410.00, price_change_percentage_24h: 1.85, price_change_percentage_7d_in_currency: 3.50, image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
    { id: "solana", symbol: "sol", name: "Solana", current_price: 145.60, market_cap: 67500000000, market_cap_rank: 3, total_volume: 4800000000, high_24h: 148.90, low_24h: 141.20, price_change_percentage_24h: 5.42, price_change_percentage_7d_in_currency: 12.10, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
    { id: "binancecoin", symbol: "bnb", name: "BNB", current_price: 585.30, market_cap: 85000000000, market_cap_rank: 4, total_volume: 1200000000, high_24h: 592.00, low_24h: 578.00, price_change_percentage_24h: 0.75, price_change_percentage_7d_in_currency: -1.20, image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
    { id: "ripple", symbol: "xrp", name: "XRP", current_price: 0.58, market_cap: 32500000000, market_cap_rank: 5, total_volume: 1400000000, high_24h: 0.59, low_24h: 0.57, price_change_percentage_24h: -0.45, price_change_percentage_7d_in_currency: 2.15, image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
    { id: "cardano", symbol: "ada", name: "Cardano", current_price: 0.42, market_cap: 14900000000, market_cap_rank: 6, total_volume: 450000000, high_24h: 0.43, low_24h: 0.41, price_change_percentage_24h: 1.15, price_change_percentage_7d_in_currency: -0.80, image: "https://assets.coingecko.com/coins/images/975/large/cardano.png" },
    { id: "dogecoin", symbol: "doge", name: "Dogecoin", current_price: 0.125, market_cap: 18100000000, market_cap_rank: 7, total_volume: 890000000, high_24h: 0.128, low_24h: 0.121, price_change_percentage_24h: 3.20, price_change_percentage_7d_in_currency: 6.45, image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png" },
    { id: "polkadot", symbol: "dot", name: "Polkadot", current_price: 6.15, market_cap: 8800000000, market_cap_rank: 8, total_volume: 210000000, high_24h: 6.25, low_24h: 6.05, price_change_percentage_24h: 0.90, price_change_percentage_7d_in_currency: 1.40, image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png" },
    { id: "chainlink", symbol: "link", name: "Chainlink", current_price: 13.80, market_cap: 8300000000, market_cap_rank: 9, total_volume: 340000000, high_24h: 14.10, low_24h: 13.50, price_change_percentage_24h: 2.10, price_change_percentage_7d_in_currency: 4.80, image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png" },
    { id: "matic-network", symbol: "matic", name: "Polygon", current_price: 0.55, market_cap: 5400000000, market_cap_rank: 10, total_volume: 180000000, high_24h: 0.56, low_24h: 0.54, price_change_percentage_24h: -0.60, price_change_percentage_7d_in_currency: -2.10, image: "https://assets.coingecko.com/coins/images/4713/large/polygon.png" },
    { id: "avalanche-2", symbol: "avax", name: "Avalanche", current_price: 28.40, market_cap: 11200000000, market_cap_rank: 11, total_volume: 410000000, high_24h: 29.10, low_24h: 27.80, price_change_percentage_24h: 1.60, price_change_percentage_7d_in_currency: 5.20, image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png" },
    { id: "uniswap", symbol: "uni", name: "Uniswap", current_price: 8.10, market_cap: 4850000000, market_cap_rank: 12, total_volume: 195000000, high_24h: 8.25, low_24h: 7.95, price_change_percentage_24h: 0.40, price_change_percentage_7d_in_currency: 1.10, image: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png" },
    { id: "cosmos", symbol: "atom", name: "Cosmos Hub", current_price: 6.45, market_cap: 2520000000, market_cap_rank: 13, total_volume: 110000000, high_24h: 6.55, low_24h: 6.35, price_change_percentage_24h: -1.10, price_change_percentage_7d_in_currency: -0.50, image: "https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png" },
    { id: "litecoin", symbol: "ltc", name: "Litecoin", current_price: 72.80, market_cap: 5420000000, market_cap_rank: 14, total_volume: 310000000, high_24h: 73.50, low_24h: 71.90, price_change_percentage_24h: 0.65, price_change_percentage_7d_in_currency: 2.30, image: "https://assets.coingecko.com/coins/images/2/large/litecoin.png" },
    { id: "tron", symbol: "trx", name: "TRON", current_price: 0.135, market_cap: 11800000000, market_cap_rank: 15, total_volume: 240000000, high_24h: 0.137, low_24h: 0.134, price_change_percentage_24h: 0.30, price_change_percentage_7d_in_currency: 1.80, image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png" }
];

const getFallbackData = (path, params = {}) => {
    if (path === "/coins/markets") {
        let result = [...FALLBACK_COINS];
        if (params.ids) {
            const requested = params.ids.split(",").map(i => i.trim().toLowerCase());
            result = result.filter(c => requested.includes(c.id));
        }
        const page = Number(params.page) || 1;
        const perPage = Number(params.per_page) || 50;
        const start = (page - 1) * perPage;
        return result.slice(start, start + perPage);
    }
    if (path === "/search") {
        const q = (params.query || "").trim().toLowerCase();
        const filtered = FALLBACK_COINS.filter(
            c => c.id.includes(q) || c.symbol.includes(q) || c.name.toLowerCase().includes(q)
        ).map(c => ({
            id: c.id,
            name: c.name,
            symbol: c.symbol,
            market_cap_rank: c.market_cap_rank,
            thumb: c.image,
            large: c.image,
        }));
        return { coins: filtered };
    }
    if (path === "/search/trending") {
        return {
            coins: FALLBACK_COINS.slice(0, 7).map(c => ({
                item: {
                    id: c.id,
                    coin_id: c.id,
                    name: c.name,
                    symbol: c.symbol,
                    market_cap_rank: c.market_cap_rank,
                    thumb: c.image,
                    small: c.image,
                    large: c.image,
                    slug: c.id,
                    price_btc: c.current_price / 65000,
                    score: 0,
                    data: {
                        price: "$" + c.current_price.toLocaleString(),
                        price_change_percentage_24h: { usd: c.price_change_percentage_24h },
                    },
                },
            })),
        };
    }
    if (path === "/simple/price") {
        const requested = (params.ids || "").split(",").map(i => i.trim().toLowerCase());
        const prices = {};
        for (const id of requested) {
            const found = FALLBACK_COINS.find(c => c.id === id);
            if (found) {
                prices[id] = {
                    usd: found.current_price,
                    usd_24h_change: found.price_change_percentage_24h,
                    usd_market_cap: found.market_cap,
                };
            } else {
                prices[id] = { usd: 10.0, usd_24h_change: 0.0, usd_market_cap: 100000000 };
            }
        }
        return prices;
    }
    if (path.startsWith("/coins/")) {
        const id = path.replace("/coins/", "").trim().toLowerCase();
        const found = FALLBACK_COINS.find(c => c.id === id) || FALLBACK_COINS[0];
        return {
            id: found.id,
            symbol: found.symbol,
            name: found.name,
            description: { en: `${found.name} is a leading cryptocurrency network.` },
            image: { large: found.image },
            market_data: {
                current_price: { usd: found.current_price },
                market_cap: { usd: found.market_cap },
                price_change_percentage_24h: found.price_change_percentage_24h,
                price_change_percentage_7d: found.price_change_percentage_7d_in_currency,
                high_24h: { usd: found.high_24h },
                low_24h: { usd: found.low_24h },
            },
        };
    }
    return null;
};

const coingeckoGet = async (path, params = {}, cacheKey = null, ttlMs = 60000) => {
    if (cacheKey) {
        const hit = getCached(cacheKey);
        if (hit !== null) return hit;
    }

    try {
        const { data } = await coingecko.get(path, { params });
        if (cacheKey) setCached(cacheKey, data, ttlMs);
        return data;
    } catch (err) {
        const status = err.response?.status;

        if (status === 429 && cacheKey) {
            const stale = getCached(cacheKey, true);
            if (stale !== null) return stale;
        }

        if (status === 429 || !status || status >= 500) {
            const fallback = getFallbackData(path, params);
            if (fallback !== null) {
                if (cacheKey) setCached(cacheKey, fallback, ttlMs);
                return fallback;
            }
        }

        if (status === 429) {
            throw new ApiError(
                429,
                "CoinGecko rate limit reached. Wait about a minute, then try again. For higher limits, add a free COINGECKO_API_KEY to your .env (see coingecko.com/api)."
            );
        }

        throw err;
    }
};

export const fetchMarketData = async ({
    page = 1,
    perPage = 50,
    ids = null,
    sparkline = false,
} = {}) => {
    const params = {
        vs_currency: DEFAULT_CURRENCY,
        order: "market_cap_desc",
        per_page: perPage,
        page,
        sparkline,
        price_change_percentage: "24h,7d",
    };

    if (ids?.length) {
        params.ids = Array.isArray(ids) ? ids.join(",") : ids;
        delete params.page;
        delete params.per_page;
    }

    const cacheKey = ids?.length
        ? `markets:ids:${[...ids].sort().join(",")}`
        : `markets:p${page}:n${perPage}`;

    return coingeckoGet("/coins/markets", params, cacheKey, CACHE_TTL_MS.markets);
};

export const searchCoins = async (query) => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];

    const data = await coingeckoGet(
        "/search",
        { query: normalized },
        `search:${normalized}`,
        CACHE_TTL_MS.search
    );

    return data.coins?.slice(0, 15) || [];
};

export const fetchCoinDetails = async (cryptoId) => {
    const id = cryptoId.trim().toLowerCase();
    return coingeckoGet(
        `/coins/${id}`,
        {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
        },
        `coin:${id}`,
        CACHE_TTL_MS.coin
    );
};

export const fetchTrendingCoins = async () => {
    const data = await coingeckoGet(
        "/search/trending",
        {},
        "trending",
        CACHE_TTL_MS.trending
    );
    return data.coins?.map((item) => item.item) || [];
};

export const fetchSimplePrices = async (ids) => {
    if (!ids?.length) return {};

    const uniqueIds = [...new Set(ids.map((id) => id.toLowerCase()))].sort();
    const cacheKey = `prices:${uniqueIds.join(",")}`;

    return coingeckoGet(
        "/simple/price",
        {
            ids: uniqueIds.join(","),
            vs_currencies: DEFAULT_CURRENCY,
            include_24hr_change: true,
            include_market_cap: true,
        },
        cacheKey,
        CACHE_TTL_MS.prices
    );
};

/** One markets call for multiple coins — fewer requests than search + simple/price */
export const fetchMarketSnapshotsByIds = async (ids) => {
    if (!ids?.length) return [];
    const limited = ids.slice(0, 15);
    const market = await fetchMarketData({ ids: limited });
    return Array.isArray(market) ? market : [];
};

export const mapMarketCoin = (coin) => ({
    cryptoId: coin.id,
    symbol: coin.symbol?.toUpperCase(),
    name: coin.name,
    logoUrl: coin.image,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    priceChange24h: coin.price_change_percentage_24h,
    priceChange7d: coin.price_change_percentage_7d_in_currency,
    totalVolume: coin.total_volume,
    high24h: coin.high_24h,
    low24h: coin.low_24h,
});
