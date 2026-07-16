import { Portfolio } from "../models/portfolio.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fetchSimplePrices } from "../services/crypto.service.js";
import { buildHoldingsWithPrices, analyzePortfolio } from "../utils/portfolioAnalytics.js";

const getOrCreatePortfolio = async (userId) => {
    let portfolio = await Portfolio.findOne({ userId });

    if (portfolio) return portfolio;

    return Portfolio.create({
        userId,
        name: "My Portfolio",
        holdings: [],
    });
};

const buildPortfolioPayload = async (portfolio) => {
    const coinIds = portfolio.holdings.map((h) => h.coinId);
    const prices = await safeFetchPrices(coinIds);
    const enrichedHoldings = buildHoldingsWithPrices(portfolio.holdings, prices);

    return {
        portfolio: {
            _id: portfolio._id,
            name: portfolio.name,
            description: portfolio.description,
            holdings: enrichedHoldings,
        },
        analysis: analyzePortfolio(enrichedHoldings),
    };
};

const safeFetchPrices = async (coinIds) => {
    if (!coinIds.length) return {};
    try {
        return await fetchSimplePrices(coinIds);
    } catch (err) {
        console.error("CoinGecko price fetch failed:", err.message);
        return {};
    }
};

export const getPortfolio = asyncHandler(async (req, res) => {
    const portfolio = await getOrCreatePortfolio(req.user._id);
    const payload = await buildPortfolioPayload(portfolio);

    return res.status(200).json(
        new ApiResponse(200, payload, "Portfolio fetched successfully")
    );
});

export const updatePortfolioDetails = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name && description === undefined) {
        throw new ApiError(400, "At least one field (name or description) is required");
    }

    const portfolio = await getOrCreatePortfolio(req.user._id);
    if (name) portfolio.name = name;
    if (description !== undefined) portfolio.description = description;
    await portfolio.save();

    const payload = await buildPortfolioPayload(portfolio);

    return res.status(200).json(
        new ApiResponse(200, payload, "Portfolio updated successfully")
    );
});

export const addHolding = asyncHandler(async (req, res) => {
    const { coinId, coinName, symbol, quantity, buyPrice } = req.body;

    if (!coinId?.trim() || !coinName?.trim() || !symbol?.trim()) {
        throw new ApiError(400, "coinId, coinName, and symbol are required");
    }

    const qty = Number(quantity);
    const price = Number(buyPrice);

    if (!Number.isFinite(qty) || qty <= 0) {
        throw new ApiError(400, "quantity must be a number greater than 0");
    }
    if (!Number.isFinite(price) || price <= 0) {
        throw new ApiError(400, "buyPrice must be a number greater than 0");
    }

    const normalizedCoinId = coinId.trim().toLowerCase();
    const portfolio = await getOrCreatePortfolio(req.user._id);
    const existing = portfolio.holdings.find(
        (h) => h.coinId.toLowerCase() === normalizedCoinId
    );

    if (existing) {
        const totalQty = existing.quantity + qty;
        existing.buyPrice = Number(
            ((existing.quantity * existing.buyPrice + qty * price) / totalQty).toFixed(6)
        );
        existing.quantity = Number(totalQty.toFixed(6));
        if (coinName) existing.coinName = coinName.trim();
        if (symbol) existing.symbol = symbol.trim().toUpperCase();
    } else {
        portfolio.holdings.push({
            coinId: normalizedCoinId,
            coinName: coinName.trim(),
            symbol: symbol.trim().toUpperCase(),
            quantity: qty,
            buyPrice: price,
        });
    }

    portfolio.markModified("holdings");
    await portfolio.save();

    const payload = await buildPortfolioPayload(portfolio);

    return res.status(201).json(
        new ApiResponse(201, payload, "Holding added successfully")
    );
});

export const updateHolding = asyncHandler(async (req, res) => {
    const normalizedCoinId = req.params.coinId?.trim().toLowerCase();
    const { quantity, buyPrice, coinName, symbol } = req.body;

    const portfolio = await getOrCreatePortfolio(req.user._id);
    const holding = portfolio.holdings.find(
        (h) => h.coinId.toLowerCase() === normalizedCoinId
    );

    if (!holding) {
        throw new ApiError(404, "Holding not found in portfolio");
    }

    if (quantity != null) {
        if (Number(quantity) <= 0) throw new ApiError(400, "quantity must be greater than 0");
        holding.quantity = Number(quantity);
    }
    if (buyPrice != null) {
        if (Number(buyPrice) <= 0) throw new ApiError(400, "buyPrice must be greater than 0");
        holding.buyPrice = Number(buyPrice);
    }
    if (coinName) holding.coinName = coinName;
    if (symbol) holding.symbol = symbol.toUpperCase();

    portfolio.markModified("holdings");
    await portfolio.save();

    const payload = await buildPortfolioPayload(portfolio);

    return res.status(200).json(
        new ApiResponse(200, payload, "Holding updated successfully")
    );
});

export const removeHolding = asyncHandler(async (req, res) => {
    const normalizedCoinId = req.params.coinId?.trim().toLowerCase();

    const portfolio = await getOrCreatePortfolio(req.user._id);
    const index = portfolio.holdings.findIndex(
        (h) => h.coinId.toLowerCase() === normalizedCoinId
    );

    if (index === -1) {
        throw new ApiError(404, "Holding not found in portfolio");
    }

    portfolio.holdings.splice(index, 1);
    portfolio.markModified("holdings");
    await portfolio.save();

    const payload = await buildPortfolioPayload(portfolio);

    return res.status(200).json(
        new ApiResponse(200, payload, "Holding removed successfully")
    );
});

export const getPortfolioAnalysis = asyncHandler(async (req, res) => {
    const portfolio = await getOrCreatePortfolio(req.user._id);
    const coinIds = portfolio.holdings.map((h) => h.coinId);
    const prices = await safeFetchPrices(coinIds);
    const enrichedHoldings = buildHoldingsWithPrices(portfolio.holdings, prices);
    const analysis = analyzePortfolio(enrichedHoldings);

    return res.status(200).json(
        new ApiResponse(200, analysis, "Portfolio analysis generated successfully")
    );
});
