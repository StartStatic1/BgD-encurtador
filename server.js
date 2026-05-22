import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

/* =========================
   🚫 DESATIVAR CACHE
========================= */
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

/* =========================
   📁 ARQUIVOS ESTÁTICOS
========================= */
app.use(express.static(__dirname));

/* =========================
   🏠 HOME
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   📄 PÁGINAS SEO
========================= */
app.get("/como-encurtar-link-whatsapp.html", (req, res) => {
  res.sendFile(path.join(__dirname, "como-encurtar-link-whatsapp.html"));
});

app.get("/melhor-encurtador-links-2026.html", (req, res) => {
  res.sendFile(path.join(__dirname, "melhor-encurtador-links-2026.html"));
});

app.get("/dicas.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dicas.html"));
});

/* =========================
   🔁 REDIRECIONAR PÁGINAS ANTIGAS
========================= */
app.get("/encurtador-de-links.html", (req, res) => res.redirect(301, "/"));
app.get("/encurtador-link-gratis.html", (req, res) => res.redirect(301, "/"));
app.get("/link-curto.html", (req, res) => res.redirect(301, "/"));
app.get("/url-curta.html", (req, res) => res.redirect(301, "/"));

/* =========================
   🔐 ASSETLINKS (Android App Links)
========================= */
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json([{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.mnilink.app",
      "sha256_cert_fingerprints": ["65:C9:93:CF:FF:7A:47:B3:6A:C8:D3:73:D3:36:C8:30:66:7D:25:DF:BC:D7:1A:14:71:AB:E1:DB:40:66:C8:89"]
    }
  }]);
});

/* =========================
   🔢 BASE62 UTILS
========================= */
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toBase62(num) {
  if (num === 0) return "0";
  let result = "";
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

/* =========================
   🔗 ENCURTAR LINK (BASE62 SEQUENCIAL)
========================= */
app.get("/encurtar", async (req, res) => {
  const urlLonga = req.query.url;

  if (!urlLonga) {
    return res.status(400).json({ erro: "URL não fornecida" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ erro: "Supabase não configurado" });
  }

  try {
    // 1️⃣ Busca o maior ID atual
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/links?select=id&order=id.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const countData = await countRes.json();
    const lastId = countData.length > 0 ? countData[0].id : 0;
    const nextId = lastId + 1;
    const codigo = toBase62(nextId);

    // 2️⃣ Salva no Supabase (com clicks = 0)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/links`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: nextId,
        codigo_curto: codigo,
        url_longa: urlLonga,
        clicks: 0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Erro Supabase:", text);
      return res.status(500).json({ erro: "Erro ao salvar link" });
    }

    const protocolo = req.headers["x-forwarded-proto"] || req.protocol;
    const linkCurto = `${protocolo}://${req.get("host")}/${codigo}`;

    return res.json({ link_curto: linkCurto, clicks: 0 });

  } catch (err) {
    console.error("Erro geral:", err);
    return res.status(500).json({ erro: "Erro no servidor" });
  }
});

/* =========================
   📊 API: CONTADOR DE CLIQUES
========================= */
app.get("/api/clicks/:codigo", async (req, res) => {
  const codigo = req.params.codigo;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/links?codigo_curto=eq.${encodeURIComponent(codigo)}&select=clicks`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.length > 0) {
      return res.json({ clicks: data[0].clicks || 0 });
    } else {
      return res.status(404).json({ erro: "Link não encontrado" });
    }

  } catch (err) {
    console.error("Erro clicks:", err);
    return res.status(500).json({ erro: "Erro no servidor" });
  }
});

/* =========================
   🔁 REDIRECIONAR LINK CURTO + INCREMENTAR CLIQUES
========================= */
app.get("/:codigo", async (req, res) => {
  const codigo = req.params.codigo;

  if (codigo.includes(".") || codigo === "encurtar" || codigo.startsWith("api")) {
    return res.status(404).send("Página não encontrada");
  }

  try {
    // 1️⃣ Busca o link
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/links?codigo_curto=eq.${encodeURIComponent(codigo)}&select=url_longa,clicks`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.length > 0) {
      const urlLonga = data[0].url_longa;
      const clicksAtual = data[0].clicks || 0;

      // 2️⃣ INCREMENTA O CONTADOR (RPC ou PATCH)
      // Método PATCH: atualiza clicks diretamente
      await fetch(
        `${SUPABASE_URL}/rest/v1/links?codigo_curto=eq.${encodeURIComponent(codigo)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            clicks: clicksAtual + 1,
          }),
        }
      );

      // 3️⃣ Redireciona
      return res.redirect(urlLonga);
    } else {
      return res.status(404).send("Link não encontrado");
    }

  } catch (err) {
    console.error("Erro redirect:", err);
    return res.status(500).send("Erro no servidor");
  }
});

/* =========================
   🚀 START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
