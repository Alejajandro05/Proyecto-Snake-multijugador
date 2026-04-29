import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
        this.musicTimeout = null;
        this.lastSfxTime = 0;
    }

    create() {
        const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');

        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2);
            const escalaX = width / fondo.width;
            const escalaY = height / fondo.height;
            fondo.setScale(Math.max(escalaX, escalaY));
        };

        ajustarFondo(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

        const savedMusicVol = localStorage.getItem('musicVolume') !== null ? parseFloat(localStorage.getItem('musicVolume')) : 0.2;
        const savedSfxVol = localStorage.getItem('sfxVolume') !== null ? parseFloat(localStorage.getItem('sfxVolume')) : 0.7;
        const savedMusicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';

        this.menuMusic = this.sound.add(savedMusicKey, { loop: true, volume: savedMusicVol });

        const menuDiv = document.createElement('div');
        menuDiv.id = 'main-menu-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100';
        menuDiv.style.zIndex = '1000';
        menuDiv.style.overflow = 'hidden';

        // DISEÑO ABSOLUTO: El centro es el centro, la derecha es la derecha.
        menuDiv.innerHTML = `
            <div id="pantalla-principal" class="w-100 h-100 position-relative">
                
                <div class="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center" style="margin-top: -50px; width: 100%; max-width: 400px;">
                    <h1 class="display-1 fw-bold text-white mb-5 text-center" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
                        SNAKE CLASH
                    </h1>
                    
                    <div class="d-flex flex-column gap-3 w-100 align-items-center">
                        <button id="btn-local" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 14px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: all 0.2s ease; max-width: 280px;">
                            🎮 JUEGO LOCAL
                        </button>
                        
                        <button id="btn-online" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 14px; background-color: #8F0177; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: all 0.2s ease; max-width: 280px;">
                            🌐 1 VS 1 ONLINE
                        </button>

                        <button id="btn-opciones" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 14px; background-color: #1A05A2; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: all 0.2s ease; max-width: 280px;">
                            ⚙️ OPCIONES
                        </button>
                    </div>
                </div>

                <div class="position-absolute top-50 end-0 translate-middle-y me-4 me-xl-5 d-none d-lg-block" style="width: 320px; margin-top: -20px;">
                    <h3 class="text-white fw-bold mb-3" style="font-family: 'Montserrat', sans-serif; border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: 10px;">
                        Modos Arcade
                    </h3>
                    
                    <div id="btn-time-attack" class="card shadow-lg bg-transparent arcade-card" style="border: 3px solid #F67D31; border-radius: 16px; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; overflow: hidden;">
                        <div style="height: 180px; background-color: #0B081A; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                            
                            <img src="assets/time_attack.jpg" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: opacity 0.3s ease;" class="arcade-img">
                            
                            <div class="position-absolute bottom-0 start-0 w-100" style="height: 50%; background: linear-gradient(to top, rgba(12,18,42,1), transparent);"></div>
                        </div>
                        <div class="card-body p-3" style="background: rgba(12, 18, 42, 0.98);">
                            <h5 class="card-title fw-bold text-white mb-2" style="font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                                <span style="color: #F67D31;">⏱️</span> Contrarreloj
                            </h5>
                            <p class="card-text text-light mb-0" style="opacity: 0.85; line-height: 1.3; font-size: 0.85rem;">
                                1 minuto, vidas infinitas y Muerte súbita en empate.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            <div id="pantalla-opciones" class="d-none position-absolute top-50 start-50 translate-middle d-flex flex-column gap-4 px-4 py-4" style="width: 100%; max-width: 500px; background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(34, 211, 238, 0.4); border-radius: 16px; backdrop-filter: blur(10px); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">AJUSTES</h2>
                
                <div class="text-start">
                    <label for="music-vol" class="form-label text-white fw-semibold mb-1 small">Música de la partida</label>
                    <input type="range" class="form-range" id="music-vol" min="0" max="1" step="0.05" value="${savedMusicVol}">
                </div>

                <div class="text-start">
                    <label for="sfx-vol" class="form-label text-white fw-semibold mb-1 small">Efectos SFX</label>
                    <input type="range" class="form-range" id="sfx-vol" min="0" max="1" step="0.05" value="${savedSfxVol}">
                </div>

                <div class="text-start mb-3">
                    <label for="music-select" class="form-label text-white fw-semibold mb-1 small">Elegir Pista</label>
                    <select class="form-select form-select-sm bg-dark text-white border-secondary" id="music-select">
                        <option value="musica_in_game" ${savedMusicKey === 'musica_in_game' ? 'selected' : ''}>Música 1</option>
                        <option value="musica2" ${savedMusicKey === 'musica2' ? 'selected' : ''}>Música 2</option>
                        <option value="musica3" ${savedMusicKey === 'musica3' ? 'selected' : ''}>Música 3</option>
                    </select>
                </div>

                <button id="btn-volver" class="btn text-white fw-bold shadow mt-3 menu-btn" style="width: 100%; padding: 12px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem;">
                    VOLVER
                </button>
            </div>
        `;

        document.getElementById('game-container').appendChild(menuDiv);

        const pantallaPrincipal = document.getElementById('pantalla-principal');
        const pantallaOpciones = document.getElementById('pantalla-opciones');

        const clearMenu = () => {
            if (document.getElementById('game-container').contains(menuDiv)) {
                document.getElementById('game-container').removeChild(menuDiv);
            }
        };

        const detenerAudioPrueba = () => {
            if (this.menuMusic) this.menuMusic.stop();
            if (this.musicTimeout) clearTimeout(this.musicTimeout);
        };

        document.getElementById('btn-local').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('LocalGameSetup');
        });

        document.getElementById('btn-online').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('OnlineGame');
        });

        document.getElementById('btn-time-attack').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('TimeAttackGame');
        });

        document.getElementById('btn-opciones').addEventListener('click', () => {
            pantallaPrincipal.classList.add('d-none');
            pantallaOpciones.classList.remove('d-none');
        });

        document.getElementById('btn-volver').addEventListener('click', () => {
            detenerAudioPrueba();
            pantallaOpciones.classList.add('d-none');
            pantallaPrincipal.classList.remove('d-none');
        });

        const sliderMusic = document.getElementById('music-vol');
        const sliderSfx = document.getElementById('sfx-vol');

        sliderMusic.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            localStorage.setItem('musicVolume', vol);
            this.menuMusic.setVolume(vol);
            if (!this.menuMusic.isPlaying) this.menuMusic.play();
            if (this.musicTimeout) clearTimeout(this.musicTimeout);
            this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
        });

        sliderSfx.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            localStorage.setItem('sfxVolume', vol);
            if (this.time.now > this.lastSfxTime + 150) {
                this.sound.play('sonido_choque', { volume: vol });
                this.lastSfxTime = this.time.now;
            }
        });

        const elementsToHover = document.querySelectorAll('.menu-btn, .arcade-card');
        elementsToHover.forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.05)';
                if (el.classList.contains('arcade-card')) {
                    el.style.boxShadow = '0 0 30px rgba(246, 125, 49, 0.4) !important';
                    el.querySelector('.arcade-img').style.opacity = '1';
                }
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
                if (el.classList.contains('arcade-card')) {
                    el.style.boxShadow = 'var(--bs-box-shadow-lg) !important';
                    el.querySelector('.arcade-img').style.opacity = '0.85';
                }
            });
        });

        const musicSelect = document.getElementById('music-select');
        musicSelect.addEventListener('change', (e) => {
            const newKey = e.target.value;
            localStorage.setItem('selectedMusic', newKey);
            if (this.menuMusic.isPlaying || this.musicTimeout) {
                this.menuMusic.stop();
                this.menuMusic = this.sound.add(newKey, { loop: true, volume: parseFloat(sliderMusic.value) });
                this.menuMusic.play();
                if (this.musicTimeout) clearTimeout(this.musicTimeout);
                this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
            } else {
                this.menuMusic = this.sound.add(newKey, { loop: true, volume: parseFloat(sliderMusic.value) });
            }
        });
    }
}