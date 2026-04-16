/* ============================================================
   PAGE LOADER — Órbita de Círculos + Conexão dos Pontos
   ============================================================ */
(function initLoader() {
  /* Aguarda o body estar disponível caso o script rode no <head> */
  function run() {
    const loaderWrap  = document.getElementById('page-loader');
    const canvas      = document.getElementById('loaderCanvas');
    const tagline     = document.getElementById('loaderTagline');
    if (!loaderWrap || !canvas) return;
    startLoader(loaderWrap, canvas, tagline);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  function startLoader(loaderWrap, canvas, tagline) {

  /* -- Bloqueia scroll durante loading -- */
  document.body.classList.add('loader-active');

  const ctx = canvas.getContext('2d');

  /* ---------- Paleta (espelha o :root do CSS) ---------- */
  const C = {
    orange : '#F97316',
    violet : '#8B5CF6',
    pink   : '#EC4899',
    teal   : '#4ECDC4',
    amber  : '#F59E0B',
    white  : '#ffffff',
    black  : '#0a0a0a',
  };

  /* ---------- Configuração do canvas ---------- */
  const BASE = 340;           // largura de referência (px)
  let W, H, dpr, cx, cy;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const size = Math.min(window.innerWidth * .88, BASE);
    W = size; H = size * .52;    // proporção elíptica / perspectiva
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    cx = W / 2;
    cy = H / 2;
  }
  resize();
  window.addEventListener('resize', () => { ctx.setTransform(1,0,0,1,0,0); resize(); });

  /* ---------- Definição dos círculos ---------- */
  // Órbita elíptica: a = semi-eixo X, b = semi-eixo Y (perspectiva)
  const ORBIT_A = W * .42;   // raio horizontal
  const ORBIT_B = H * .38;   // raio vertical (perspectiva ~30°)
  const N = 5;                // número de pontos
  const COLORS = [C.orange, C.violet, C.pink, C.teal, C.amber];
  const DOT_R  = 7;           // raio de cada círculo

  /* Fase 1 — ÓRBITA: círculos giram em formação, distribuídos na elipse */
  const BASE_SPEED = 0.012;   // rad/frame

  const dots = Array.from({ length: N }, (_, i) => ({
    angle : (i / N) * Math.PI * 2,   // ângulo inicial uniforme
    color : COLORS[i],
    x: 0, y: 0,                       // posição calculada frame a frame
    // posição "destino" para a fase de conexão (calculado depois)
    tx: 0, ty: 0,
  }));

  /* ---------- Máquina de estados ---------- */
  // PHASE: 'orbit' → 'converge' → 'connect' → 'done'
  let phase        = 'orbit';
  let phaseTimer   = 0;       // frames desde início da fase

  // Duração de cada fase (em frames a 60 fps)
  const DUR_ORBIT    = 90;    // ~1.5s de órbita pura
  const DUR_CONVERGE = 55;    // ~0.9s de desaceleração + parada
  const DUR_CONNECT  = 60;    // ~1.0s desenhando as linhas
  const DUR_HOLD     = 30;    // ~0.5s parado após conexão

  /* Posições finais (em polígono regular centralizado) para a conexão */
  const POLY_R = Math.min(W, H) * .28;
  const polyAngleOffset = -Math.PI / 2;
  dots.forEach((d, i) => {
    d.tx = cx + POLY_R * Math.cos(polyAngleOffset + (i / N) * Math.PI * 2);
    d.ty = cy + POLY_R * Math.sin(polyAngleOffset + (i / N) * Math.PI * 2);
  });

  /* Progresso de conexão de cada aresta (0→1) */
  const EDGES = [];
  for (let i = 0; i < N; i++) EDGES.push({ from: i, to: (i + 1) % N, prog: 0 });

  /* Easing helpers */
  const easeOut  = t => 1 - Math.pow(1 - t, 3);
  const easeInOut= t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

  /* Posição na elipse */
  function orbitPos(angle) {
    return {
      x: cx + ORBIT_A * Math.cos(angle),
      y: cy + ORBIT_B * Math.sin(angle),
    };
  }

  /* ---------- Loop principal ---------- */
  let rafHandle;
  let startTime = null;

  function frame(ts) {
    if (!startTime) startTime = ts;

    ctx.clearRect(0, 0, W, H);

    phaseTimer++;

    /* ---- PHASE: orbit ---- */
    if (phase === 'orbit') {
      dots.forEach(d => {
        d.angle += BASE_SPEED;
        const p = orbitPos(d.angle);
        d.x = p.x; d.y = p.y;
      });

      drawOrbitGuide();
      drawDots();

      if (phaseTimer >= DUR_ORBIT) {
        phase = 'converge';
        phaseTimer = 0;
        /* congela o ângulo de cada dot e captura posição de entrada */
        dots.forEach(d => {
          d.snapX = d.x;
          d.snapY = d.y;
        });
      }
    }

    /* ---- PHASE: converge ---- */
    else if (phase === 'converge') {
      const t = easeOut(phaseTimer / DUR_CONVERGE);
      dots.forEach(d => {
        /* interpolação da posição snap → destino final (polígono) */
        d.x = d.snapX + (d.tx - d.snapX) * t;
        d.y = d.snapY + (d.ty - d.snapY) * t;
      });

      /* Mostra o guia de órbita sumindo gradualmente */
      drawOrbitGuide(1 - t);
      drawDots();

      if (phaseTimer >= DUR_CONVERGE) {
        /* Garante snap exato */
        dots.forEach(d => { d.x = d.tx; d.y = d.ty; });
        phase = 'connect';
        phaseTimer = 0;
        /* Exibe a tagline */
        if (tagline) tagline.classList.add('visible');
      }
    }

    /* ---- PHASE: connect ---- */
    else if (phase === 'connect') {
      /* Avança o progresso de cada aresta em cascata */
      const totalEdgeFrames = DUR_CONNECT;
      const perEdge = totalEdgeFrames / N;
      EDGES.forEach((e, idx) => {
        const edgeStart = idx * (perEdge * 0.55);   // ligeiro overlap
        const local = Math.max(0, phaseTimer - edgeStart) / perEdge;
        e.prog = Math.min(1, easeInOut(local));
      });

      drawConnectionLines();
      drawDots();

      if (phaseTimer >= DUR_CONNECT) {
        phase = 'hold';
        phaseTimer = 0;
      }
    }

    /* ---- PHASE: hold ---- */
    else if (phase === 'hold') {
      drawConnectionLines(true);
      drawDots();

      if (phaseTimer >= DUR_HOLD) {
        phase = 'done';
        dismissLoader();
        return; // para o loop
      }
    }

    rafHandle = requestAnimationFrame(frame);
  }

  /* ---------- Funções de desenho ---------- */

  function drawOrbitGuide(alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.055 * alpha})`;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, ORBIT_A, ORBIT_B, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawDots() {
    dots.forEach((d, i) => {
      /* Sombra suave */
      ctx.save();
      ctx.shadowColor  = d.color;
      ctx.shadowBlur   = 14;

      /* Círculo preenchido */
      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();

      /* Halo externo */
      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R + 3, 0, Math.PI * 2);
      ctx.strokeStyle = `${d.color}55`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    });
  }

  function drawConnectionLines(full = false) {
    EDGES.forEach((e, idx) => {
      const a = dots[e.from];
      const b = dots[e.to];
      const prog = full ? 1 : e.prog;
      if (prog <= 0) return;

      /* Ponto final parcial */
      const ex = a.x + (b.x - a.x) * prog;
      const ey = a.y + (b.y - a.y) * prog;

      /* Gradiente de cor entre os dois dots */
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, a.color);
      grad.addColorStop(1, b.color);

      ctx.save();
      ctx.shadowColor = a.color;
      ctx.shadowBlur  = 8;
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.8;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    });
  }

  /* ---------- Dismiss ---------- */
  function dismissLoader() {
    cancelAnimationFrame(rafHandle);
    document.body.classList.remove('loader-active');
    loaderWrap.classList.add('loader-hidden');
    /* Remove do DOM após a transição para não pesar no acessório */
    loaderWrap.addEventListener('transitionend', () => {
      loaderWrap.remove();
    }, { once: true });
  }

  /* Garante que o loader nunca bloqueie por mais de 5 s (fallback) */
  const MAX_WAIT = 5000;
  const fallbackTimer = setTimeout(() => {
    if (phase !== 'done') {
      phase = 'done';
      cancelAnimationFrame(rafHandle);
      dismissLoader();
    }
  }, MAX_WAIT);

  /* Inicia o loop quando a janela estiver pronta */
  requestAnimationFrame(frame);

  /* Quando o site terminar de carregar, avança para a fase de conexão se
     ainda estiver em órbita (assim o loader tem duração mínima de órbita
     mas não espera indefinidamente) */
  window.addEventListener('load', () => {
    clearTimeout(fallbackTimer);
    /* Deixa pelo menos DUR_ORBIT frames de órbita antes de convergir */
    if (phase === 'orbit' && phaseTimer < DUR_ORBIT) {
      /* Aguarda o restante dos frames e deixa o loop continuar normalmente */
    } else if (phase === 'orbit') {
      /* Já passou a duração mínima — avança imediatamente */
      phaseTimer = DUR_ORBIT;
    }
    /* Se já está em fases posteriores, não faz nada — termina naturalmente */
  });

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
