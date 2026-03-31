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
