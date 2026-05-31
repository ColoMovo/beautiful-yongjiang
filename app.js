const slides = [...document.querySelectorAll(".slide")];
const dots = document.querySelector("#dots");
const progress = document.querySelector("#progress");
let current = 0;
let wheelLocked = false;

const periodValues = ["现状影像", "1960-12~1997-12", "2005-06~2018-10", "2019-10~2025-10", "展望"];

// 第三页可手动微调区域：
// 1. yongjiangTrace 用经纬度控制天地图上的蓝色邕江轮廓线。
// 2. geoLabels 用百分比控制页面标签位置，left/top 均相对于左侧地图区域。
// 3. 打开 http://127.0.0.1:8026/index.html?edit=1 后，可在控制台看到标签拖动后的建议数值。
const hydroMapConfig = {
  center: [108.37, 22.78],
  zoom: 12,
  yongjiangTrace: [
    [108.10603, 22.83333],
    [108.12221, 22.84273],
    [108.11268, 22.82195],
    [108.10595, 22.80768],
    [108.13696, 22.77526],
    [108.17128, 22.76054],
    [108.18889, 22.76895],
    [108.20157, 22.78665],
    [108.18801, 22.81820],
    [108.20068, 22.82219],
    [108.25334, 22.82935],
    [108.28367, 22.80719],
    [108.30409, 22.81067],
    [108.31572, 22.81260],
    [108.32205, 22.79355],
    [108.33830, 22.79519],
    [108.34236, 22.78891],
    [108.32650, 22.77870],
    [108.33660, 22.76846],
    [108.37026, 22.78617],
    [108.39405, 22.77456],
    [108.40806, 22.76087],
    [108.41959, 22.76205],
    [108.42212, 22.77262],
    [108.43286, 22.78862],
    [108.45579, 22.79368],
    [108.46444, 22.80835],
    [108.47101, 22.80950],
    [108.47798, 22.79625],
    [108.48849, 22.78396],
    [108.48495, 22.76744],
    [108.48719, 22.75927],
    [108.49403, 22.75774],
    [108.49877, 22.76372],
    [108.49686, 22.79103],
    [108.51163, 22.79682],
    [108.51148, 22.78465],
    [108.51723, 22.77929],
    [108.53138, 22.79123],
    [108.56105, 22.80741],
    [108.57022, 22.82418],
    [108.57042, 22.83784],
    [108.63491, 22.83048],
    [108.69791, 22.83982],
    [108.72952, 22.84402],
    [108.74031, 22.84092],
    [108.79548, 22.86314],
    [108.80829, 22.86497]
  ],
  geoLabels: {
    cutbank: { left: 21.5, top: 45.2 },
    pointbar: { left: 25.6, top: 27.8 },
    terrace: { left: 64.0, top: 57.0 },
    meander: { left: 78.0, top: 68.0 },
    island: { left: 87.2, top: 37.0 }
  }
};

const elevationMapConfig = {
  geoLabels: {
    gaofeng: { left: 35.5, top: 15.0 },
    youjiang: { left: 10.0, top: 52.0 },
    basin: { left: 56.0, top: 46.0 },
    yongjiang: { left: 68.0, top: 72.0 },
    qingxiushan: { left: 81.0, top: 61.5 },
    wuxiangling: { left: 63.5, top: 68.0 }
  }
};

function buildDots() {
  slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dot";
    button.setAttribute("aria-label", `跳转到第 ${index + 1} 页：${slide.dataset.title}`);
    button.addEventListener("click", () => goTo(index));
    dots.appendChild(button);
  });
}

function buildYearWheels() {
  document.querySelectorAll(".year-wheel").forEach((wheel) => {
    const strip = document.createElement("div");
    strip.className = "year-strip";
    periodValues.forEach((year) => {
      const span = document.createElement("span");
      if (year.includes("~")) {
        const parts = year.split("~");
        span.innerHTML = `${parts[0]}~<br><span class="year-end">${parts[1]}</span>`;
      } else {
        span.innerHTML = year;
      }
      strip.appendChild(span);
    });
    wheel.appendChild(strip);
  });
}

function animateYear(slide) {
  const wheel = slide.querySelector(".year-wheel");
  if (!wheel) return;
  const strip = wheel.querySelector(".year-strip");
  const spans = [...strip.children];
  const target = wheel.dataset.period || wheel.dataset.year;
  const index = Math.max(0, spans.findIndex((span) => span.textContent === target));
  const itemHeight = spans[0] ? spans[0].clientHeight : wheel.clientHeight;
  strip.style.transform = `translateY(-${index * itemHeight}px)`;
}

function goTo(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle("is-active", i === current));
  [...dots.children].forEach((dot, i) => dot.classList.toggle("is-active", i === current));
  progress.style.width = `${((current + 1) / slides.length) * 100}%`;
  animateYear(slides[current]);
  applyGeoLabelConfig();
  if (slides[current].querySelector("#tdtMap")) {
    initTianditu();
  }
}

function handleWheel(event) {
  event.preventDefault();
  if (wheelLocked) return;
  wheelLocked = true;
  goTo(current + (event.deltaY > 0 ? 1 : -1));
  window.setTimeout(() => {
    wheelLocked = false;
  }, 760);
}

function applyGeoLabelConfig() {
  Object.entries(hydroMapConfig.geoLabels).forEach(([key, position]) => {
    const label = document.querySelector(`.geo-annotations [data-geo-label="${key}"]`);
    if (!label) return;
    label.style.left = `${position.left}%`;
    label.style.top = `${position.top}%`;
  });

  Object.entries(elevationMapConfig.geoLabels).forEach(([key, position]) => {
    const label = document.querySelector(`.geo-pins [data-geo-label="${key}"]`);
    if (!label) return;
    label.style.left = `${position.left}%`;
    label.style.top = `${position.top}%`;
  });
}

let tiandituReady = false;
let tiandituTried = false;

function initTianditu() {
  if (tiandituReady || tiandituTried) return;
  tiandituTried = true;
  const mapEl = document.querySelector("#tdtMap");
  if (!mapEl) return;
  mapEl.innerHTML = "";
  if (!window.T) {
    mapEl.innerHTML = `<div class="tdt-error">天地图 API 暂未加载完成，请确认网络后刷新本页。</div>`;
    return;
  }
  try {
    const map = new T.Map("tdtMap");
    map.centerAndZoom(new T.LngLat(...hydroMapConfig.center), hydroMapConfig.zoom);
    if (window.TMAP_SATELLITE_MAP) {
      map.setMapType(window.TMAP_SATELLITE_MAP);
    } else if (window.TMAP_HYBRID_MAP) {
      map.setMapType(window.TMAP_HYBRID_MAP);
    }
    map.disableScrollWheelZoom();
    
    // Draw two overlapping layers to create a glowing highlight effect along the exact river trace
    const glowLine = new T.Polyline(
      hydroMapConfig.yongjiangTrace.map(([lng, lat]) => new T.LngLat(lng, lat)),
      { color: "#00f3ff", weight: 9, opacity: 0.58 }
    );
    const coreLine = new T.Polyline(
      hydroMapConfig.yongjiangTrace.map(([lng, lat]) => new T.LngLat(lng, lat)),
      { color: "#ffffff", weight: 3.5, opacity: 0.95 }
    );
    
    map.addOverLay(glowLine);
    map.addOverLay(coreLine);
    tiandituReady = true;
  } catch (error) {
    mapEl.innerHTML = `<div class="tdt-error">天地图卫星影像加载异常，请稍后刷新重试。</div>`;
  }
}

function enableEditMode() {
  if (!new URLSearchParams(window.location.search).has("edit")) return;
  
  const layer3 = document.querySelector(".geo-annotations");
  if (layer3) layer3.style.pointerEvents = "auto";
  
  const layer2 = document.querySelector(".geo-pins");
  if (layer2) layer2.style.pointerEvents = "auto";

  document.querySelectorAll("[data-geo-label]").forEach((label) => {
    label.style.cursor = "move";
    label.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      label.setPointerCapture(event.pointerId);
      const layer = label.parentElement;
      const move = (moveEvent) => {
        const bounds = layer.getBoundingClientRect();
        const left = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
        const top = ((moveEvent.clientY - bounds.top) / bounds.height) * 100;
        label.style.left = `${Math.max(0, Math.min(96, left)).toFixed(1)}%`;
        label.style.top = `${Math.max(0, Math.min(96, top)).toFixed(1)}%`;
      };
      const up = () => {
        const key = label.dataset.geoLabel;
        console.log(`${key}: { left: ${parseFloat(label.style.left).toFixed(1)}, top: ${parseFloat(label.style.top).toFixed(1)} }`);
        label.removeEventListener("pointermove", move);
        label.removeEventListener("pointerup", up);
      };
      label.addEventListener("pointermove", move);
      label.addEventListener("pointerup", up);
    });
  });
}

function initIntroVideo() {
  const introLayer = document.querySelector(".space-zoom");
  const video = document.querySelector(".intro-video");
  if (!introLayer || !video) return;
  video.addEventListener("ended", () => {
    introLayer.classList.add("video-ended");
  });
  video.addEventListener("error", () => {
    introLayer.classList.add("video-ended");
  });
}

function initTeamCarousel() {
  const container = document.querySelector(".team-carousel");
  if (!container) return;
  const cards = container.querySelectorAll(".team-card");
  const dots = container.querySelectorAll(".team-dot");
  let currentIndex = 0;
  let timerId = null;

  function showCard(index) {
    currentIndex = index;
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
    cards.forEach((c, i) => c.classList.toggle("active", i === index));
    
    // Clear any active auto-scroll timer
    if (timerId) clearTimeout(timerId);
    
    // Custom delay: 10s for Authors (index 0), 5s for Speaker and Teacher
    const delay = index === 0 ? 10000 : 5000;
    
    // Schedule next slide
    timerId = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % cards.length;
      showCard(nextIndex);
    }, delay);
  }

  // Support manual click overrides which resets the timer
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showCard(index);
    });
  });

  // Start the slideshow loop
  showCard(0);
}

buildDots();
buildYearWheels();
applyGeoLabelConfig();
enableEditMode();
initIntroVideo();
initTeamCarousel();
goTo(0);

document.querySelector(".prev").addEventListener("click", () => goTo(current - 1));
document.querySelector(".next").addEventListener("click", () => goTo(current + 1));
window.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) goTo(current + 1);
  if (["ArrowLeft", "PageUp"].includes(event.key)) goTo(current - 1);
});
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("resize", () => animateYear(slides[current]));
