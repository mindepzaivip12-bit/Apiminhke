const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || "https://apiminhke-apiminh.onrender.com";

app.use(express.static("public"));

app.get("/api/live", async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const r = await fetch(API_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MinhKe-Live-Predictor/2.0",
        "Accept": "application/json"
      }
    });
    clearTimeout(timeout);

    if (!r.ok) throw new Error(`Upstream HTTP ${r.status}`);

    const data = await r.json();

    res.set("Cache-Control", "no-store, max-age=0");
    res.json({ ok: true, fetched_at: new Date().toISOString(), data });
  } catch (err) {
    clearTimeout(timeout);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(PORT, () => console.log(`🚀 Live on :${PORT}`));
