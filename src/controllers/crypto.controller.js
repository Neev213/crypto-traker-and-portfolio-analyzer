import { Cryptocurrency } from "../models/cryptocurrencies.model.js";
import { PriceHistory } from "../models/price_history.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    fetchMarketData,
    searchCoins,
    fetchCoinDetails,
    fetchTrendingCoins,
    fetchSimplePrices,
    mapMarketCoin,
} from "../services/crypto.service.js";
import { MARKET_DEFAULTS } from "../constants.js";

export const getMarkets = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || MARKET_DEFAULTS.page;
    const perPage = Number(req.query.perPage) || MARKET_DEFAULTS.perPage;

    const market = await fetchMarketData({ page, perPage });
    const data = market.map(mapMarketCoin);

    return res.status(200).json(
        new ApiResponse(200, { coins: data, page, perPage }, "Market data fetched successfully")
    );
});

export const searchCryptocurrencies = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q?.trim()) {
        throw new ApiError(400, "Search query 'q' is required");
    }

    const results = await searchCoins(q.trim());
    const ids = results.map((c) => c.id);

    let prices = {};
    try {
        prices = ids.length ? await fetchSimplePrices(ids) : {};
    } catch (err) {
        console.error("Search price fetch failed:", err.message);
    }

    const enriched = results.map((coin) => {
        const live = prices[coin.id] || {};
        return {
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            thumb: coin.thumb,
            large: coin.large,
            marketCapRank: coin.market_cap_rank,
            currentPrice: live.usd ?? null,
            priceChange24h: live.usd_24h_change ?? null,
            marketCap: live.usd_market_cap ?? null,
        };
    });

    return res.status(200).json(
        new ApiResponse(200, enriched, "Search results fetched successfully")
    );
});

export const getCoinById = asyncHandler(async (req, res) => {
    const { cryptoId } = req.params;

    const [details, prices, history] = await Promise.all([
        fetchCoinDetails(cryptoId),
        fetchSimplePrices([cryptoId]),
        PriceHistory.find({ cryptoId })
            .sort({ recordedAt: -1 })
            .limit(30)
            .lean(),
    ]);

    const live = prices[cryptoId] || {};

    return res.status(200).json(
        new ApiResponse(200, {
            cryptoId: details.id,
            name: details.name,
            symbol: details.symbol?.toUpperCase(),
            logoUrl: details.image?.large,
            description: details.description?.en,
            currentPrice: details.market_data?.current_price?.usd,
            marketCap: details.market_data?.market_cap?.usd,
            priceChange24h: details.market_data?.price_change_percentage_24h,
            priceChange7d: details.market_data?.price_change_percentage_7d,
            high24h: details.market_data?.high_24h?.usd,
            low24h: details.market_data?.low_24h?.usd,
            livePrice: live.usd ?? null,
            liveChange24h: live.usd_24h_change ?? null,
            priceHistory: history.reverse(),
        }, "Coin details fetched successfully")
    );
});

export const getTrending = asyncHandler(async (req, res) => {
    const trending = await fetchTrendingCoins();

    return res.status(200).json(
        new ApiResponse(200, trending, "Trending coins fetched successfully")
    );
});

export const getPrices = asyncHandler(async (req, res) => {
    const ids = req.query.ids?.split(",").filter(Boolean);

    if (!ids?.length) {
        throw new ApiError(400, "Query parameter 'ids' is required (comma-separated coin ids)");
    }

    const prices = await fetchSimplePrices(ids);

    return res.status(200).json(
        new ApiResponse(200, prices, "Prices fetched successfully")
    );
});

export const syncCryptocurrencies = asyncHandler(async (req, res) => {
    const market = await fetchMarketData({ perPage: 100 });
    const operations = market.map((coin) => ({
        updateOne: {
            filter: { cryptoId: coin.id },
            update: {
                $set: {
                    cryptoId: coin.id,
                    symbol: coin.symbol,
                    name: coin.name,
                    logoUrl: coin.image,
                },
            },
            upsert: true,
        },
    }));

    if (operations.length) {
        await Cryptocurrency.bulkWrite(operations);
    }

    const snapshotOps = market
        .filter((coin) => coin.current_price != null)
        .map((coin) => ({
            cryptoId: coin.id,
            price: coin.current_price,
            recordedAt: new Date(),
        }));

    if (snapshotOps.length) {
        await PriceHistory.insertMany(snapshotOps);
    }

    return res.status(200).json(
        new ApiResponse(200, { synced: operations.length }, "Cryptocurrencies synced successfully")
    );
});

export const getCachedCryptocurrencies = asyncHandler(async (req, res) => {
    const coins = await Cryptocurrency.find().sort({ name: 1 }).limit(100);

    return res.status(200).json(
        new ApiResponse(200, coins, "Cached cryptocurrencies fetched successfully")
    );
});
