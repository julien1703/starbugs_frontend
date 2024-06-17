<script>
  import { onMount } from "svelte";
  import axios from "axios";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { Swiper, SwiperSlide } from 'swiper/svelte';
  import 'swiper/swiper-bundle.css';

  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let camera, scene, renderer, controls;
  let isLoading = false;
  let errorMessage = '';

  const constellations = [
    { name: "Orion", abbreviation: "ori" },
    { name: "Taurus", abbreviation: "tau" },
    { name: "Gemini", abbreviation: "gem" },
    { name: "Cancer", abbreviation: "cnc" },
    { name: "Leo", abbreviation: "leo" },
    { name: "Virgo", abbreviation: "vir" },
    { name: "Libra", abbreviation: "lib" },
    { name: "Scorpius", abbreviation: "sco" },
    { name: "Sagittarius", abbreviation: "sgr" },
    { name: "Capricornus", abbreviation: "cap" },
    { name: "Aquarius", abbreviation: "aqr" },
    { name: "Pisces", abbreviation: "psc" },
  ];

  onMount(() => {
    init();
    loadStars("gem");
    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("click", onMouseClick, false);
  });

  function init() {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    camera.position.z = 0.0001;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
  }

  async function loadStars(constellation) {
    isLoading = true;
    errorMessage = '';
    const url = `https://api.julien-offray.de/constellation?constellation=${constellation}`;
    try {
      const response = await axios.get(url);
      scene.clear(); // Leert die Szene vor dem Hinzufügen neuer Sterne
      const starsData = response.data.stars.filter(star => star.x0 !== undefined && star.y0 !== undefined && star.z0 !== undefined);
      addStars(starsData);
      animate();
    } catch (error) {
      errorMessage = 'Fehler beim Abrufen der Sterndaten: ' + error.message;
    } finally {
      isLoading = false;
    }
  }

  function addStars(stars) {
    stars.forEach((star) => {
      const originalRadius = berechneSternRadius(star.ci, star.absmag);
      let scaledRadius = mapRadius(originalRadius, minRadius, maxRadius, minNewRadius, maxNewRadius);
      let color = getColorByCI(star.ci);
      let intensity = getIntensityByMag(star.mag);
      if (isNaN(scaledRadius)) scaledRadius = 0.05;

      const starGeometry = new THREE.SphereGeometry(scaledRadius, 16, 16);
      const starMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: intensity,
      });

      const sphere = new THREE.Mesh(starGeometry, starMaterial);
      sphere.position.set(star.y0, star.z0, star.x0);
      sphere.userData.starData = star;
      scene.add(sphere);
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
  }

  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const firstObject = intersects[0].object;
      if (firstObject.userData.starData) {
        selectedStar = { ...firstObject.userData.starData, object: firstObject };
        console.log(selectedStar);
      }
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function getColorByCI(ci) {
    if (ci < 0) return 0x9db4ff; // Blau
    else if (ci < 0.5) return 0xbcd2ff; // Hellblau
    else if (ci < 1.0) return 0xfbfbfb; // Weiß
    else if (ci < 1.5) return 0xfff4ea; // Gelblich
    else return 0xffd2a1; // Orange/Rot
  }

  function getIntensityByMag(mag) {
    const minMag = 0;
    const maxMag = 10;
    const minIntensity = 0.1;
    const maxIntensity = 1;

    if (mag > maxMag) mag = maxMag;
    return maxIntensity - ((mag - minMag) / (maxMag - minMag)) * (maxIntensity - minIntensity);
  }

  function berechneSternRadius(CI, M) {
    const L_sonne = 3.828e26; // Leuchtkraft der Sonne in Watt
    const sigma = 5.67e-8; // Stefan-Boltzmann-Konstante in W/m^2/K^4
    const T = 4600 * (1 / (0.92 * CI + 1.7) + 1 / (0.92 * CI + 0.62));
    const L = L_sonne * Math.pow(10, 0.4 * (4.83 - M));
    const R = Math.sqrt(L / (4 * Math.PI * sigma * Math.pow(T, 4)));
    return R / 6.96e8; // Umrechnung in Sonnenradien
  }

  function mapRadius(originalRadius, minOriginal, maxOriginal, minNew, maxNew) {
    return ((originalRadius - minOriginal) / (maxOriginal - minOriginal)) * (maxNew - minNew) + minNew;
  }
</script>

<style>
  .buttons {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
  }

  .swiper-container {
    position: absolute;
    bottom: 50px;
    width: 100%;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .swiper-slide {
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 18px;
  }

  .swiper-pagination {
    bottom: 20px !important;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    color: white;
  }

  .error {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #ff4c4c;
    padding: 10px;
    border-radius: 4px;
    color: white;
    z-index: 10;
  }

  canvas {
    display: block;
  }

  main {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  .constellation-info {
    position: absolute;
    bottom: 50px;
    width: 100%;
    text-align: center;
    color: white;
    font-size: 20px;
  }
</style>

<main>
  <Swiper
    spaceBetween={50}
    slidesPerView={3}
    centeredSlides={true}
    loop={true}
    pagination={{ clickable: true }}
    on:slideChange={(swiper) => loadStars(constellations[swiper.activeIndex % constellations.length].abbreviation)}
  >
    {#each constellations as constellation}
      <SwiperSlide>
        <div>{constellation.name}</div>
      </SwiperSlide>
    {/each}
  </Swiper>
  <div class="constellation-info">
    {selectedStar ? `${selectedStar.name} (${selectedStar.abbreviation})` : ''}
  </div>
  {#if isLoading}
    <div class="loading">Loading...</div>
  {/if}
  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}
</main>
