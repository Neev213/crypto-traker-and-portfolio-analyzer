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
