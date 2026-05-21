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

  // validação básica
  if (!url) {
    alert('Digite uma URL');
    return;
  }

  if (!url.startsWith("http")) {
    alert("Use um link válido (começando com http ou https)");
    return;
  }

  shortenBtn.innerText = "GERANDO...";
  shortenBtn.disabled = true;

  try {
    const res = await fetch(`/encurtar?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    // 🔥 TRATAMENTO DE ERRO
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

      // stats (se existir)
      if (data.clicks !== undefined && clicksEl && stats) {
        clicksEl.innerText = data.clicks;
        stats.classList.remove('hidden');
      }

    }

  } catch (err) {
    console.error("Erro:", err);
    alert("Erro no servidor");
  }

  shortenBtn.innerText = "ENCURTAR LINK";
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
      btn.innerText = "Copiar link";
    }, 2000);
  } else {
    alert("Link copiado!");
  }
}
