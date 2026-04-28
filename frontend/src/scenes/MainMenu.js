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

        this.menuMusic = this.sound.add('musica_in_game', { loop: true, volume: savedMusicVol });

        const menuDiv = document.createElement('div');
        menuDiv.id = 'main-menu-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center';
        menuDiv.style.zIndex = '1000';

        menuDiv.innerHTML = `
            <div class="text-center" style="margin-top: -80px; width: 100%; max-width: 400px;"> 
                <h1 class="display-1 fw-bold text-white mb-5" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
                    SNAKE CLASH
                </h1>
                
                <div id="pantalla-principal" class="d-flex flex-column gap-3 align-items-center">
                    <button id="btn-local" class="btn text-white fw-bold shadow menu-btn" style="width: 280px; padding: 12px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;">
                        🎮 JUEGO LOCAL
                    </button>
                    
                    <button id="btn-online" class="btn text-white fw-bold shadow menu-btn" style="width: 280px; padding: 12px; background-color: #8F0177; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;">
                        🌐 1 VS 1 ONLINE
                    </button>

                    <button id="btn-opciones" class="btn text-white fw-bold shadow menu-btn" style="width: 280px; padding: 12px; background-color: #1A05A2; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;">
                        ⚙️ OPCIONES
                    </button>
                </div>

                <div id="pantalla-opciones" class="d-none d-flex flex-column gap-4 w-100 px-4 py-4" style="background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(5px);">
                    <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">AJUSTES</h2>
                    
                    <div class="text-start">
                        <label for="music-vol" class="form-label text-white fw-semibold mb-1 small">Música de la partida</label>
                        <input type="range" class="form-range" id="music-vol" min="0" max="1" step="0.05" value="${savedMusicVol}">
                    </div>

                    <div class="text-start">
                        <label for="sfx-vol" class="form-label text-white fw-semibold mb-1 small">Efectos SFX </label>
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
    
                    <button id="btn-volver" class="btn text-white fw-bold shadow mt-3 menu-btn" style="width: 100%; padding: 10px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem;">
                        VOLVER
                    </button>
                </div>
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
            this.scene.start('LocalGame');
        });

        document.getElementById('btn-online').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('OnlineGame');
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
            this.musicTimeout = setTimeout(() => {
                this.menuMusic.pause();
            }, 2000);
        });

        sliderSfx.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            localStorage.setItem('sfxVolume', vol);

            // Sonido de choque como prueba (protección para no saturar si mueven muy rápido)
            if (this.time.now > this.lastSfxTime + 150) {
                this.sound.play('sonido_choque', { volume: vol });
                this.lastSfxTime = this.time.now;
            }
        });

        const buttons = document.querySelectorAll('.menu-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        });

        const musicSelect = document.getElementById('music-select');

        musicSelect.addEventListener('change', (e) => {
            const newKey = e.target.value;
            localStorage.setItem('selectedMusic', newKey);

            // Si la música estaba sonando (porque el usuario movió el slider), la cambiamos
            if (this.menuMusic.isPlaying || this.musicTimeout) {
                this.menuMusic.stop();
                this.menuMusic = this.sound.add(newKey, { loop: true, volume: parseFloat(sliderMusic.value) });
                this.menuMusic.play();

                // Reiniciar el timeout para que no se corte justo al cambiar
                if (this.musicTimeout) clearTimeout(this.musicTimeout);
                this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
            } else {
                // Si estaba en silencio, solo preparamos la nueva instancia
                this.menuMusic = this.sound.add(newKey, { loop: true, volume: parseFloat(sliderMusic.value) });
            }
        });
    }
}
