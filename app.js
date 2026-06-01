/* ─────────────────────────────────────────────────
   Git Pocket — app.js
   Lógica da interface e registro do Service Worker
───────────────────────────────────────────────── */

// ── Grupos colapsáveis ───────────────────────────
// Exposta no escopo global pois é chamada via onclick="toggleGroup(this)" no HTML
function toggleGroup(header) {
  const group = header.closest('.group');
  group.classList.toggle('open');
}

// ── Busca ────────────────────────────────────────
const searchInput = document.getElementById('search');
const noResults   = document.getElementById('no-results');
const searchTerm  = document.getElementById('search-term');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();

  if (!q) {
    document.querySelectorAll('.group').forEach(g => g.style.display = '');
    document.querySelectorAll('.cmd').forEach(c => c.style.display = '');
    noResults.style.display = 'none';
    return;
  }

  let anyVisible = false;

  document.querySelectorAll('.group').forEach(group => {
    let groupHasMatch = false;

    group.querySelectorAll('.cmd').forEach(cmd => {
      const text     = cmd.textContent.toLowerCase();
      const keywords = (cmd.dataset.keywords || '').toLowerCase();
      const matches  = text.includes(q) || keywords.includes(q);
      cmd.style.display = matches ? '' : 'none';
      if (matches) groupHasMatch = true;
    });

    group.style.display = groupHasMatch ? '' : 'none';
    if (groupHasMatch) {
      group.classList.add('open');
      anyVisible = true;
    }
  });

  noResults.style.display = anyVisible ? 'none' : 'block';
  searchTerm.textContent  = q;
});

// ── Service Worker + notificação de update ───────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('[PWA] Service Worker registrado:', reg.scope);

      function onUpdateReady(waitingSW) {
        const COUNTDOWN = 5;
        const toast    = document.getElementById('update-toast');
        const counter  = document.getElementById('toast-counter');
        const progress = document.getElementById('toast-progress');

        // Exibe o toast com animação de entrada
        counter.textContent = COUNTDOWN;
        toast.classList.add('visible');

        // Aguarda dois frames para o browser registrar o estado inicial
        // da barra antes de iniciar a transição CSS
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            progress.style.transition = `transform ${COUNTDOWN}s linear`;
            progress.style.transform  = 'scaleX(0)';
          });
        });

        // Contador regressivo — decrementa a cada 1s
        let remaining = COUNTDOWN;
        const interval = setInterval(() => {
          remaining--;
          counter.textContent = remaining > 0 ? remaining : 0;
          if (remaining <= 0) {
            clearInterval(interval);
            try {
              waitingSW.postMessage({ type: 'SKIP_WAITING' });
            } catch (e) {
              // SW pode ter sido descartado; recarrega diretamente
              window.location.reload();
            }
          }
        }, 1000);
      }

      // Recarrega quando o novo SW assumir o controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // SW já estava aguardando ao carregar a página
      if (reg.waiting) {
        onUpdateReady(reg.waiting);
        return;
      }

      // Detecta nova instalação enquanto a página está aberta
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdateReady(newSW);
          }
        });
      });

    }).catch(err => console.warn('[PWA] Falha ao registrar SW:', err));
  });
}
