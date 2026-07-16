import { useEffect, useState } from "react";
import { Plus, Bell, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import LoadingSpinner from "../components/LoadingSpinner";
import { alertsApi, cryptoApi } from "../api/services";
import { formatCurrency, cn } from "../utils/format";
import { getErrorMessage } from "../api/axios";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    cryptoId: "",
    coinName: "",
    symbol: "",
    targetPrice: "",
    condition: "above",
  });
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    Promise.resolve().then(() => setLoading(true));
    try {
      const res = await alertsApi.get();
      setAlerts(res || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query || query.length < 2) return;
    const t = setTimeout(async () => {
      try {
        setSearchResults((await cryptoApi.search(query)) || []);
      } catch {
        setSearchResults([]);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [search]);

  const selectCoin = (coin) => {
    setForm({ ...form, cryptoId: coin.id, coinName: coin.name, symbol: coin.symbol });
    setSearch("");
    setSearchResults([]);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await alertsApi.create({
        ...form,
        targetPrice: Number(form.targetPrice),
      });
      setModalOpen(false);
      setForm({ cryptoId: "", coinName: "", symbol: "", targetPrice: "", condition: "above" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (alert) => {
    await alertsApi.update(alert._id, { isActive: !alert.isActive });
    await load();
  };

  const remove = async (id) => {
    await alertsApi.remove(id);
    await load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Price Alerts</h1>
          <p className="mt-1 text-zinc-500">Get notified when prices hit your targets</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} /> New Alert
        </Button>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card
            key={alert._id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-4",
              alert.triggered && "border-emerald-500/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "rounded-xl p-3",
                  alert.triggered ? "bg-emerald-500/20" : "bg-white/5"
                )}
              >
                <Bell
                  className={cn("h-5 w-5", alert.triggered ? "text-emerald-400" : "text-zinc-400")}
                />
              </div>
              <div>
                <p className="font-medium text-white">
                  {alert.coinName || alert.cryptoId}{" "}
                  <span className="text-zinc-500">{alert.symbol}</span>
                </p>
                <p className="text-sm text-zinc-500">
                  Alert when price goes {alert.condition}{" "}
                  <span className="text-white">{formatCurrency(alert.targetPrice)}</span>
                </p>
                <p className="text-sm text-zinc-500">
                  Current: {formatCurrency(alert.currentPrice)}
                  {alert.triggered && (
                    <span className="ml-2 text-emerald-400">· Triggered!</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(alert)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  alert.isActive
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-white/5 text-zinc-500"
                )}
              >
                {alert.isActive ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => remove(alert._id)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
        {!alerts.length && (
          <Card>
            <p className="py-12 text-center text-zinc-500">No alerts yet. Create your first one.</p>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Price Alert" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
          <div className="relative">
            <Input
              label="Search coin"
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                if (!val.trim()) setSearchResults([]);
              }}
              placeholder="Bitcoin..."
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-white/10 bg-[#12121c]">
                {searchResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectCoin(c)}
                      className="w-full px-4 py-2 text-left hover:bg-white/5"
                    >
                      {c.name} ({c.symbol})
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input label="Coin ID" value={form.cryptoId} readOnly className="opacity-60" />
          <Input
            label="Target price (USD)"
            type="number"
            step="any"
            value={form.targetPrice}
            onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
            required
          />
          <label className="block text-sm text-zinc-400">
            Condition
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-white"
            >
              <option value="above">Price goes above</option>
              <option value="below">Price goes below</option>
            </select>
          </label>
          <Button type="submit" className="w-full" loading={saving}>
            Create Alert
          </Button>
        </form>
      </Modal>
    </div>
  );
}
