import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
    const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');
        
        // Función para calcular la escala perfecta sin importar el tamaño del monitor
        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2); // Mantener en el centro
            const escalaX = width / fondo.width;
            const escalaY = height / fondo.height;
            fondo.setScale(Math.max(escalaX, escalaY)); // Cubrir toda la pantalla sin deformar
        };

        // Lo ajustamos al arrancar la escena
        ajustarFondo(this.scale.width, this.scale.height);

        // Si el jugador redimensiona la ventana del navegador, recalculamos el fondo
        this.scale.on('resize', (gameSize) => {
            ajustarFondo(gameSize.width, gameSize.height);
        });

        // 2. EL MENÚ EN HTML (Minimalista, transparente y usando Bootstrap)
        const menuDiv = document.createElement('div');
        menuDiv.id = 'main-menu-overlay';
        
        // Clases de Bootstrap para ocupar toda la pantalla y centrar el contenido
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center';
        menuDiv.style.zIndex = '1000';

        // Inyectamos un HTML mucho más limpio. Sin cajas de fondo.
        menuDiv.innerHTML = `
            <div class="text-center" style="margin-top: -80px;"> <h1 class="display-1 fw-bold text-white mb-5" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
                    SNAKE CLASH
                </h1>
                
                <div class="d-flex flex-column gap-3 align-items-center">
                    
                    <button id="btn-local" class="btn text-white fw-bold shadow" style="width: 280px; padding: 12px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;">
                        🎮 JUEGO LOCAL
                    </button>
                    
                    <button id="btn-online" class="btn text-white fw-bold shadow" style="width: 280px; padding: 12px; background-color: #8F0177; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;">
                        🌐 1 VS 1 ONLINE
                    </button>

                    <button id="btn-opciones" class="btn text-white fw-bold shadow" style="width: 280px; padding: 12px; background-color: #1A05A2; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;">
                        ⚙️ OPCIONES
                    </button>
                </div>
            </div>
        `;

        document.getElementById('game-container').appendChild(menuDiv);

        // 3. EVENTOS Y LIMPIEZA
        const clearMenu = () => {
            if (document.getElementById('game-container').contains(menuDiv)) {
                document.getElementById('game-container').removeChild(menuDiv);
            }
        };

        // Lógica de navegación
        document.getElementById('btn-local').addEventListener('click', () => {
            clearMenu();
            this.scene.start('LocalGame');
        });

        document.getElementById('btn-online').addEventListener('click', () => {
            clearMenu();
            this.scene.start('OnlineGame');
        });

        document.getElementById('btn-opciones').addEventListener('click', () => {
            console.log("Configuración abierta");
        });

        // Efecto visual: Que los botones aumenten de tamaño al pasar el ratón (Hover)
        const buttons = ['btn-local', 'btn-online', 'btn-opciones'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.08)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        });
    }
}
