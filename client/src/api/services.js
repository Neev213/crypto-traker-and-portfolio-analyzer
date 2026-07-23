import api from "./axios";

const unwrap = (res) => res.data?.data ?? res.data;

/** GET returns { portfolio, analysis }; POST add returns flat portfolio with holdings */
export const normalizePortfolioResponse = (raw) => {
  if (!raw) return null;
  if (raw.portfolio?.holdings) return raw;
  if (Array.isArray(raw.holdings)) {
    return {
      portfolio: {
        _id: raw._id,
        name: raw.name,
        description: raw.description,
        holdings: raw.holdings,
      },
      analysis: raw.analysis ?? null,
    };
  }
  return null;
};

const getPortfolioConfig = () => ({
  headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  params: { _t: Date.now() },
});

export const authApi = {
  register: (formData) =>
    api.post("/users/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  login: (body) => api.post("/users/login", body),
  logout: () => api.post("/users/logout"),
  me: async () => unwrap(await api.get("/users/me")),
  forgotPassword: (email) => api.post("/users/forgot-password", { email }),
  resetPassword: (token, password) => api.post(`/users/reset-password/${token}`, { password }),
  verifyEmail: (data) => api.post("/users/verify-email", data),
  resendVerification: (email) => api.post("/users/resend-verification", { email }),
};

export const portfolioApi = {
  get: async () =>
    normalizePortfolioResponse(unwrap(await api.get("/portfolio", getPortfolioConfig()))),
  update: async (body) => unwrap(await api.patch("/portfolio", body)),
  addHolding: async (body) =>
    normalizePortfolioResponse(unwrap(await api.post("/portfolio/holdings", body))),
  updateHolding: async (coinId, body) =>
    normalizePortfolioResponse(
      unwrap(await api.patch(`/portfolio/holdings/${encodeURIComponent(coinId)}`, body))
    ),
  removeHolding: async (coinId) =>
    normalizePortfolioResponse(
      unwrap(await api.delete(`/portfolio/holdings/${encodeURIComponent(coinId)}`))
    ),
  analysis: async () => unwrap(await api.get("/portfolio/analysis", getPortfolioConfig())),
};

export const watchlistApi = {
  get: async () => unwrap(await api.get("/watchlist")),
  add: async (body) => unwrap(await api.post("/watchlist", body)),
  remove: async (cryptoId) => unwrap(await api.delete(`/watchlist/${cryptoId}`)),
  markets: async () => unwrap(await api.get("/watchlist/markets")),
};

export const alertsApi = {
  get: async () => unwrap(await api.get("/alerts")),
  create: async (body) => unwrap(await api.post("/alerts", body)),
  update: async (id, body) => unwrap(await api.patch(`/alerts/${id}`, body)),
  remove: async (id) => unwrap(await api.delete(`/alerts/${id}`)),
  triggered: async () => unwrap(await api.get("/alerts/triggered")),
};

export const cryptoApi = {
  markets: async (page = 1, perPage = 50) =>
    unwrap(await api.get("/crypto/markets", { params: { page, perPage } })),
  search: async (q) => unwrap(await api.get("/crypto/search", { params: { q } })),
  trending: async () => unwrap(await api.get("/crypto/trending")),
  getCoin: async (id) => unwrap(await api.get(`/crypto/${encodeURIComponent(id)}`)),
  prices: async (ids) =>
    unwrap(await api.get("/crypto/prices", { params: { ids: ids.join(",") } })),
};
