import re

filepath = '/Users/lucasmoitinho/Downloads/ANTIGRVAITY/esquina-digital 2.html'

with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace style block
style_pattern = re.compile(r'<style>.*?</style>', re.DOTALL)
html = style_pattern.sub('<link rel="stylesheet" href="style.css">', html)

# 2. Replace script block at the end
# The script block is very large. We can just replace <script>...</script>
script_pattern = re.compile(r'<script>(?!.*<script>).*?</script>', re.DOTALL)
html = script_pattern.sub('<script src="main.js" defer></script>', html)

# 3. Replace Logo base64
base64_logo_pattern = re.compile(r'<img src="data:image/png;base64,[^"]+" alt="Esquina Digital">')
html = base64_logo_pattern.sub('<img src="assets/logo.png" alt="Esquina Digital">', html)

# 4. Replace Leader Photo base64
base64_leader_pattern = re.compile(r'<img src="data:image/png;base64,[^"]+" alt="Isabella Silva">')
html = base64_leader_pattern.sub('<img src="assets/leader-photo.png" alt="Isabella Silva" loading="lazy">', html)

# 5. Add loading="lazy" to client logos
html = html.replace('alt="Acme Corp">', 'alt="Acme Corp" loading="lazy">')
html = html.replace('alt="GlobalTech">', 'alt="GlobalTech" loading="lazy">')
html = html.replace('alt="InnovateX">', 'alt="InnovateX" loading="lazy">')
html = html.replace('alt="Nexus">', 'alt="Nexus" loading="lazy">')
html = html.replace('alt="Quantum">', 'alt="Quantum" loading="lazy">')

# 6. Add semantics to header / main
# Wrap from <section class="hero hero-scene" id="home"> to the end of #contact with <main>...</main>
# We can do this by replacing <section class="hero" with <main>\n<section class="hero"
# And then right before <footer> add </main>
html = html.replace('<section class="hero', '<main>\n    <section class="hero')
html = html.replace('<footer>', '</main>\n    <footer>')

# 7. Accessibility - Add aria-labels to buttons
html = html.replace('class="hero-video-play"', 'class="hero-video-play" aria-label="Reproduzir vídeo da Hero"')
html = html.replace('class="process-video-play"', 'class="process-video-play" aria-label="Reproduzir vídeo de processo"')
html = html.replace('class="ctrl-btn ctrl-prev"', 'class="ctrl-btn ctrl-prev" aria-label="Membro anterior"')
html = html.replace('class="ctrl-btn ctrl-next"', 'class="ctrl-btn ctrl-next" aria-label="Próximo membro"')

# aria label for dots
for i in range(1, 4): # Actually, it's 3 dots
    html = html.replace(f'<button class="c-dot"></button>', f'<button class="c-dot" aria-label="Ir para a página {i}"></button>', 1)
# Add Active to the first one just in case
html = html.replace('class="c-dot active"', 'class="c-dot active" aria-label="Ir para a página atual"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)

print("Refactoring done.")
