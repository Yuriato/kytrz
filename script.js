/* ============================================================
   CONFIGURATION
   ============================================================ */

const tracks = [
  { name: "Ambiance", color: "#f4f1ff", rgb: "190, 130, 255", file: "assets/audio/ambiance.mp3", description: "Une musique d'ambiance pour explorer mon univers.", label: "CENTRE" },
  { name: "Morceau 01", color: "#ff5f86", rgb: "255, 65, 112", file: "assets/audio/fleur-01.mp3", description: "1ere fleur.", label: "01 / ROSE" },
  { name: "Morceau 02", color: "#ffad58", rgb: "255, 151, 65", file: "assets/audio/fleur-02.mp3", description: "2eme fleur.", label: "02 / ORANGE" },
  { name: "Morceau 03", color: "#ffe66d", rgb: "255, 220, 80", file: "assets/audio/fleur-03.mp3", description: "3eme fleur.", label: "03 / JAUNE" },
  { name: "Morceau 04", color: "#79f0b2", rgb: "72, 230, 151", file: "assets/audio/fleur-04.mp3", description: "4eme fleur.", label: "04 / VERT" },
  { name: "Morceau 05", color: "#6edcff", rgb: "74, 205, 255", file: "assets/audio/fleur-05.mp3", description: "5eme fleur.", label: "05 / CYAN" },
  { name: "Morceau 06", color: "#8795ff", rgb: "105, 124, 255", file: "assets/audio/fleur-06.mp3", description: "6eme fleur.", label: "06 / BLEU" },
  { name: "Morceau 07", color: "#d69aff", rgb: "194, 112, 255", file: "assets/audio/fleur-07.mp3", description: "7eme fleur.", label: "07 / VIOLET" }
];

const jobDetails = {
  "Graphisme": "Études de graphisme en CVPM à Jean-Lurçat, Perpignan : trois années de conception visuelle, mise en page et communication graphique.",
  "Montage": "Montage et postproduction vidéo avec Premiere Pro, After Effects et DaVinci Resolve.",
  "Composition": "Composition et production musicale sur FL Studio. Début de la production en août 2024, avec un intérêt pour la trap, la new wave, la rage et autres textures expérimentales.",
  "Ingénierie du son": "Prise de voix avec un Audio-Technica AT2020, Audio-Technica M40x et une interface Focusrite Solo 3eme génération. Travail sur le mixage, le traitement vocal et la conception sonore.",
  "Développement": "Apprentissage et projets en Python, JavaScript et HTML/CSS, notamment des interfaces et des outils personnels.",
  "Streaming": "Création de contenu et streaming. https://www.twitch.tv/yuriato_mp4.",
  "Autres": "Expérimentation, création visuelle, musique, code et tout ce qui permet de transformer une idée en projet concret."
};

const twitchUrl = "https://www.twitch.tv/yuriato_mp4";


/* ============================================================
   FLEURS ET SÉLECTION
   ============================================================ */

const outer = document.querySelector("#outer-flowers");
const central = document.querySelector("#central-flower");
const ambient = document.querySelector(".ambient");
const audioStatus = document.querySelector("#audio-status");
const toast = document.querySelector("#toast");

let selected = 0;
let audio = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let animationFrame = null;
let lastColor = tracks[0].rgb;

function makeFlower(track, index) {
  const button = document.createElement("button");
  button.className = "flower";

  const angle =
    (index - 1) * (Math.PI * 2 / 7) - Math.PI / 2;

  button.style.left =
    `${50 + 39 * Math.cos(angle)}%`;

  button.style.top =
    `${50 + 39 * Math.sin(angle)}%`;

  button.style.setProperty("--flower-color", track.color);
  button.setAttribute("aria-label", `Écouter ${track.name}`);

  button.innerHTML = `
    <span class="petals">
      <i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i>
    </span>
    <span class="flower-core"></span>
    <span class="flower-label">${track.label}</span>
  `;

  button.addEventListener("click", () => selectTrack(index));

  outer.appendChild(button);
}

tracks.slice(1).forEach((track, i) => {
  makeFlower(track, i + 1);
});


function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${m}:${s}`;
}


function setCentralColor(color) {
  central.style.setProperty("--flower-color", color);

  central.querySelectorAll(".petals i").forEach((petal, i) => {
    petal.style.transitionDelay = `${i * 45}ms`;
    petal.style.backgroundColor = color;
  });
}


function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastMessage.timer);

  toastMessage.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


function stopAudio(fade = true) {
  if (!audio) return;

  const oldAudio = audio;

  if (fade) {
    const startVolume = oldAudio.volume;
    const start = performance.now();
    const duration = 420;

    function fadeStep(now) {
      const progress = Math.min(1, (now - start) / duration);

      oldAudio.volume = startVolume * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(fadeStep);
      } else {
        oldAudio.pause();
        oldAudio.src = "";
      }
    }

    requestAnimationFrame(fadeStep);
  } else {
    oldAudio.pause();
    oldAudio.src = "";
  }

  audio = null;
}


async function selectTrack(index) {
  const track = tracks[index];

  selected = index;

  stopAudio(true);
  setCentralColor(track.color);

  document.documentElement.style.setProperty(
    "--ambient",
    track.rgb
  );

  spawnFlowers(track.color);

  document.querySelector("#track-name").textContent = track.name;

  document.querySelector("#track-state").textContent =
    index === 0
      ? "AMBIANCE"
      : "SÉLECTION / " + String(index).padStart(2, "0");

  document.querySelector("#track-description").textContent =
    track.description;

  document.querySelector("#current-time").textContent = "0:00";
  document.querySelector("#duration").textContent = "0:00";

  document.querySelector("#player").classList.add("active");

  if (index === 0) {
    audioStatus.textContent = "AMBIANCE";

    if (track.file) {
      startAudio(track);
    } else {
      toastMessage(
        "Ajoute le fichier de musique d'ambiance dans la configuration."
      );
    }

    return;
  }

  if (!track.file) {
    audioStatus.textContent = "À CONFIGURER";
    toastMessage("Ajoute le fichier audio de cette fleur dans script.js.");
    return;
  }

  await startAudio(track);
}


async function startAudio(track) {
  try {
    audio = new Audio(track.file);

    const currentAudio = audio;

    currentAudio.addEventListener("playing", () => {
      console.log("Lecture démarrée :", currentAudio.src);
    });

    currentAudio.addEventListener("error", () => {
      console.log("Erreur audio :", currentAudio.error);
    });

    currentAudio.preload = "metadata";
    currentAudio.volume = 0;

    currentAudio.addEventListener("loadedmetadata", () => {
      document.querySelector("#duration").textContent =
        formatTime(currentAudio.duration);
    });

    currentAudio.addEventListener("timeupdate", () => {
      if (audio === currentAudio) {
        document.querySelector("#current-time").textContent =
          formatTime(currentAudio.currentTime);
      }
    });

    currentAudio.addEventListener("ended", () => {
      if (audio === currentAudio) {
        audioStatus.textContent = "TERMINÉ";
      }
    });

    currentAudio.addEventListener("error", () => {
      audioStatus.textContent = "FICHIER ABSENT";
      toastMessage(`Fichier introuvable : ${track.file}`);
    }, { once: true });

    await currentAudio.play();

    const start = performance.now();
    const fadeDuration = 700;

    function fadeIn(now) {
      if (audio !== currentAudio || currentAudio.paused) return;

      const progress = Math.min(1, (now - start) / fadeDuration);
      currentAudio.volume = progress;

      if (progress < 1) {
        requestAnimationFrame(fadeIn);
      }
    }

    requestAnimationFrame(fadeIn);

    setupAnalyser(currentAudio);

    audioStatus.textContent = "LECTURE";

  } catch (error) {
    audioStatus.textContent = "LECTURE IMPOSSIBLE";

    toastMessage(
      "Le navigateur n'a pas pu lire le son. Vérifie le fichier audio."
    );
  }
}


/* ============================================================
   ANALYSEUR AUDIO
   ============================================================ */

function setupAnalyser(media) {
  try {
    if (!audioContext) {
      audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {}
    }

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    waveformData = new Uint8Array(analyser.fftSize);

    sourceNode = audioContext.createMediaElementSource(media);

    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);

  } catch (e) {
    // L'audio reste lisible même si l'analyseur n'est pas disponible.
  }
}


/* ============================================================
   WAVEFORM — VISUALISATION DU SIGNAL
   ============================================================ */

const waveCanvas = document.querySelector("#waveform");
const waveCtx = waveCanvas.getContext("2d");

let waveformData = null;
let lastWaveDraw = 0;
const waveFrameInterval = 1000 / 30;

function drawWave(now = 0) {
  if (now - lastWaveDraw < waveFrameInterval) {
    animationFrame = requestAnimationFrame(drawWave);
    return;
  }

  lastWaveDraw = now;

  const rect = waveCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  if (
    waveCanvas.width !== Math.floor(rect.width * dpr) ||
    waveCanvas.height !== Math.floor(rect.height * dpr)
  ) {
    waveCanvas.width = Math.floor(rect.width * dpr);
    waveCanvas.height = Math.floor(rect.height * dpr);
  }

  waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = rect.width;
  const h = rect.height;
  const mid = h / 2;

  waveCtx.clearRect(0, 0, w, h);

  // Ligne centrale
  waveCtx.strokeStyle = "rgba(255,255,255,.15)";
  waveCtx.lineWidth = 1;
  waveCtx.beginPath();
  waveCtx.moveTo(0, mid);
  waveCtx.lineTo(w, mid);
  waveCtx.stroke();

  if (analyser && waveformData) {
    const data = waveformData;

    analyser.getByteTimeDomainData(data);

    const visibleSamples = data.length;
    const color = tracks[selected].color;

    waveCtx.beginPath();
    waveCtx.strokeStyle = color;
    waveCtx.lineWidth = 1.5;

    for (let x = 0; x < w; x++) {
      const index = Math.floor(
        (x / w) * (visibleSamples - 1)
      );

      const sample = (data[index] - 128) / 128;
      const y = mid - sample * (h * 0.45);

      if (x === 0) {
        waveCtx.moveTo(x, y);
      } else {
        waveCtx.lineTo(x, y);
      }
    }

    waveCtx.stroke();

    // Repérage des amplitudes proches du maximum
    for (let x = 0; x < w; x++) {
      const index = Math.floor(
        (x / w) * (visibleSamples - 1)
      );

      const sample = (data[index] - 128) / 128;

      if (Math.abs(sample) > 0.92) {
        const y = mid - sample * (h * 0.45);

        waveCtx.fillStyle = "#ff4e65";
        waveCtx.fillRect(x, y - 1, 1.5, 2);
      }
    }
  }

  animationFrame = requestAnimationFrame(drawWave);
}

drawWave();


central.addEventListener("click", () => selectTrack(0));

document.querySelector("#close-player").addEventListener(
  "click",
  () => selectTrack(0)
);


/* ============================================================
   PETITES FLEURS DU CENTRE VERS LES BORDS
   ============================================================ */

const activeFlowerDots = [];
let flowerAnimationRunning = false;

function spawnFlowers(color) {
  const canvas = document.querySelector("#space");
  const rect = canvas.getBoundingClientRect();
  const flowerRect = central.getBoundingClientRect();

  const cx = flowerRect.left + flowerRect.width / 2 - rect.left;
  const cy = flowerRect.top + flowerRect.height / 2 - rect.top;

  const start = performance.now();

  // Ajouter les nouvelles fleurs sans supprimer les anciennes
  for (let i = 0; i < 54; i++) {
    activeFlowerDots.push({
      x: cx,
      y: cy,
      angle: Math.random() * Math.PI * 2,
      speed: 6 + Math.random() * 8,
      radius: 0,
      size: 1.5 + Math.random() * 4,
      delay: Math.random() * 250,
      start,
      color
    });
  }

  if (flowerAnimationRunning) return;

  flowerAnimationRunning = true;

  function animate(now) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();

    // Les dimensions du canvas sont gérées séparément
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (let i = activeFlowerDots.length - 1; i >= 0; i--) {
      const dot = activeFlowerDots[i];
      const elapsed = now - dot.start;

      if (elapsed >= 7500) {
        activeFlowerDots.splice(i, 1);
        continue;
      }

      if (elapsed < dot.delay) continue;

      dot.radius += dot.speed;

      const x = dot.x + Math.cos(dot.angle) * dot.radius;
      const y = dot.y + Math.sin(dot.angle) * dot.radius;

      ctx.globalAlpha = Math.max(0, 1 - elapsed / 7500);
      ctx.fillStyle = dot.color;

      // Dessiner les cinq pétales
      for (let p = 0; p < 5; p++) {
        const a = p * Math.PI * 2 / 5;

        ctx.beginPath();
        ctx.arc(
          x + Math.cos(a) * dot.size,
          y + Math.sin(a) * dot.size,
          dot.size * 0.65,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Cœur de la fleur
      ctx.beginPath();
      ctx.arc(x, y, dot.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (activeFlowerDots.length > 0) {
      requestAnimationFrame(animate);
    } else {
      flowerAnimationRunning = false;
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }

  requestAnimationFrame(animate);
}


/* ============================================================
   NAVIGATION ENTRE LES DEUX PARTIES
   ============================================================ */

const musicPage = document.querySelector("#music-page");
const profilePage = document.querySelector("#profile-page");

function scrollToPage(page) {
  page.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

document.querySelector("#go-profile").addEventListener(
  "click",
  () => scrollToPage(profilePage)
);

document.querySelector("#go-music").addEventListener(
  "click",
  () => scrollToPage(musicPage)
);

document.querySelector("#go-music-bottom").addEventListener(
  "click",
  () => scrollToPage(musicPage)
);


/* ============================================================
   FENÊTRES MÉTIERS
   ============================================================ */

const detail = document.querySelector("#job-detail");

document.querySelectorAll("[data-job]").forEach(button => {
  button.addEventListener("click", () => {
    const job = button.dataset.job;

    document.querySelector("#detail-title").textContent = job;

    document.querySelector("#detail-text").textContent =
      jobDetails[job] ||
      "Ajoute ici les informations à propos de cette activité.";

    const link = document.querySelector("#detail-link");

    if (job === "Streaming" && twitchUrl) {
      link.href = twitchUrl;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute("href");
    }

    detail.hidden = false;

    detail.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
});

document.querySelector("#detail-close").addEventListener(
  "click",
  () => {
    detail.hidden = true;
  }
);


/* ============================================================
   REDIMENSIONNEMENT DU CANVAS DES PARTICULES
   ============================================================ */

function resizeSpaceCanvas() {
  const canvas = document.querySelector("#space");
  if (!canvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);

  // Ne redimensionner que si nécessaire
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

resizeSpaceCanvas();
window.addEventListener("resize", resizeSpaceCanvas);


/* ============================================================
   IMAGE SPATIALE — DISTORSION LIQUIDE WEBGL
   ============================================================ */

(() => {
  const canvas = document.querySelector("#liquid-image");

  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true
  });

  if (!gl) {
    console.warn("WebGL indisponible : image liquide désactivée.");
    return;
  }


  /* ----------------------------------------------------------
     1. PRÉPARATION DE L'IMAGE
     ---------------------------------------------------------- */

  const image = new Image();


  /* ----------------------------------------------------------
     2. SHADER VERTEX
     ---------------------------------------------------------- */

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;


  /* ----------------------------------------------------------
     3. SHADER FRAGMENT
     ---------------------------------------------------------- */

  const fragmentSource = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform vec2 u_viewport;
    uniform vec2 u_displaySize;
    uniform vec2 u_imageCenter;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_mouseActive;

    varying vec2 v_uv;

    void main() {
      vec2 screen = v_uv * u_viewport;
      vec2 p = screen - u_imageCenter;
      vec2 uv = p / u_displaySize + 0.5;

      if (
        uv.x < 0.0 || uv.x > 1.0 ||
        uv.y < 0.0 || uv.y > 1.0
      ) {
        gl_FragColor = vec4(0.0);
        return;
      }

      vec2 centered = (uv - 0.5) * 2.0;

      float radius = length(centered);
      float edge = smoothstep(0.05, 1.0, radius);

      float distanceToMouse =
        distance(screen, u_mouse) /
        min(u_viewport.x, u_viewport.y);

      float mouseInfluence =
        exp(-distanceToMouse * distanceToMouse / 0.04)
        * u_mouseActive;

      float waveX = sin(
        uv.y * 16.0 + u_time * 0.9
        + sin(uv.x * 7.0 + u_time * 0.4)
      );

      float waveY = cos(
        uv.x * 13.0 - u_time * 0.7
        + cos(uv.y * 9.0 - u_time * 0.3)
      );

      float strength = edge * (
        0.0015 + mouseInfluence * 0.012
      );

      vec2 distortedUV = uv
        + vec2(waveX, waveY) * strength;

      distortedUV = clamp(distortedUV, 0.001, 0.999);

      vec4 color = texture2D(u_texture, distortedUV);

      gl_FragColor = color;
    }
  `;


  /* ----------------------------------------------------------
     4. COMPILATION DES SHADERS
     ---------------------------------------------------------- */

  function compileShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vertexShader = compileShader(
    gl.VERTEX_SHADER,
    vertexSource
  );

  const fragmentShader = compileShader(
    gl.FRAGMENT_SHADER,
    fragmentSource
  );

  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);


  /* ----------------------------------------------------------
     5. RECTANGLE PLEIN ÉCRAN
     ---------------------------------------------------------- */

  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
  ]);

  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(
    program,
    "a_position"
  );

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );


  /* ----------------------------------------------------------
     6. TEXTURE PNG
     ---------------------------------------------------------- */

  const texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    gl.CLAMP_TO_EDGE
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    gl.CLAMP_TO_EDGE
  );

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);


  /* ----------------------------------------------------------
     7. VARIABLES DU SHADER
     ---------------------------------------------------------- */

  const locations = {
    imageCenter: gl.getUniformLocation(program, "u_imageCenter"),
    texture: gl.getUniformLocation(program, "u_texture"),
    viewport: gl.getUniformLocation(program, "u_viewport"),
    displaySize: gl.getUniformLocation(program, "u_displaySize"),
    mouse: gl.getUniformLocation(program, "u_mouse"),
    time: gl.getUniformLocation(program, "u_time"),
    mouseActive: gl.getUniformLocation(program, "u_mouseActive")
  };

  gl.uniform1i(locations.texture, 0);


  /* ----------------------------------------------------------
     8. SUIVI DE LA SOURIS
     ---------------------------------------------------------- */

  let mouseX = -10000;
  let mouseY = -10000;
  let mouseActive = 0;

  window.addEventListener("pointermove", event => {
    mouseX = event.clientX;
    mouseY = window.innerHeight - event.clientY;
    mouseActive = 1;
  });

  window.addEventListener("pointerleave", () => {
    mouseActive = 0;
  });


  /* ----------------------------------------------------------
     9. DIMENSIONS ET CENTRAGE DE L'IMAGE
     ---------------------------------------------------------- */

  let displayWidth = 0;
  let displayHeight = 0;
  let startTime = 0;

  function resizeLiquidImage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    gl.viewport(0, 0, canvas.width, canvas.height);

    if (!image.naturalWidth || !image.naturalHeight) return;

    const maxWidth = width * 1.5;
    const maxHeight = height * 1.5;

    const scale = Math.min(
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight
    );

    displayWidth = image.naturalWidth * scale;
    displayHeight = image.naturalHeight * scale;

    gl.uniform2f(locations.viewport, width, height);

    gl.uniform2f(
      locations.displaySize,
      displayWidth,
      displayHeight
    );

    const flower = document.querySelector("#central-flower");

    if (!flower) return;

    const flowerRect = flower.getBoundingClientRect();

    const centerX = flowerRect.left + flowerRect.width / 2;

    const centerY = height - (
      flowerRect.top + flowerRect.height / 2
    );

    gl.uniform2f(
      locations.imageCenter,
      centerX,
      centerY
    );
  }

  window.addEventListener("resize", resizeLiquidImage);


  /* ----------------------------------------------------------
     10. ANIMATION LIQUIDE — 30 IMAGES/S
     ---------------------------------------------------------- */

  let lastRenderTime = 0;
  const targetFrameTime = 1000 / 30;

  function renderLiquidImage(now) {
    if (now - lastRenderTime < targetFrameTime) {
      requestAnimationFrame(renderLiquidImage);
      return;
    }

    lastRenderTime = now;

    if (!displayWidth || !displayHeight) {
      requestAnimationFrame(renderLiquidImage);
      return;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(
      locations.time,
      (now - startTime) / 1000
    );

    gl.uniform2f(
      locations.mouse,
      mouseX,
      mouseY
    );

    gl.uniform1f(
      locations.mouseActive,
      mouseActive
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(renderLiquidImage);
  }


  /* ----------------------------------------------------------
     11. CHARGEMENT DE L'IMAGE
     ---------------------------------------------------------- */

  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );

    resizeLiquidImage();

    startTime = performance.now();

    requestAnimationFrame(renderLiquidImage);
  };

  image.onerror = () => {
    console.error(
      "Impossible de charger assets/images/fond_espace.png"
    );
  };

  image.src = "assets/images/fond_espace.png";

})();

