/* ============================================================
   PAGE LOADER — Logo Fill · Nós Neurais · Frases de Etapa
   ============================================================ */
(function initLoader() {

  function run() {
    const wrap       = document.getElementById('page-loader');
    const bgCanvas   = document.getElementById('loaderBg');
    const logoCanvas = document.getElementById('loaderLogoCanvas');
    const pctEl      = document.getElementById('loaderPct');
    const phraseEl   = document.getElementById('loaderPhrase');
    if (!wrap || !logoCanvas) return;
    startLoader(wrap, bgCanvas, logoCanvas, pctEl, phraseEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }

  /* ================================================================ */
  function startLoader(wrap, bgCanvas, logoCanvas, pctEl, phraseEl) {

    document.body.classList.add('loader-active');

    /* ── Progresso (0→1) ── */
    let progress  = 0;
    let loadDone  = false;
    let dismissed = false;
    let rafId;

    const START_TIME   = performance.now();
    const MIN_DURATION = 2800;   /* mínimo 2.8 s para dar tempo de ver a animação */

    let browserProg = 0;
    document.addEventListener('DOMContentLoaded', () => { browserProg = Math.max(browserProg, 0.55); });
    window.addEventListener('load', () => { browserProg = 1; loadDone = true; });

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const lerp    = (a, b, t) => a + (b - a) * t;

    function calcProgress(now) {
      const elapsed  = now - START_TIME;
      const timeFrac = Math.min(elapsed / MIN_DURATION, 1);
      const timeProg = easeOut(timeFrac) * (loadDone ? 1 : 0.82);
      const target   = Math.max(timeProg, browserProg * (loadDone ? 1 : 0.78));
      progress = Math.min(1, Math.max(progress, lerp(progress, target, 0.035)));
    }

    /* ── Frases de etapa ── */
    const PHRASES = [
      'Começamos aqui',
      'Aguarde enquanto conectamos os pontos',
      'Mapeando as possibilidades',
      'Agora é só virar na primeira Esquina',
    ];
    let currentPhrase = -1;

    function updatePhrase(p) {
      const idx = p < 0.26 ? 0 : p < 0.54 ? 1 : p < 0.80 ? 2 : 3;
      if (idx === currentPhrase) return;
      currentPhrase = idx;
      if (!phraseEl) return;

      phraseEl.classList.remove('phrase-in');
      phraseEl.classList.add('phrase-out');

      setTimeout(() => {
        phraseEl.textContent = PHRASES[idx];
        phraseEl.classList.remove('phrase-out');
        void phraseEl.offsetWidth;   /* força reflow */
        phraseEl.classList.add('phrase-in');
      }, 480);
    }

    /* Primeira frase imediata */
    if (phraseEl) {
      phraseEl.textContent = PHRASES[0];
      phraseEl.classList.add('phrase-in');
      currentPhrase = 0;
    }

    /* ════════════════════════════════════════════════════════════
       BACKGROUND — Nós neurais
       • Desconectados no início
       • Conexões aparecem progressivamente conforme progress sobe
    ════════════════════════════════════════════════════════════ */
    const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
    let bgW, bgH, bgDpr;

    /* 48 nós espalhados pela tela */
    const N_COUNT = 48;
    const nodes = Array.from({ length: N_COUNT }, () => ({
      x  : Math.random(),
      y  : Math.random(),
      vx : (Math.random() - .5) * 0.00014,
      vy : (Math.random() - .5) * 0.00014,
      r  : 1.6 + Math.random() * 2.4,
      a  : 0.22 + Math.random() * 0.38,
    }));

    /* Pré-computa arestas candidatas */
    const EDGE_DIST = 0.195;
    const edges = [];
    for (let i = 0; i < N_COUNT; i++) {
      for (let j = i + 1; j < N_COUNT; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < EDGE_DIST) {
          edges.push({
            i, j, dist,
            threshold: 0.04 + Math.random() * 0.94,   /* aparece quando progress > threshold */
            drawProg : 0,
          });
        }
      }
    }

    function resizeBg() {
      if (!bgCanvas || !bgCtx) return;
      bgDpr = window.devicePixelRatio || 1;
      bgW = window.innerWidth; bgH = window.innerHeight;
      bgCanvas.width  = bgW * bgDpr; bgCanvas.height = bgH * bgDpr;
      bgCanvas.style.width = bgW + 'px'; bgCanvas.style.height = bgH + 'px';
      bgCtx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);
    }
    resizeBg();
    window.addEventListener('resize', resizeBg);

    function drawBg() {
      if (!bgCtx) return;
      bgCtx.clearRect(0, 0, bgW, bgH);

      /* Glow central sutil */
      const grd = bgCtx.createRadialGradient(bgW/2, bgH/2, 0, bgW/2, bgH/2, Math.max(bgW,bgH)*.55);
      grd.addColorStop(0,   'rgba(139,92,246,.055)');
      grd.addColorStop(.6,  'rgba(139,92,246,.012)');
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.fillStyle = grd;
      bgCtx.fillRect(0, 0, bgW, bgH);

      /* Move nós (wrap around) */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x += 1; if (n.x > 1) n.x -= 1;
        if (n.y < 0) n.y += 1; if (n.y > 1) n.y -= 1;
      });

      /* Atualiza drawProg suavemente */
      edges.forEach(e => {
        const target = progress > e.threshold ? 1 : 0;
        e.drawProg = lerp(e.drawProg, target, 0.025);
      });

      /* Desenha arestas */
      edges.forEach(e => {
        if (e.drawProg < 0.01) return;
        const a = nodes[e.i], b = nodes[e.j];
        const ax = a.x * bgW, ay = a.y * bgH;
        const bx = b.x * bgW, by = b.y * bgH;

        /* Ponta da linha animada */
        const ex = ax + (bx - ax) * e.drawProg;
        const ey = ay + (by - ay) * e.drawProg;

        const fade  = 1 - e.dist / EDGE_DIST;
        const alpha = e.drawProg * fade * 0.20;

        const grad = bgCtx.createLinearGradient(ax, ay, ex, ey);
        grad.addColorStop(0, `rgba(200,185,255,${alpha * .55})`);
        grad.addColorStop(1, `rgba(139,92,246,${alpha})`);

        bgCtx.save();
        if (e.drawProg < 0.97) {
          bgCtx.shadowColor = 'rgba(167,139,250,.45)';
          bgCtx.shadowBlur  = 5;
        }
        bgCtx.strokeStyle = grad;
        bgCtx.lineWidth   = 0.7;
        bgCtx.lineCap     = 'round';
        bgCtx.beginPath();
        bgCtx.moveTo(ax, ay);
        bgCtx.lineTo(ex, ey);
        bgCtx.stroke();
        bgCtx.restore();
      });

      /* Desenha nós */
      nodes.forEach(n => {
        const nx = n.x * bgW, ny = n.y * bgH;

        bgCtx.save();
        bgCtx.beginPath();
        bgCtx.arc(nx, ny, n.r + 3, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(139,92,246,${n.a * 0.15})`;
        bgCtx.fill();
        bgCtx.restore();

        bgCtx.save();
        bgCtx.shadowColor = 'rgba(167,139,250,.65)';
        bgCtx.shadowBlur  = 7;
        bgCtx.fillStyle   = `rgba(210,195,255,${n.a})`;
        bgCtx.beginPath();
        bgCtx.arc(nx, ny, n.r, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
      });
    }

    /* ════════════════════════════════════════════════════════════
       LOGO — preenchimento da forma esquerda → direita
       Cor: branca em todo o percurso (sem virar roxa)
    ════════════════════════════════════════════════════════════ */
    const lCtx    = logoCanvas.getContext('2d');
    const logoImg = new Image();
    let logoLoaded = false;
    let lW, lH, lDpr;
    let maskCanvas = null;
    const LOGO_ASPECT = 1293 / 327;

    function resizeLogo() {
      lDpr = window.devicePixelRatio || 1;
      /* Calcula a largura disponível dentro do card */
      const cardEl = wrap.querySelector('.loader-card');
      let availW;
      if (cardEl && cardEl.clientWidth > 0) {
        /* padding: 64px cada lado → subtrai 128px */
        availW = cardEl.clientWidth - 128;
      } else {
        availW = Math.min(window.innerWidth * .80, 372);
      }
      lW = Math.round(Math.max(200, Math.min(availW, 372)));
      lH = Math.round(lW / LOGO_ASPECT);
      logoCanvas.width  = lW * lDpr;
      logoCanvas.height = lH * lDpr;
      logoCanvas.style.width  = lW + 'px';
      logoCanvas.style.height = lH + 'px';
      lCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);
      if (maskCanvas && logoLoaded) buildMask();
    }
    resizeLogo();
    window.addEventListener('resize', resizeLogo);

    function buildMask() {
      maskCanvas = document.createElement('canvas');
      maskCanvas.width  = lW * lDpr;
      maskCanvas.height = lH * lDpr;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);
      mCtx.drawImage(logoImg, 0, 0, lW, lH);
    }

    logoImg.src = 'assets/logo.webp';
    logoImg.onload = () => { logoLoaded = true; buildMask(); };

    function drawLogo(p) {
      lCtx.clearRect(0, 0, lW, lH);
      if (!logoLoaded || !maskCanvas) return;

      /* Fantasma da logo (opacidade muito baixa — pré-preenchimento) */
      lCtx.save();
      lCtx.globalAlpha = 0.07;
      lCtx.drawImage(logoImg, 0, 0, lW, lH);
      lCtx.restore();

      /* Fill animado esquerda → direita — cor BRANCA */
      const fillX = lW * p;
      if (fillX > 0) {
        const tmp  = document.createElement('canvas');
        tmp.width  = lW * lDpr; tmp.height = lH * lDpr;
        const tCtx = tmp.getContext('2d');
        tCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);

        tCtx.drawImage(maskCanvas, 0, 0, lW, lH);      /* máscara da logo */
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = '#ffffff';                     /* puro branco */
        tCtx.fillRect(0, 0, fillX, lH);

        lCtx.save();
        /* glow branco suave atrás do fill */
        lCtx.shadowColor = 'rgba(255,255,255,.18)';
        lCtx.shadowBlur  = 16;
        lCtx.drawImage(tmp, 0, 0, lW, lH);
        lCtx.restore();
      }

      /* Shimmer na fronteira da onda */
      if (p > 0.01 && p < 0.995) {
        const sTmp  = document.createElement('canvas');
        sTmp.width  = lW * lDpr; sTmp.height = lH * lDpr;
        const sCtx  = sTmp.getContext('2d');
        sCtx.setTransform(lDpr, 0, 0, lDpr, 0, 0);
        sCtx.drawImage(maskCanvas, 0, 0, lW, lH);
        sCtx.globalCompositeOperation = 'source-in';
        const shimW = lW * 0.048;
        const shimX = fillX - shimW * .5;
        const shimG = sCtx.createLinearGradient(shimX, 0, shimX + shimW, 0);
        shimG.addColorStop(0,   'rgba(255,255,255,0)');
        shimG.addColorStop(0.5, 'rgba(255,255,255,.9)');
        shimG.addColorStop(1,   'rgba(255,255,255,0)');
        sCtx.fillStyle = shimG;
        sCtx.fillRect(Math.max(0, shimX - shimW * .5), 0, shimW * 2, lH);
        lCtx.save();
        lCtx.shadowColor = 'rgba(255,255,255,.5)';
        lCtx.shadowBlur  = 10;
        lCtx.drawImage(sTmp, 0, 0, lW, lH);
        lCtx.restore();
      }
    }

    /* ── Atualiza percentual ── */
    function updatePct(p) {
      if (pctEl) pctEl.textContent = Math.round(p * 100);
    }

    /* ── Loop principal ── */
    function frame(now) {
      if (dismissed) return;
      calcProgress(now);
      drawBg();
      drawLogo(progress);
      updatePct(progress);
      updatePhrase(progress);

      if (progress >= 1) {
        drawLogo(1); updatePct(1);
        setTimeout(dismissLoader, 520);
        dismissed = true;
        return;
      }
      rafId = requestAnimationFrame(frame);
    }

    /* ── Dismiss: fade-out e remove do DOM ── */
    function dismissLoader() {
      cancelAnimationFrame(rafId);
      document.body.classList.remove('loader-active');
      wrap.classList.add('loader-hidden');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }

    /* Segurança: máximo 7 s */
    setTimeout(() => { if (!dismissed) { dismissed = true; dismissLoader(); } }, 7000);

    rafId = requestAnimationFrame(frame);

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
