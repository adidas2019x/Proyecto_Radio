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

// Favoritos y Filtro de Género
let favorites = [];
let activeGenre = 'cumbia'; // Default inicial: Cumbia & Tropical

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
const genreChipsContainer = document.getElementById('genre-chips-container');
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
    cargarEmisorasPorGenero(activeGenre);
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
    e.stopPropagation();
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    
    if (activeGenre === 'favorites') {
        cargarEmisorasPorGenero('favorites');
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
        miniPlayer.classList.add('hidden');
    });

    searchInput.addEventListener('blur', () => {
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

    // --- Cápsulas de Género / Categoría ---
    const chips = genreChipsContainer.querySelectorAll('.genre-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => c.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            activeGenre = target.dataset.genre;
            cargarEmisorasPorGenero(activeGenre);
        });
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
// CONSULTA A LA API POR GÉNERO Y PAÍSES
// ==========================================================================
async function cargarEmisorasPorGenero(genre) {
    statusMessage.classList.remove('hidden');
    statusMessage.innerHTML = `<div class="spinner mx-auto mb-2"></div>Buscando emisoras...`;
    estacionesContainer.innerHTML = '';

    // Manejo especial si es Favoritos y no hay guardadas
    if (genre === 'favorites') {
        if (favorites.length === 0) {
            statusMessage.classList.add('hidden');
            filteredStations = [];
            renderListas();
            return;
        }
    }

    try {
        let url = '';
        if (genre === 'cumbia') {
            // Cumbia, Chicha, Tropical (Bolivia, Perú, Argentina, México, Colombia)
            url = 'https://de1.api.radio-browser.info/json/stations/search?taglist=cumbia,tropical,chicha&hidebroken=true&order=clickcount&reverse=true&limit=150';
        } else if (genre === 'clasicos') {
            // Clásicos 80s, 90s, Retro, Oldies
            url = 'https://de1.api.radio-browser.info/json/stations/search?taglist=80s,90s,clasicos,retro,oldies&hidebroken=true&order=clickcount&reverse=true&limit=150';
        } else if (genre === 'bolivia') {
            // Todas las emisoras de Bolivia
            url = 'https://de1.api.radio-browser.info/json/stations/search?countrycode=BO&hidebroken=true&order=clickcount&reverse=true&limit=150';
        } else if (genre === 'favorites') {
            // Cargar favoritas por UUID
            url = `https://de1.api.radio-browser.info/json/stations/byuuid?uuids=${favorites.join(',')}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Error de conexión con la API');

        const data = await response.json();

        stations = data.map(station => {
            // Formatear ubicación (Ej: Lima, Peru o La Paz, Bolivia)
            let location = [];
            if (station.state && station.state.trim()) location.push(station.state.trim());
            if (station.country && station.country.trim()) location.push(station.country.trim());
            const formattedLocation = location.length > 0 ? location.join(', ') : 'Internacional';

            return {
                id: station.stationuuid,
                name: station.name.trim(),
                url: station.url_resolved || station.url,
                tags: station.tags ? station.tags.split(',') : [],
                state: formattedLocation,
                favicon: station.favicon || ''
            };
        });

        // Filtrar duplicados
        stations = stations.filter((st, idx, self) => idx === self.findIndex(s => s.id === st.id));

        filteredStations = [...stations];
        currentPage = 1;

        statusMessage.classList.add('hidden');
        
        // Si teníamos un texto en el buscador, lo aplicamos
        if (searchInput.value.trim()) {
            filtrarEstaciones(searchInput.value.trim());
        } else {
            renderListas();
        }

    } catch (error) {
        console.error('Error al cargar emisoras:', error);
        statusMessage.innerHTML = `<span class="text-danger">⚠️ Error de conexión.</span><br><button onclick="cargarEmisorasPorGenero('${genre}')" class="mt-2 text-primary font-semibold underline">Reintentar</button>`;
    }
}

function filtrarEstaciones(query) {
    const q = query ? query.toLowerCase() : '';
    
    filteredStations = stations.filter(s => {
        const matchesQuery = s.name.toLowerCase().includes(q) || 
                             s.state.toLowerCase().includes(q) || 
                             s.tags.some(t => t.toLowerCase().includes(q));
        return matchesQuery;
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
        estacionesContainer.innerHTML = `<div class="text-center text-secondary py-6 text-sm">No se encontraron emisoras en esta categoría.</div>`;
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
            abrirReproductorCompleto();
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
    miniPlayer.classList.remove('hidden');
    
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
        fullPlayIcon.classList.add('hidden');
        fullPauseIcon.classList.remove('hidden');
        largeAvatar.classList.add('rotating');
        pulseRing1.classList.remove('hidden');
        pulseRing2.classList.remove('hidden');

        miniPlayIcon.classList.add('hidden');
        miniPauseIcon.classList.remove('hidden');
        miniPlayingSubtitle.textContent = 'Reproduciendo en vivo...';
        
    } else {
        fullPlayIcon.classList.remove('hidden');
        fullPauseIcon.classList.add('hidden');
        largeAvatar.classList.remove('rotating');
        pulseRing1.classList.add('hidden');
        pulseRing2.classList.add('hidden');

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
