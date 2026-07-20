// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================
let stations = [];
let filteredStations = [];
let favorites = [];
let currentStation = null;
let currentIndex = -1;
let isPlaying = false;
let isMuted = false;
let previousVolume = 0.8;

// ==========================================================================
// ELEMENTOS DEL DOM - LISTA / BÚSQUEDA
// ==========================================================================
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const favoritesSection = document.getElementById('favorites-section');
const favoritesContainer = document.getElementById('favorites-container');
const estacionesContainer = document.getElementById('estaciones-container');
const statusMessage = document.getElementById('status-message');

// ==========================================================================
// ELEMENTOS DEL DOM - MINI PLAYER
// ==========================================================================
const miniPlayer = document.getElementById('mini-player');
const miniPlayerInfo = document.getElementById('mini-player-info');
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniPlayIcon = document.getElementById('mini-play-icon');
const miniPauseIcon = document.getElementById('mini-pause-icon');
const miniPlayerBuffering = document.getElementById('mini-player-buffering');
const miniPlayingTitle = document.getElementById('mini-playing-title');
const miniPlayingSubtitle = document.getElementById('mini-playing-subtitle');
const miniWaveVisualizer = document.getElementById('mini-wave-visualizer');

// ==========================================================================
// ELEMENTOS DEL DOM - REPRODUCTOR COMPLETO
// ==========================================================================
const listView = document.getElementById('list-view');
const fullPlayer = document.getElementById('full-player');
const backToListBtn = document.getElementById('back-to-list-btn');

const fullPlayBtn = document.getElementById('full-play-btn');
const fullPlayIcon = document.getElementById('full-play-icon');
const fullPauseIcon = document.getElementById('full-pause-icon');
const fullPlayerBuffering = document.getElementById('full-player-buffering');

const prevStationBtn = document.getElementById('prev-station-btn');
const nextStationBtn = document.getElementById('next-station-btn');

const fullPlayingTitle = document.getElementById('full-playing-title');
const fullPlayingSubtitle = document.getElementById('full-playing-subtitle');
const fullPlayingState = document.getElementById('full-playing-state');
const largeAvatarLetter = document.getElementById('large-avatar-letter');
const largeAvatar = document.getElementById('large-avatar');
const pulseRing1 = document.getElementById('pulse-ring-1');
const pulseRing2 = document.getElementById('pulse-ring-2');
const largeWaveViz = document.querySelector('.large-wave-visualizer');

const fullVolumeSlider = document.getElementById('full-volume-slider');
const fullVolumePercent = document.getElementById('full-volume-percent');
const fullVolumeMuteBtn = document.getElementById('full-volume-mute-btn');
const fullVolHighIcon = document.getElementById('full-vol-high-icon');
const fullVolMuteIcon = document.getElementById('full-vol-mute-icon');

// ==========================================================================
// AUDIO NATIVO
// ==========================================================================
const audioPlayer = document.getElementById('native-audio');

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
function init() {
    loadFavorites();
    setupEventListeners();
    cargarRadiosLaPaz();
}

// ==========================================================================
// FAVORITOS
// ==========================================================================
function loadFavorites() {
    try {
        const saved = localStorage.getItem('radio_lapaz_favorites');
        favorites = saved ? JSON.parse(saved) : [];
    } catch (e) {
        favorites = [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('radio_lapaz_favorites', JSON.stringify(favorites));
    } catch (e) {}
}

function toggleFavorite(id) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    renderListas();
}

// ==========================================================================
// EVENTOS
// ==========================================================================
function setupEventListeners() {
    // --- Búsqueda ---
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        clearSearchBtn.classList.toggle('hidden', q.length === 0);
        filtrarEstaciones(q);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        filtrarEstaciones('');
        searchInput.focus();
    });

    // --- Mini Player ---
    miniPlayerInfo.addEventListener('click', abrirReproductorCompleto);
    miniPlayBtn.addEventListener('click', togglePlay);

    // --- Reproductor Completo ---
    backToListBtn.addEventListener('click', cerrarReproductorCompleto);
    fullPlayBtn.addEventListener('click', togglePlay);
    prevStationBtn.addEventListener('click', reproducirAnterior);
    nextStationBtn.addEventListener('click', reproducirSiguiente);

    // --- Volumen (Reproductor Completo) ---
    fullVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioPlayer.volume = val;
        fullVolumePercent.textContent = Math.round(val * 100) + '%';
        if (val === 0) {
            setMuteState(true);
        } else {
            setMuteState(false);
            previousVolume = val;
        }
    });

    fullVolumeMuteBtn.addEventListener('click', () => {
        if (isMuted) {
            audioPlayer.volume = previousVolume;
            fullVolumeSlider.value = previousVolume;
            fullVolumePercent.textContent = Math.round(previousVolume * 100) + '%';
            setMuteState(false);
        } else {
            previousVolume = parseFloat(fullVolumeSlider.value) || 0.8;
            audioPlayer.volume = 0;
            fullVolumeSlider.value = 0;
            fullVolumePercent.textContent = '0%';
            setMuteState(true);
        }
    });

    // --- Eventos del elemento <audio> ---
    audioPlayer.addEventListener('waiting', () => {
        setBufferingUI(true);
    });

    audioPlayer.addEventListener('playing', () => {
        setBufferingUI(false);
        setPlayingUI(true);
    });

    audioPlayer.addEventListener('pause', () => {
        setBufferingUI(false);
        setPlayingUI(false);
    });

    audioPlayer.addEventListener('error', () => {
        setBufferingUI(false);
        setPlayingUI(false);
        showPlayerError();
    });

    // Cerrar reproductor completo con el botón "Atrás" del hardware Android
    document.addEventListener('backbutton', () => {
        if (!fullPlayer.classList.contains('translate-y-full')) {
            cerrarReproductorCompleto();
        }
    });
}

// ==========================================================================
// NAVEGACIÓN DE VISTAS
// ==========================================================================
function abrirReproductorCompleto() {
    fullPlayer.classList.remove('translate-y-full');
    document.body.style.overflow = 'hidden';
}

function cerrarReproductorCompleto() {
    fullPlayer.classList.add('translate-y-full');
    document.body.style.overflow = '';
}

// ==========================================================================
// CARGA DE RADIOS DESDE LA API
// ==========================================================================
async function cargarRadiosLaPaz() {
    try {
        const respuesta = await fetch('https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/BO');
        const radios = await respuesta.json();

        // Filtrar por La Paz (en estado o nombre)
        stations = radios.filter(r => {
            const estado = (r.state || '').toLowerCase();
            const nombre = (r.name || '').toLowerCase();
            return estado.includes('paz') || nombre.includes('paz');
        });

        // Ordenar alfabéticamente
        stations.sort((a, b) =>
            (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
        );

        filteredStations = [...stations];
        statusMessage.classList.add('hidden');
        renderListas();

    } catch (error) {
        console.error('Error al conectar con la API:', error);
        statusMessage.innerHTML = `
            <svg class="mx-auto mb-2" style="color:var(--danger)" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p style="color:var(--danger)" class="font-semibold">Error de conexión</p>
            <p class="text-xs mt-1">No se pudieron cargar las emisoras.</p>
        `;
    }
}

// ==========================================================================
// FILTRADO DE BÚSQUEDA
// ==========================================================================
function filtrarEstaciones(query) {
    const q = query.toLowerCase().trim();
    filteredStations = q
        ? stations.filter(r =>
            (r.name || '').toLowerCase().includes(q) ||
            (r.state || '').toLowerCase().includes(q) ||
            (r.tags || '').toLowerCase().includes(q)
          )
        : [...stations];
    renderListas();
}

// ==========================================================================
// RENDER DE LISTAS
// ==========================================================================
function renderListas() {
    // Favoritos (ocultar si hay búsqueda activa)
    const favStations = stations.filter(r => favorites.includes(r.changeuuid));
    const hayBusqueda = searchInput.value.trim().length > 0;

    if (favStations.length === 0 || hayBusqueda) {
        favoritesSection.classList.add('hidden');
    } else {
        favoritesSection.classList.remove('hidden');
        favoritesContainer.innerHTML = '';
        favStations.forEach(r => favoritesContainer.appendChild(crearTarjetaEstacion(r)));
    }

    // Todas las estaciones
    estacionesContainer.innerHTML = '';

    if (filteredStations.length === 0) {
        estacionesContainer.innerHTML = `
            <div class="card p-6 text-center text-secondary text-sm">
                No se encontraron emisoras para "<strong>${searchInput.value}</strong>".
            </div>`;
        return;
    }

    filteredStations.forEach(r => estacionesContainer.appendChild(crearTarjetaEstacion(r)));
}

// ==========================================================================
// CREAR TARJETA DE ESTACIÓN
// ==========================================================================
function crearTarjetaEstacion(radio) {
    const card = document.createElement('div');
    const esActiva = currentStation && currentStation.changeuuid === radio.changeuuid;
    const esFav = favorites.includes(radio.changeuuid);
    const inicial = (radio.name || '?').charAt(0).toUpperCase();

    card.className = `station-card card ${esActiva ? 'active' : ''}`;
    card.dataset.id = radio.changeuuid;

    card.innerHTML = `
        <div class="station-info">
            <div class="station-avatar">${inicial}</div>
            <div class="station-details">
                <div class="station-name">${radio.name || 'Emisora sin nombre'}</div>
                <div class="station-state">${radio.state || 'Bolivia'}</div>
            </div>
        </div>
        <div class="station-actions">
            <button class="fav-btn ${esFav ? 'active' : ''}" aria-label="Favorito">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${esFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
            <div class="mini-play-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
        </div>
    `;

    // Click en la tarjeta → reproducir y abrir reproductor grande
    card.addEventListener('click', (e) => {
        if (e.target.closest('.fav-btn')) return;
        seleccionarRadio(radio);
        abrirReproductorCompleto();
    });

    // Click en estrella → solo marcar favorito
    card.querySelector('.fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(radio.changeuuid);
    });

    return card;
}

// ==========================================================================
// CONTROL DE REPRODUCCIÓN
// ==========================================================================
function seleccionarRadio(radio) {
    // Si es la misma radio activa, solo abrir reproductor
    if (currentStation && currentStation.changeuuid === radio.changeuuid) {
        return;
    }

    currentStation = radio;
    currentIndex = filteredStations.findIndex(r => r.changeuuid === radio.changeuuid);
    if (currentIndex === -1) currentIndex = stations.findIndex(r => r.changeuuid === radio.changeuuid);

    // Actualizar UI de metadatos
    actualizarMetadatosUI(radio);

    // Cargar y reproducir
    const url = radio.url_resolved || radio.url;
    audioPlayer.src = url;
    audioPlayer.volume = parseFloat(fullVolumeSlider.value);
    audioPlayer.load();
    audioPlayer.play().catch(e => {
        console.error('Error reproduciendo:', e);
        showPlayerError();
    });

    // Mostrar mini player
    miniPlayer.classList.remove('hidden');

    // Actualizar tarjetas activas
    actualizarTarjetasActivas(radio.changeuuid);
}

function actualizarMetadatosUI(radio) {
    const nombre = radio.name || 'Emisora sin nombre';
    const estado = radio.state || 'Bolivia';
    const inicial = nombre.charAt(0).toUpperCase();

    // Mini player
    miniPlayingTitle.textContent = nombre;
    miniPlayingSubtitle.textContent = estado;

    // Reproductor completo
    fullPlayingTitle.textContent = nombre;
    fullPlayingState.textContent = estado;
    largeAvatarLetter.textContent = inicial;
}

function actualizarTarjetasActivas(id) {
    document.querySelectorAll('.station-card').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
    });
}

function togglePlay() {
    if (!currentStation) return;

    if (audioPlayer.paused) {
        audioPlayer.play().catch(showPlayerError);
    } else {
        audioPlayer.pause();
    }
}

function reproducirSiguiente() {
    if (filteredStations.length === 0) return;
    const siguiente = (currentIndex + 1) % filteredStations.length;
    currentIndex = siguiente;
    seleccionarRadio(filteredStations[siguiente]);
}

function reproducirAnterior() {
    if (filteredStations.length === 0) return;
    const anterior = (currentIndex - 1 + filteredStations.length) % filteredStations.length;
    currentIndex = anterior;
    seleccionarRadio(filteredStations[anterior]);
}

// ==========================================================================
// ACTUALIZACIÓN DE UI DE REPRODUCCIÓN
// ==========================================================================
function setBufferingUI(isBuffering) {
    if (isBuffering) {
        // Mini player
        miniPlayIcon.classList.add('hidden');
        miniPauseIcon.classList.add('hidden');
        miniPlayerBuffering.classList.remove('hidden');

        // Reproductor completo
        fullPlayIcon.classList.add('hidden');
        fullPauseIcon.classList.add('hidden');
        fullPlayerBuffering.classList.remove('hidden');
    } else {
        miniPlayerBuffering.classList.add('hidden');
        fullPlayerBuffering.classList.add('hidden');
    }
}

function setPlayingUI(playing) {
    isPlaying = playing;

    // Mini player
    miniPlayIcon.classList.toggle('hidden', playing);
    miniPauseIcon.classList.toggle('hidden', !playing);

    // Reproductor completo
    fullPlayIcon.classList.toggle('hidden', playing);
    fullPauseIcon.classList.toggle('hidden', !playing);

    // Visualizadores y animaciones
    const miniMusicIcon = document.querySelector('.mini-music-icon');

    if (playing) {
        // Mostrar olas
        if (miniMusicIcon) miniMusicIcon.classList.add('hidden');
        miniWaveVisualizer.classList.remove('hidden');
        largeWaveViz.classList.add('playing');
        largeAvatar.classList.add('rotating');
        pulseRing1.classList.remove('hidden');
        pulseRing2.classList.remove('hidden');
    } else {
        if (miniMusicIcon) miniMusicIcon.classList.remove('hidden');
        miniWaveVisualizer.classList.add('hidden');
        largeWaveViz.classList.remove('playing');
        largeAvatar.classList.remove('rotating');
        pulseRing1.classList.add('hidden');
        pulseRing2.classList.add('hidden');
    }
}

function setMuteState(muted) {
    isMuted = muted;
    fullVolHighIcon.classList.toggle('hidden', muted);
    fullVolMuteIcon.classList.toggle('hidden', !muted);
}

function showPlayerError() {
    fullPlayingState.textContent = '⚠ Transmisión no disponible';
    setTimeout(() => {
        if (currentStation) {
            fullPlayingState.textContent = currentStation.state || 'Bolivia';
        }
    }, 4000);
}

// ==========================================================================
// ARRANCAR LA APP
// ==========================================================================
document.addEventListener('DOMContentLoaded', init);
