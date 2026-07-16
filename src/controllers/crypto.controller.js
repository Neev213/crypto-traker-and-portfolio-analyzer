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
    fetchMarketSnapshotsByIds,
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

    const term = q?.trim();
    if (!term) {
        throw new ApiError(400, "Search query 'q' is required");
    }
    if (term.length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters");
    }

    const results = await searchCoins(term);
    const ids = results.map((c) => c.id);

    let marketById = {};
    try {
        const snapshots = ids.length ? await fetchMarketSnapshotsByIds(ids) : [];
        marketById = Object.fromEntries(snapshots.map((m) => [m.id, m]));
    } catch (err) {
        if (err.statusCode !== 429) {
            console.error("Search market snapshot failed:", err.message);
        }
    }

    const enriched = results.map((coin) => {
        const market = marketById[coin.id];
        return {
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            thumb: coin.thumb || market?.image,
            large: coin.large || market?.image,
            marketCapRank: coin.market_cap_rank ?? market?.market_cap_rank,
            currentPrice: market?.current_price ?? null,
            priceChange24h: market?.price_change_percentage_24h ?? null,
            marketCap: market?.market_cap ?? null,
        };
    });

    return res.status(200).json(
        new ApiResponse(200, enriched, "Search results fetched successfully")
    );
});

export const getCoinById = asyncHandler(async (req, res) => {
    const { cryptoId } = req.params;

    const [details, prices, history] = await Promise.all([
        fetchCoinDetails(cryptoId).catch(() => null),
        fetchSimplePrices([cryptoId]).catch(() => ({})),
        PriceHistory.find({ cryptoId })
            .sort({ recordedAt: -1 })
            .limit(30)
            .lean()
            .catch(() => []),
    ]);

    if (!details) {
        throw new ApiError(404, "Coin not found");
    }

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
            priceHistory: (history || []).reverse(),
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
