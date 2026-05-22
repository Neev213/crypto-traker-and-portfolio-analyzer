import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, CheckCircle2 } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import LoadingSpinner from "../components/LoadingSpinner";
import CoinAvatar from "../components/CoinAvatar";
import { portfolioApi, cryptoApi } from "../api/services";
import { formatCurrency, formatPercent } from "../utils/format";
import { getErrorMessage } from "../api/axios";

const emptyHolding = { coinId: "", coinName: "", symbol: "", quantity: "", buyPrice: "" };

const POPULAR_COINS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "btc" },
  { id: "ethereum", name: "Ethereum", symbol: "eth" },
  { id: "solana", name: "Solana", symbol: "sol" },
  { id: "binancecoin", name: "BNB", symbol: "bnb" },
  { id: "ripple", name: "XRP", symbol: "xrp" },
  { id: "cardano", name: "Cardano", symbol: "ada" },
  { id: "dogecoin", name: "Dogecoin", symbol: "doge" },
  { id: "polkadot", name: "Polkadot", symbol: "dot" },
];

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCoinId, setEditCoinId] = useState(null);
  const [form, setForm] = useState(emptyHolding);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setData(await portfolioApi.get());
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearchError("");
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const res = await cryptoApi.search(search);
        setSearchResults(res || []);
        if (!res?.length) {
          setSearchError("No coins found — try another name or pick a popular coin below.");
        }
      } catch (err) {
        setSearchResults([]);
        setSearchError(
          getErrorMessage(err) + " Make sure the backend is running, or pick a popular coin."
        );
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => {
    setEditCoinId(null);
    setForm(emptyHolding);
    setSearch("");
    setSearchResults([]);
    setSearchError("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditCoinId(h.coinId);
    setForm({
      coinId: h.coinId,
      coinName: h.coinName,
      symbol: h.symbol,
      quantity: String(h.quantity),
      buyPrice: String(h.buyPrice),
    });
    setSearch("");
    setSearchResults([]);
    setError("");
    setModalOpen(true);
  };

  const selectCoin = (coin) => {
    setForm((prev) => ({
      ...prev,
      coinId: coin.id,
      coinName: coin.name,
      symbol: (coin.symbol || "").toUpperCase(),
    }));
    setSearch("");
    setSearchResults([]);
    setSearchError("");
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.coinId?.trim()) {
      setError("Please select a coin from search, popular list, or enter Coin ID manually.");
      return;
    }
    if (!form.coinName?.trim() || !form.symbol?.trim()) {
      setError("Coin name and symbol are required.");
      return;
    }

    const qty = Number(form.quantity);
    const price = Number(form.buyPrice);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a valid quantity greater than 0.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid buy price greater than 0.");
      return;
    }

    setSaving(true);
    setSuccess("");
    try {
      const body = {
        coinId: form.coinId.trim().toLowerCase(),
        coinName: form.coinName.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        quantity: qty,
        buyPrice: price,
      };
      let refreshed;
      if (editCoinId) {
        refreshed = await portfolioApi.updateHolding(editCoinId, body);
        setSuccess("Holding updated successfully.");
      } else {
        refreshed = await portfolioApi.addHolding(body);
        setSuccess("Holding added successfully.");
      }
      setModalOpen(false);
      if (refreshed) setData(refreshed);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coinId) => {
    if (!confirm("Remove this holding?")) return;
    await portfolioApi.removeHolding(coinId);
    await load();
  };

  if (loading) return <LoadingSpinner />;

  const holdings = data?.portfolio?.holdings || [];
  const summary = data?.analysis?.summary;
  const coinSelected = Boolean(form.coinId);

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {loadError} — try refreshing the page.
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Portfolio</h1>
          <p className="mt-1 text-zinc-500">
            {formatCurrency(summary?.totalCurrentValue || 0)} ·{" "}
            <span className={summary?.totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"}>
              {formatPercent(summary?.totalProfitLossPercent || 0)} overall
            </span>
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={18} /> Add Holding
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-zinc-500">
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Buy Price</th>
                <th className="px-6 py-4">Current</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">P&L</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.coinId} className="border-t border-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <CoinAvatar symbol={h.symbol} />
                      <div>
                        <p className="font-medium text-white">{h.coinName}</p>
                        <p className="text-xs text-zinc-500">{h.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{h.quantity}</td>
                  <td className="px-6 py-4">{formatCurrency(h.buyPrice)}</td>
                  <td className="px-6 py-4">{formatCurrency(h.currentPrice)}</td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(h.currentValue)}</td>
                  <td
                    className={`px-6 py-4 font-medium ${
                      h.profitLoss >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatPercent(h.profitLossPercent)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(h)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(h.coinId)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!holdings.length && (
            <p className="py-16 text-center text-zinc-500">No holdings yet. Add your first coin.</p>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCoinId ? "Edit Holding" : "Add Holding"}
        wide
      >
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          {!editCoinId && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-400">Quick pick</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_COINS.map((coin) => (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => selectCoin(coin)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        form.coinId === coin.id
                          ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {coin.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative z-[100]">
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                  Search coin
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type Bitcoin, Ethereum..."
                    className="w-full rounded-xl border border-white/8 bg-white/5 py-3 pl-11 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                {searching && (
                  <p className="mt-2 text-xs text-zinc-500">Searching...</p>
                )}
                {searchError && (
                  <p className="mt-2 text-xs text-amber-400">{searchError}</p>
                )}
                {searchResults.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-52 overflow-auto rounded-xl border border-white/10 bg-[#1a1a28] shadow-2xl">
                    {searchResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => selectCoin(c)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10"
                        >
                          <img
                            src={c.large || c.thumb}
                            alt=""
                            className="h-7 w-7 rounded-full"
                          />
                          <span className="font-medium text-white">{c.name}</span>
                          <span className="text-zinc-500 uppercase">{c.symbol}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {coinSelected && (
            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
              <div>
                <p className="font-medium text-white">{form.coinName}</p>
                <p className="text-xs text-zinc-400">
                  {form.symbol} · ID: {form.coinId}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Coin ID"
              placeholder="e.g. bitcoin"
              value={form.coinId}
              onChange={(e) => setForm({ ...form, coinId: e.target.value })}
              required
              disabled={Boolean(editCoinId)}
            />
            <Input
              label="Coin name"
              placeholder="Bitcoin"
              value={form.coinName}
              onChange={(e) => setForm({ ...form, coinName: e.target.value })}
              required
            />
            <Input
              label="Symbol"
              placeholder="BTC"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="any"
              min="0"
              placeholder="0.5"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <Input
              label="Buy price (USD)"
              type="number"
              step="any"
              min="0"
              placeholder="50000"
              value={form.buyPrice}
              onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
              required
            />
          </div>

          <p className="text-xs text-zinc-500">
            Tip: Click a popular coin or search result — Coin ID, name, and symbol fill in
            automatically. You can also type them manually (use CoinGecko ids like{" "}
            <code className="text-cyan-400">bitcoin</code>).
          </p>

          <Button type="submit" className="w-full" loading={saving}>
            {editCoinId ? "Update" : "Add"} Holding
          </Button>
        </form>
      </Modal>
    </div>
  );
}
