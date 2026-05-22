const longUrlInput = document.getElementById('long-url-input');
const shortenBtn = document.getElementById('shorten-btn');
const resultArea = document.getElementById('result-area');
const shortUrlOutput = document.getElementById('short-url-output');
const clicksEl = document.getElementById('clicks');
const stats = document.getElementById('stats');

/* =========================
   🔗 ENCURTAR LINK
========================= */
shortenBtn.addEventListener('click', async () => {

  const url = longUrlInput.value.trim();

  if (!url) {
    alert('Digite uma URL');
    longUrlInput.focus();
    return;
  }

  if (!url.startsWith("http")) {
    alert("Use um link válido (começando com http ou https)");
    longUrlInput.focus();
    return;
  }

  shortenBtn.innerText = "Gerando...";
  shortenBtn.disabled = true;

  try {
    const res = await fetch(`/encurtar?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok || data.erro) {
      alert(data.erro || "Erro ao encurtar link");
      return;
    }

    if (data.link_curto) {
      shortUrlOutput.value = data.link_curto;
      resultArea.classList.remove('hidden');

      // animação
      const box = resultArea.querySelector('.result-box');
      if (box) {
        box.classList.remove('animate-pop');
        void box.offsetWidth;
        box.classList.add('animate-pop');
      }

      // Mostra contador (começa com 0)
      if (clicksEl && stats) {
        clicksEl.innerText = data.clicks || 0;
        stats.classList.remove('hidden');
      }

      // 🆕 Busca contador real do servidor a cada 3 segundos
      const codigo = data.link_curto.split('/').pop();
      iniciarAtualizacaoCliques(codigo);
    }

  } catch (err) {
    console.error("Erro:", err);
    alert("Erro no servidor. Tente novamente.");
  }

  shortenBtn.innerText = "✨ ENCURTAR LINK";
  shortenBtn.disabled = false;

});

/* =========================
   📋 COPIAR LINK
========================= */
function copiarLink() {
  if (!shortUrlOutput.value) {
    alert("Nenhum link para copiar");
    return;
  }

  navigator.clipboard.writeText(shortUrlOutput.value);

  const btn = document.getElementById('copyText');

  if (btn) {
    btn.innerText = "Copiado ✔";
    setTimeout(() => {
      btn.innerText = "Copiar";
    }, 2000);
  } else {
    alert("Link copiado!");
  }
}

/* =========================
   ⌨️ ENTER PARA ENCURTAR
========================= */
longUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    shortenBtn.click();
  }
});

/* =========================
   🔄 ATUALIZAR CONTADOR EM TEMPO REAL
========================= */
let intervaloCliques = null;

function iniciarAtualizacaoCliques(codigo) {
  // Limpa intervalo anterior
  if (intervaloCliques) {
    clearInterval(intervaloCliques);
  }

  // Busca imediatamente
  buscarCliques(codigo);

  // Atualiza a cada 5 segundos
  intervaloCliques = setInterval(() => {
    buscarCliques(codigo);
  }, 5000);
}

async function buscarCliques(codigo) {
  try {
    const res = await fetch(`/api/clicks/${encodeURIComponent(codigo)}`);
    const data = await res.json();

    if (res.ok && data.clicks !== undefined && clicksEl) {
      clicksEl.innerText = data.clicks;
    }
  } catch (err) {
    console.error("Erro ao buscar cliques:", err);
  }
}
