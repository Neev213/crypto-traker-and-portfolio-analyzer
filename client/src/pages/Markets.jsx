import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star } from "lucide-react";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import CoinAvatar from "../components/CoinAvatar";
import Button from "../components/ui/Button";
import { cryptoApi, watchlistApi } from "../api/services";
import { formatCurrency, formatPercent, cn } from "../utils/format";
import { getErrorMessage } from "../api/axios";

export default function Markets() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [searchError, setSearchError] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);

  const loadMarkets = async (p = 1) => {
    setLoading(true);
    setSearchError("");
    setIsSearchMode(false);
    try {
      const res = await cryptoApi.markets(p, 50);
      setCoins(res?.coins || []);
      setPage(res?.page || p);
    } catch (err) {
      setSearchError(getErrorMessage(err));
      setCoins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      loadMarkets();
      return;
    }
    setSearching(true);
    setSearchError("");
    setIsSearchMode(true);
    try {
      const results = await cryptoApi.search(query.trim());
      const mapped = (results || []).map((c) => ({
        cryptoId: c.id,
        name: c.name,
        symbol: (c.symbol || "").toUpperCase(),
        logoUrl: c.large || c.thumb,
        currentPrice: c.currentPrice ?? null,
        priceChange24h: c.priceChange24h ?? null,
        marketCap: c.marketCap ?? null,
      }));
      setCoins(mapped);
      if (!mapped.length) {
        setSearchError(`No coins found for "${query.trim()}". Try "bitcoin" or "eth".`);
      }
    } catch (err) {
      setCoins([]);
      setSearchError(getErrorMessage(err) + " — is the backend running?");
    } finally {
      setSearching(false);
    }
  };

  const addWatchlist = async (coin) => {
    try {
      await watchlistApi.add({
        cryptoId: coin.cryptoId,
        coinName: coin.name,
        symbol: coin.symbol,
      });
      alert(`${coin.name} added to watchlist`);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Markets</h1>
        <p className="mt-1 text-zinc-500">Explore live cryptocurrency prices</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coins..."
            className="w-full rounded-xl border border-white/8 bg-white/5 py-3 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        <Button type="submit" loading={searching}>
          Search
        </Button>
        {query && (
          <Button type="button" variant="secondary" onClick={() => { setQuery(""); loadMarkets(); }}>
            Clear
          </Button>
        )}
      </form>

      {searchError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {searchError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="text-zinc-500">
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Coin</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">24h</th>
                  <th className="px-6 py-4">Market Cap</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin, i) => (
                  <tr key={coin.cryptoId} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-zinc-500">{(page - 1) * 50 + i + 1}</td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/markets/${coin.cryptoId}`}
                        className="flex items-center gap-3 font-medium text-white hover:text-cyan-400"
                      >
                        <CoinAvatar src={coin.logoUrl} symbol={coin.symbol} />
                        {coin.name}
                        <span className="text-zinc-500">{coin.symbol}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">{formatCurrency(coin.currentPrice)}</td>
                    <td
                      className={cn(
                        "px-6 py-4 font-medium",
                        (coin.priceChange24h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {formatPercent(coin.priceChange24h)}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {coin.marketCap ? formatCurrency(coin.marketCap, true) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => addWatchlist(coin)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-cyan-500/10 hover:text-cyan-400"
                        title="Add to watchlist"
                      >
                        <Star size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!coins.length && !loading && (
              <p className="py-16 text-center text-zinc-500">
                {isSearchMode ? "No search results." : "No market data available."}
              </p>
            )}
          </div>
          {!isSearchMode && (
            <div className="flex justify-center gap-3 border-t border-white/5 p-4">
              <Button variant="secondary" disabled={page <= 1} onClick={() => loadMarkets(page - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-zinc-500">Page {page}</span>
              <Button variant="secondary" onClick={() => loadMarkets(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
