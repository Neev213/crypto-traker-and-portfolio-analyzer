import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import CoinAvatar from "../components/CoinAvatar";
import { watchlistApi } from "../api/services";
import { formatCurrency, formatPercent, cn } from "../utils/format";

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    Promise.resolve().then(() => setLoading(true));
    try {
      setItems((await watchlistApi.get()) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (cryptoId) => {
    await watchlistApi.remove(cryptoId);
    await load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Watchlist</h1>
        <p className="mt-1 text-zinc-500">Coins you are tracking</p>
      </div>

      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item._id} hover className="flex items-center justify-between">
              <Link to={`/markets/${item.cryptoId}`} className="flex items-center gap-4">
                <CoinAvatar symbol={item.symbol} />
                <div>
                  <p className="font-medium text-white">{item.coinName}</p>
                  <p className="text-sm text-zinc-500">{item.symbol}</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">
                    {formatCurrency(item.currentPrice)}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      (item.priceChange24h ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {formatPercent(item.priceChange24h)}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => remove(item.cryptoId)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="py-12 text-center text-zinc-500">
            Your watchlist is empty.{" "}
            <Link to="/markets" className="text-cyan-400 hover:underline">
              Browse markets
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}
