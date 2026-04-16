/* ============================================================
   PAGE LOADER — Rede Neural · Conectando os Pontos
   ============================================================ */
(function initLoader() {

  function run() {
    const wrap    = document.getElementById('page-loader');
    const canvas  = document.getElementById('loaderCanvas');
    const barFill = document.getElementById('loaderBarFill');
    const pctEl   = document.getElementById('loaderPct');
    const logoImg = document.getElementById('loaderLogo');
    if (!wrap || !canvas) return;
    startLoader(wrap, canvas, barFill, pctEl, logoImg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }

  /* ------------------------------------------------------------------ */
  function startLoader(wrap, canvas, barFill, pctEl, logoImg) {

    document.body.classList.add('loader-active');

    const ctx = canvas.getContext('2d');

    /* ── Cores monocromáticas roxas ── */
    const VIOLET      = '139,92,246';   // #8B5CF6
    const VIOLET_LITE = '167,139,250';  // #a78bfa
    const WHITE       = '255,255,255';

    /* ── Dimensões (canvas cobre toda a tela) ── */
    let W, H, dpr;
    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── Nós neurais ── */
    const NODE_COUNT = 38;
    const DOT_R      = 3;
    const CONNECT_DIST = Math.min(W, H) * 0.26; // distância máx para ligar

    /* Distribui nós: maioria espalhada, alguns próximos ao centro */
    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
      /* zona: 20% centrais têm probabilidade maior de ser ancorados perto do centro */
      const nearCenter = i < NODE_COUNT * 0.3;
      const margin = 80;
      return {
        x: nearCenter
          ? W / 2 + (Math.random() - .5) * W * .42
          : margin + Math.random() * (W - margin * 2),
        y: nearCenter
          ? H / 2 + (Math.random() - .5) * H * .42
          : margin + Math.random() * (H - margin * 2),
        vx: (Math.random() - .5) * 0.28,
        vy: (Math.random() - .5) * 0.28,
        r: DOT_R + Math.random() * 1.5,
        /* opacidade individual — começa baixa, sobe com progresso */
        alpha: 0.12 + Math.random() * 0.18,
        /* fator de "já apareceu" — spawn gradual no início */
        born: Math.random(),         // normalizado 0-1; só aparece quando progress >= born
        /* progresso de conexão de cada aresta que parte deste nó */
        connProg: {},                 // { indexVizinho: 0→1 }
      };
    });

    /* Pré-calcula pares de vizinhos (arestas) dentro de CONNECT_DIST */
    /* Recalculado a cada resize mas guardado para perf */
    let edges = [];
    function buildEdges() {
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < CONNECT_DIST) {
            edges.push({ i, j, dist,
              /* quando este edge começa a aparecer (fração 0-1 do progresso) */
              threshold: Math.random(),
              /* progresso individual de desenho (0→1) */
              drawProg: 0,
            });
          }
        }
      }
      /* Ordena por threshold para conexão narrativa */
      edges.sort((a, b) => a.threshold - b.threshold);
    }
    buildEdges();
    window.addEventListener('resize', buildEdges);

    /* ── Estado global de progresso (0 → 1) ── */
    let progress     = 0;   // controlado por tempo + window.load
    let loadDone     = false;
    let dismissed    = false;
    let rafHandle;

    /* Duração mínima da animação mesmo se a página já carregou */
    const MIN_DURATION = 2200;  // ms
    const startTime = performance.now();

    /* Rastreia progresso real do browser (ResourceTiming + DOMContentLoaded) */
    let browserProgress = 0;
    window.addEventListener('load', () => {
      loadDone = true;
      browserProgress = 1;
    });
    document.addEventListener('DOMContentLoaded', () => {
      browserProgress = Math.max(browserProgress, 0.6);
    });

    /* ── Easing ── */
    const easeOut3  = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
    const lerp      = (a, b, t) => a + (b - a) * t;

    /* ── Update de progresso ── */
    function updateProgress(now) {
      const elapsed = now - startTime;
      const timeFrac = Math.min(elapsed / MIN_DURATION, 1);

      /* Durante o carregamento, sobe até 90% com base no tempo */
      const timeProgress = easeOut3(timeFrac) * (loadDone ? 1 : 0.88);
      const target = Math.max(timeProgress, browserProgress * (loadDone ? 1 : 0.85));
      /* Sobe suavemente, nunca desce */
      progress = Math.min(1, Math.max(progress, lerp(progress, target, 0.04)));
    }

    /* ── Logo permanece sempre branca — sem alteração de cor ── */
    function updateLogo() { /* intencional: logo é branca fixa via CSS */ }

    /* ── Atualiza barra e percentual ── */
    function updateBar(p) {
      if (barFill) barFill.style.width = (p * 100).toFixed(1) + '%';
      if (pctEl)   pctEl.textContent   = Math.round(p * 100) + '%';
    }

    /* ── Loop de render ── */
    function frame(now) {
      if (dismissed) return;

      updateProgress(now);
      updateLogo();
      updateBar(progress);

      ctx.clearRect(0, 0, W, H);

      /* Fundo com vinheta sutil */
      const vignette = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*.72);
      vignette.addColorStop(0, 'rgba(5,5,8,0)');
      vignette.addColorStop(1, 'rgba(0,0,10,0.55)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      /* Movimentação suave dos nós */
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 40 || n.x > W - 40) n.vx *= -1;
        if (n.y < 40 || n.y > H - 40) n.vy *= -1;
      });

      /* Atualiza progresso de cada aresta conforme o progresso global */
      edges.forEach(e => {
        /* A aresta só começa a aparecer quando progress > threshold */
        const edgeProgress = Math.max(0, (progress - e.threshold * 0.8) / 0.2);
        e.drawProg = Math.min(1, easeInOut(edgeProgress));
      });

      /* Desenha arestas */
      edges.forEach(e => {
        if (e.drawProg <= 0) return;
        const a = nodes[e.i];
        const b = nodes[e.j];
        const pAlive = Math.min(a.alpha, b.alpha);
        /* Opacidade da linha: mais fraca nas bordas */
        const lineAlpha = e.drawProg * pAlive * 0.65
                          * (1 - e.dist / CONNECT_DIST);

        /* Ponto parcial para o efeito de "desenhando" */
        const ex = a.x + (b.x - a.x) * e.drawProg;
        const ey = a.y + (b.y - a.y) * e.drawProg;

        /* Gradiente roxo com shimmer no avanço */
        const grad = ctx.createLinearGradient(a.x, a.y, ex, ey);
        grad.addColorStop(0,   `rgba(${VIOLET},${ lineAlpha })`);
        grad.addColorStop(0.75,`rgba(${VIOLET_LITE},${lineAlpha * 1.35})`);
        grad.addColorStop(1,   `rgba(${VIOLET_LITE},${e.drawProg < 1 ? lineAlpha * 1.8 : lineAlpha})`);

        ctx.save();
        if (e.drawProg < 1) {
          ctx.shadowColor = `rgba(${VIOLET_LITE},0.6)`;
          ctx.shadowBlur  = 6;
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 0.85;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.restore();
      });

      /* Desenha nós */
      nodes.forEach(n => {
        /* Só aparece quando progress >= born */
        if (progress < n.born * 0.7) return;
        const spawnT = Math.min(1, (progress - n.born * 0.7) / 0.12);
        const nodeAlpha = n.alpha * easeOut3(spawnT);

        ctx.save();
        ctx.shadowColor = `rgba(${VIOLET_LITE},0.8)`;
        ctx.shadowBlur  = progress > 0.5 ? 10 : 4;

        /* Preenchimento branco/roxo: vira roxo conforme progress */
        const r = Math.round(lerp(255, 139, progress));
        const g = Math.round(lerp(255,  92, progress));
        const b = Math.round(lerp(255, 246, progress));
        ctx.fillStyle = `rgba(${r},${g},${b},${nodeAlpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        /* Halo */
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${VIOLET_LITE},${nodeAlpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      /* ── Disparo do dismiss quando progresso completo ── */
      if (progress >= 1 && !dismissed) {
        /* Pequena pausa para o "100%" ser legível */
        setTimeout(dismissLoader, 380);
        dismissed = true;
        return;
      }

      rafHandle = requestAnimationFrame(frame);
    }

    /* ── Dismiss ── */
    function dismissLoader() {
      cancelAnimationFrame(rafHandle);
      document.body.classList.remove('loader-active');
      wrap.classList.add('loader-hidden');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }

    /* Fallback máximo 6 s */
    setTimeout(() => {
      if (!dismissed) { dismissed = true; dismissLoader(); }
    }, 6000);

    rafHandle = requestAnimationFrame(frame);

  } // end startLoader
})();

/* ============================================================
   /PAGE LOADER
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    // 1. Cursor Customizado - Ativação Apenas para Desktop Pointers
    const cursor = document.getElementById('cursor');
    if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        document.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        const hoverTargets = document.querySelectorAll('a, button, .tag, .process-video-box, .client-logo, .ctrl-btn, .c-dot');
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    }

    // 2. Animação de Blob e Transmutação do Header no Scroll Limitada (Debounce R.A.F)
    const header = document.querySelector('header');
    const blob = document.querySelector('.gradient-blob');
    let isTicking = false;

    // 2a. Parallax elegante nas imagens de serviço — scale + translateY suave
    const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));

    // Estado atual interpolado por cartão (lerp para suavidade extra)
    const parallaxState = parallaxItems.map(() => ({ cur: 0, target: 0 }));
    let rafId = null;
    let isParallaxRunning = false;

    const calcTargets = () => {
        const vH = window.innerHeight;
        parallaxItems.forEach((wrap, i) => {
            const visual = wrap.closest('.service-visual');
            if (!visual) return;
            const rect = visual.getBoundingClientRect();
            // Progresso: -1 (card acima da viewport) → +1 (card abaixo)
            const progress = ((rect.top + rect.height / 2) - vH / 2) / (vH * 0.7);
            const clamped = Math.min(Math.max(progress, -1), 1);
            // ±14px de deslocamento dentro da margem de scale(1.20)
            parallaxState[i].target = clamped * 14;
        });
    };

    const applyParallax = () => {
        let stillMoving = false;
        parallaxState.forEach((state, i) => {
            // Lerp: suaviza a transição (fator 0.08 = muito fluido)
            state.cur += (state.target - state.cur) * 0.08;
            if (Math.abs(state.target - state.cur) > 0.05) stillMoving = true;
            // scale(1.20) constante + translateY variável
            parallaxItems[i].style.transform = `scale(1.20) translateY(${state.cur.toFixed(3)}px)`;
        });
        if (stillMoving) {
            rafId = requestAnimationFrame(applyParallax);
        } else {
            isParallaxRunning = false;
        }
    };

    const updateServiceParallax = () => {
        if (!parallaxItems.length) return;
        calcTargets();
        if (!isParallaxRunning) {
            isParallaxRunning = true;
            rafId = requestAnimationFrame(applyParallax);
        }
    };

    const onScroll = () => {
        // Toggle de transparência de Header
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Parallax na camada do blob (opcional/embelezamento)
        if (blob) {
            blob.style.transform = `translateY(calc(-50% + ${window.scrollY * 0.12}px))`;
        }

        // Parallax das imagens de serviço
        updateServiceParallax();

        isTicking = false;
    };

    // Roda uma vez no carregamento para estado inicial correto
    updateServiceParallax();

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(onScroll);
            isTicking = true;
        }
    });

    // 3. Efeitos Texto: Troca de Palavras Animadas
    const swapModules = document.querySelectorAll('.hl-swap');
    swapModules.forEach(swapEl => {
        const words = ['& Dados Online', '& Criatividade', '& Mídia Online'];
        let currentIndex = 0;
        const nextText = swapEl.querySelector('.s-nxt');
        const currText = swapEl.querySelector('.s-cur');

        if (currText && nextText) {
            setInterval(() => {
                swapEl.classList.remove('go');
                currText.textContent = words[currentIndex];
                currentIndex = (currentIndex + 1) % words.length;
                nextText.textContent = words[currentIndex];

                setTimeout(() => swapEl.classList.add('go'), 50);
            }, 4000);
        }
    });

    // 4. Reveal Components Animados Usando Observers Nativos
    const obsOptions = { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 };
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                obs.unobserve(entry.target);
            }
        });
    }, obsOptions);

    document.querySelectorAll('.reveal, .service-card, .process-step, .btn-play').forEach(el => {
        revealObserver.observe(el);
    });

    // 5. Motor Moderno do Carrossel de Liderança (Alavancando API Nativa Smooth Scroll)
    const leaderCarousel = document.querySelector('.leader-carousel-wrap');
    const leaderCards = document.querySelectorAll('.leader-card');
    const prevCtrl = document.getElementById('leaderPrev');
    const nextCtrl = document.getElementById('leaderNext');
    const dotsContainer = document.getElementById('leaderDots');

    if (leaderCarousel && leaderCards.length > 0) {
        let dots = [];
        // Gera as bolinhas dinamicamente com base na quantidade de cards
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            leaderCards.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.classList.add('c-dot');
                dot.addEventListener('click', () => {
                    leaderCards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                });
                dotsContainer.appendChild(dot);
                dots.push(dot);
            });
        }

        // Atualiza bolinhas magicamente ativando card que está no meio da tela
        const snapObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = Array.from(leaderCards).indexOf(entry.target);
                    dots.forEach(d => d.classList.remove('active'));
                    if (dots[idx]) dots[idx].classList.add('active');
                }
            });
        }, { root: leaderCarousel, threshold: 0.6 });

        leaderCards.forEach(card => snapObserver.observe(card));

        // Controle por setas
        const scrollSize = () => window.innerWidth > 900 ? (leaderCarousel.clientWidth / 2) + 12 : leaderCarousel.clientWidth;
        if (prevCtrl) {
            prevCtrl.addEventListener('click', () => {
                leaderCarousel.scrollBy({ left: -scrollSize(), behavior: 'smooth' });
            });
        }
        if (nextCtrl) {
            nextCtrl.addEventListener('click', () => {
                leaderCarousel.scrollBy({ left: scrollSize(), behavior: 'smooth' });
            });
        }
    }
});
