// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================
let stations = [];
let filteredStations = [];
let currentStation = null;
let currentIndex = -1;
let isPlaying = false;
let isMuted = false;
let previousVolume = 0.8;

// Favoritos y Filtros
let favorites = [];
let showFavoritesOnly = false;

// Paginación
let currentPage = 1;
const itemsPerPage = 10;

// ==========================================================================
// ELEMENTOS DEL DOM
// ==========================================================================
const listView = document.getElementById('list-view');
const fullPlayerView = document.getElementById('full-player-view');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const toggleFavoritesBtn = document.getElementById('toggle-favorites-btn');
const estacionesContainer = document.getElementById('estaciones-container');
const statusMessage = document.getElementById('status-message');

// Mini Player
const miniPlayer = document.getElementById('mini-player');
const miniPlayerInfo = document.getElementById('mini-player-info');
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniPlayIcon = document.getElementById('mini-play-icon');
const miniPauseIcon = document.getElementById('mini-pause-icon');
const miniPlayerBuffering = document.getElementById('mini-player-buffering');
const miniPlayingTitle = document.getElementById('mini-playing-title');
const miniPlayingSubtitle = document.getElementById('mini-playing-subtitle');

// Paginación
const pagePrevBtn = document.getElementById('page-prev-btn');
const pageNextBtn = document.getElementById('page-next-btn');
const pageIndicator = document.getElementById('page-indicator');

// Reproductor Completo
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

const fullVolumeSlider = document.getElementById('full-volume-slider');
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
    cargarRadiosBolivia();
}

// ==========================================================================
// FAVORITOS LOCAL STORAGE
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

function toggleFavorite(id, e) {
    e.stopPropagation(); // Evitar click en la tarjeta
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    
    if (showFavoritesOnly) {
        filtrarEstaciones(searchInput.value);
    } else {
        renderListas();
    }
}

// ==========================================================================
// NAVEGACIÓN ENTRE VISTAS
// ==========================================================================
function abrirReproductorCompleto() {
    if (!currentStation) return;
    listView.classList.add('hidden');
    fullPlayerView.classList.remove('hidden');
}

function cerrarReproductorCompleto() {
    fullPlayerView.classList.add('hidden');
    listView.classList.remove('hidden');
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

    searchInput.addEventListener('focus', () => {
        // Ocultar mini reproductor mientras se escribe para dar espacio al teclado
        miniPlayer.classList.add('hidden');
    });

    searchInput.addEventListener('blur', () => {
        // Restaurar mini reproductor al salir del campo de búsqueda si hay emisora
        if (currentStation) {
            miniPlayer.classList.remove('hidden');
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        filtrarEstaciones('');
        searchInput.focus();
    });

    // --- Filtro Favoritos ---
    toggleFavoritesBtn.addEventListener('click', () => {
        showFavoritesOnly = !showFavoritesOnly;
        if (showFavoritesOnly) {
            toggleFavoritesBtn.classList.add('bg-primary', 'text-white', 'border-primary');
            toggleFavoritesBtn.classList.remove('bg-white', 'text-secondary', 'border-light-border');
            toggleFavoritesBtn.innerHTML = `<svg class="fav-icon-solid text-star" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Ocultar Favoritos`;
        } else {
            toggleFavoritesBtn.classList.remove('bg-primary', 'text-white', 'border-primary');
            toggleFavoritesBtn.classList.add('bg-white', 'text-secondary', 'border-light-border');
            toggleFavoritesBtn.innerHTML = `<svg class="fav-icon-outline" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Ver Mis Favoritos`;
        }
        filtrarEstaciones(searchInput.value);
    });

    // --- Paginación ---
    pagePrevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderListas();
        }
    });

    pageNextBtn.addEventListener('click', () => {
        const maxPages = Math.ceil(filteredStations.length / itemsPerPage);
        if (currentPage < maxPages) {
            currentPage++;
            renderListas();
        }
    });

    // --- Mini Reproductor ---
    miniPlayerInfo.addEventListener('click', abrirReproductorCompleto);
    miniPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
    });

    // --- Reproductor Completo ---
    backToListBtn.addEventListener('click', cerrarReproductorCompleto);
    fullPlayBtn.addEventListener('click', togglePlay);
    prevStationBtn.addEventListener('click', reproducirAnterior);
    nextStationBtn.addEventListener('click', reproducirSiguiente);

    // --- Volumen ---
    fullVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audioPlayer.volume = val;
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
            setMuteState(false);
        } else {
            previousVolume = parseFloat(fullVolumeSlider.value) || 0.8;
            audioPlayer.volume = 0;
            fullVolumeSlider.value = 0;
            setMuteState(true);
        }
    });

    // --- Eventos de Hardware ---
    document.addEventListener('backbutton', () => {
        if (!fullPlayerView.classList.contains('hidden')) {
            cerrarReproductorCompleto();
        }
    });

    // --- Eventos del elemento <audio> ---
    audioPlayer.addEventListener('waiting', () => setBufferingUI(true));
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
}

// ==========================================================================
// CÓDIGO PRINCIPAL / API
// ==========================================================================
async function cargarRadiosBolivia() {
    statusMessage.classList.remove('hidden');
    estacionesContainer.innerHTML = '';
    
    try {
        const url = 'https://de1.api.radio-browser.info/json/stations/search?countrycode=BO&hidebroken=true&order=clickcount&reverse=true&limit=300';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Error en la red');
        
        const data = await response.json();
        
        stations = data.map(station => ({
            id: station.stationuuid,
            name: station.name.trim(),
            url: station.url_resolved || station.url,
            tags: station.tags ? station.tags.split(',') : [],
            state: station.state || 'Bolivia',
            favicon: station.favicon || ''
        }));
        
        filteredStations = [...stations];
        currentPage = 1;
        
        statusMessage.classList.add('hidden');
        renderListas();
        
    } catch (error) {
        console.error('Error fetching radios:', error);
        statusMessage.innerHTML = `<span class="text-danger">⚠️ Error de conexión.</span><br><button onclick="cargarRadiosBolivia()" class="mt-2 text-primary font-semibold underline">Reintentar</button>`;
    }
}

function filtrarEstaciones(query) {
    const q = query ? query.toLowerCase() : '';
    
    filteredStations = stations.filter(s => {
        const matchesQuery = s.name.toLowerCase().includes(q) || s.state.toLowerCase().includes(q);
        const matchesFav = showFavoritesOnly ? favorites.includes(s.id) : true;
        return matchesQuery && matchesFav;
    });
    
    currentPage = 1;
    renderListas();
}

// ==========================================================================
// RENDERIZADO DOM
// ==========================================================================
function renderListas() {
    estacionesContainer.innerHTML = '';
    
    const maxPages = Math.ceil(filteredStations.length / itemsPerPage) || 1;
    
    if (currentPage > maxPages) currentPage = maxPages;
    if (currentPage < 1) currentPage = 1;

    pageIndicator.textContent = `Pág ${currentPage}/${maxPages}`;
    pagePrevBtn.disabled = currentPage === 1;
    pageNextBtn.disabled = currentPage === maxPages;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredStations.slice(start, end);

    if (pageItems.length === 0) {
        estacionesContainer.innerHTML = `<div class="text-center text-secondary py-6 text-sm">No se encontraron emisoras.</div>`;
        return;
    }

    pageItems.forEach(station => {
        const originalIndex = stations.findIndex(s => s.id === station.id);
        const el = crearElementoEstacion(station, originalIndex);
        estacionesContainer.appendChild(el);
    });
}

function crearElementoEstacion(station, originalIndex) {
    const isCurrent = currentStation && currentStation.id === station.id;
    const isFav = favorites.includes(station.id);
    
    const div = document.createElement('div');
    div.className = `station-card ${isCurrent ? 'active' : ''}`;
    
    let inicial = station.name.charAt(0).toUpperCase();
    if (!inicial.match(/[A-Z]/i)) inicial = '🎵';

    div.innerHTML = `
        <div class="station-info">
            <div class="station-avatar font-outfit">${inicial}</div>
            <div class="station-details">
                <div class="station-name">${station.name}</div>
                <div class="station-state">${station.state}</div>
            </div>
        </div>
        <div class="station-actions shrink-0 flex items-center gap-2">
            <button class="fav-btn p-2" aria-label="Favorito">
                <svg class="${isFav ? 'text-star fill-current' : 'text-secondary'} hover:text-star transition-colors" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
            <svg class="text-secondary ${isCurrent ? 'text-primary' : ''} ml-1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
        </div>
    `;

    div.addEventListener('click', () => {
        if (isCurrent && isPlaying) {
            abrirReproductorCompleto(); // Si ya suena, abrimos pantalla en lugar de pausar (mejor UX)
        } else if (isCurrent && !isPlaying) {
            togglePlay(); 
            abrirReproductorCompleto();
        } else {
            seleccionarEstacion(station, originalIndex);
            abrirReproductorCompleto();
        }
    });
    
    const favBtn = div.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
        toggleFavorite(station.id, e);
    });

    return div;
}

// ==========================================================================
// REPRODUCCIÓN Y CONTROL
// ==========================================================================
function seleccionarEstacion(station, index) {
    currentStation = station;
    currentIndex = index;
    
    actualizarInfoReproductor(station);
    miniPlayer.classList.remove('hidden'); // Mostrar mini reproductor
    
    audioPlayer.src = station.url;
    audioPlayer.volume = previousVolume;
    
    audioPlayer.play().catch(e => {
        console.error("Auto-play prevented", e);
        isPlaying = false;
        setPlayingUI(false);
        setBufferingUI(false);
    });

    isPlaying = true;
    setPlayingUI(true);
    renderListas(); 
}

function togglePlay() {
    if (!currentStation) return;

    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        setPlayingUI(false);
    } else {
        audioPlayer.play().catch(e => console.error(e));
        isPlaying = true;
        setPlayingUI(true);
    }
}

function reproducirAnterior() {
    if (stations.length === 0) return;
    let newIndex = currentIndex - 1;
    if (newIndex < 0) newIndex = stations.length - 1;
    seleccionarEstacion(stations[newIndex], newIndex);
}

function reproducirSiguiente() {
    if (stations.length === 0) return;
    let newIndex = currentIndex + 1;
    if (newIndex >= stations.length) newIndex = 0;
    seleccionarEstacion(stations[newIndex], newIndex);
}

function actualizarInfoReproductor(station) {
    let inicial = station.name.charAt(0).toUpperCase();
    if (!inicial.match(/[A-Z]/i)) inicial = '🎵';

    // Mini Player
    miniPlayingTitle.textContent = station.name;
    
    // Full Player
    fullPlayingTitle.textContent = station.name;
    fullPlayingSubtitle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span>${station.state}</span>
    `;
    largeAvatarLetter.textContent = inicial;
}

// ==========================================================================
// MANEJO DE UI / ANIMACIONES
// ==========================================================================
function setPlayingUI(playing) {
    if (playing) {
        // Full Player
        fullPlayIcon.classList.add('hidden');
        fullPauseIcon.classList.remove('hidden');
        largeAvatar.classList.add('rotating');
        pulseRing1.classList.remove('hidden');
        pulseRing2.classList.remove('hidden');

        // Mini Player
        miniPlayIcon.classList.add('hidden');
        miniPauseIcon.classList.remove('hidden');
        miniPlayingSubtitle.textContent = 'Reproduciendo en vivo...';
        
    } else {
        // Full Player
        fullPlayIcon.classList.remove('hidden');
        fullPauseIcon.classList.add('hidden');
        largeAvatar.classList.remove('rotating');
        pulseRing1.classList.add('hidden');
        pulseRing2.classList.add('hidden');

        // Mini Player
        miniPlayIcon.classList.remove('hidden');
        miniPauseIcon.classList.add('hidden');
        miniPlayingSubtitle.textContent = 'Pausado';
    }
}

function setBufferingUI(isBuffering) {
    if (isBuffering) {
        fullPlayIcon.classList.add('hidden');
        fullPauseIcon.classList.add('hidden');
        fullPlayerBuffering.classList.remove('hidden');

        miniPlayIcon.classList.add('hidden');
        miniPauseIcon.classList.add('hidden');
        miniPlayerBuffering.classList.remove('hidden');
        miniPlayingSubtitle.textContent = 'Conectando...';
    } else {
        fullPlayerBuffering.classList.add('hidden');
        miniPlayerBuffering.classList.add('hidden');
        
        if (isPlaying) {
            fullPauseIcon.classList.remove('hidden');
            miniPauseIcon.classList.remove('hidden');
            miniPlayingSubtitle.textContent = 'Reproduciendo en vivo...';
        } else {
            fullPlayIcon.classList.remove('hidden');
            miniPlayIcon.classList.remove('hidden');
            miniPlayingSubtitle.textContent = 'Pausado';
        }
    }
}

function setMuteState(muted) {
    isMuted = muted;
    if (muted) {
        fullVolHighIcon.classList.add('hidden');
        fullVolMuteIcon.classList.remove('hidden');
    } else {
        fullVolHighIcon.classList.remove('hidden');
        fullVolMuteIcon.classList.add('hidden');
    }
}

function showPlayerError() {
    fullPlayingTitle.textContent = "Error al conectar";
    miniPlayingTitle.textContent = "Error de red";
    miniPlayingSubtitle.textContent = "Toca para intentar de nuevo";
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', init);
