<script>
  import { onMount } from "svelte";
  import axios from "axios";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { writable } from "svelte/store";
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import { location } from "svelte-spa-router";
  import Starsign from "./[starsign].svelte";
  import { arrays } from "./components/arrays.js";

  const routes = {
    "/:starsign": Starsign,
  };

  $: currentRoute = $location;

  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();

  let camera, scene, renderer, controls, composer;
  let loading = writable(false);
  let errorMessage = writable("");

  const maxMag = 8;
  const minRadius = 0.17;
  const maxRadius = 1587.37;
  const minNewRadius = 0.05; // Mindestgröße für Sichtbarkeit
  const maxNewRadius = 0.3; // Maximalgröße für die Darstellung
  const defaultMaxStars = 50; // Maximale Anzahl von Sternen im Performance-Modus
  const extraStarsCount = 5000; // Anzahl der zusätzlichen zufälligen Sterne im Performance-Modus
  let selectedArray;
  let sunIgnored = false;

  let lineGroup = new THREE.Group();
  let starGroup = new THREE.Group();
  let hitboxGroup = new THREE.Group(); // Gruppe für die Hitboxen
  let backgroundStarGroup = new THREE.Group(); // Gruppe für die Hintergrundsterne
  let clear = false;
  const performanceMode = writable(false);

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
    { name: "Aries", abbreviation: "ari" },
  ];

  onMount(() => {
    init();
    loadAllConstellations();

    // Event-Listener für Maus-Klicks hinzufügen
    renderer.domElement.addEventListener("click", onMouseClick);
  });

  $: if ($performanceMode) {
    console.log("Performance Mode is ON");
    addExtraStars(extraStarsCount);
  } else {
    console.log("Performance Mode is OFF");
    backgroundStarGroup.clear();
  }

  $: performanceMode.subscribe((value) => {
    console.log(`Performance Mode changed: ${value ? "ON" : "OFF"}`);
    refreshStars();
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
    scene.background = new THREE.Color(0x000000); // Setzen Sie explizit eine Hintergrundfarbe

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement); // Stellen Sie sicher, dass dies ausgeführt wird

    controls = new OrbitControls(camera, renderer.domElement);

    scene.add(lineGroup);
    scene.add(starGroup);
    scene.add(hitboxGroup); // Hitbox-Gruppe zur Szene hinzufügen
    scene.add(backgroundStarGroup); // Hintergrundsterne zur Szene hinzufügen

    // Post-Processing-Effekte
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 0.8; // Stärke des Bloom-Effekts
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    animate();
  }

  function loadAllConstellations() {
    for (const constellation of constellations) {
      loadStars(constellation.abbreviation);
    }
  }

  async function loadStars(constellation) {
    loading.set(true);
    const url =
      import.meta.env.VITE_API_BASE_URL ||
      `https://api.julien-offray.de/constellation?constellation=${constellation}`;
    try {
      const response = await axios.get(url);
      if (clear) {
        lineGroup.clear();
        starGroup.clear();
        hitboxGroup.clear(); // Hitbox-Gruppe leeren
        backgroundStarGroup.clear(); // Hintergrundsterne leeren
      }
      selectedArray = constellation;
      const starsData = response.data.stars
        .filter(
          (star) =>
            star.x0 !== undefined &&
            star.y0 !== undefined &&
            star.z0 !== undefined
        )
        .map((star) => ({
          x: star.x0,
          y: star.y0,
          z: star.z0,
          id: star.id,
          absmag: star.absmag,
          ci: star.ci,
          mag: star.mag,
          dist: star.dist,
          ra: star.ra,
          dec: star.dec,
          constellation: constellation, // Hinzufügen des Sternbilds
        }))
        .slice(0, $performanceMode ? undefined : defaultMaxStars); // Begrenzen der Anzahl der Sterne

      addStars(starsData);
      if (arrays[selectedArray]) {
        addConstellationLines(arrays[selectedArray]);
      }
      loading.set(false);
      // console.log(`Loaded ${starsData.length} stars for ${constellation} in ${$performanceMode ? 'full' : 'performance'} mode.`);
    } catch (error) {
      console.error("Fehler beim Abrufen der Sterndaten:", error);
      errorMessage.set("Fehler beim Laden der Sterne");
      loading.set(false);
    }
  }

  function addStars(stars) {
    if (stars.length === 0) {
      console.error("Keine gültigen Sterndaten verfügbar.");
      return;
    }

    stars.forEach((star) => {
      if (star.id === 1 && sunIgnored == false) {
        sunIgnored = true;
        return;
      }
      let starGeometry;
      const originalRadius = berechneSternRadius(star.ci, star.absmag);
      let scaledRadius = mapRadius(
        originalRadius,
        minRadius,
        maxRadius,
        minNewRadius,
        maxNewRadius
      );
      let color = getColorByCI(star.ci);
      let intensity = getIntensityByMag(star.mag);
      if (star.id === 1) {
        color = 0xff0000;
        intensity = 0xff0000;
      }
      if (isNaN(scaledRadius)) {
        scaledRadius = 0.05;
      }
      if (star.dist < 200) {
        starGeometry = new THREE.SphereGeometry(scaledRadius, 16, 16);
      } else if (star.dist < 400) {
        starGeometry = new THREE.SphereGeometry(scaledRadius, 8, 8);
      } else {
        starGeometry = new THREE.SphereGeometry(scaledRadius, 4, 4);
      }

      const starMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: intensity * 1.5, // Erhöhte Intensität für leuchtendere Sterne
      });

      const sphere = new THREE.Mesh(starGeometry, starMaterial);

      // Skalierung der Position der Sterne
      sphere.position.set(star.y, star.z, star.x);
      sphere.userData.starData = { ...star }; // Daten anhängen
      starGroup.add(sphere);

      // Hinzufügen der unsichtbaren Hitbox
      const hitboxGeometry = new THREE.SphereGeometry(1, 16, 16); // Größe der Hitbox
      const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      hitbox.position.set(star.y, star.z, star.x);
      hitbox.userData.starData = { ...star }; // Daten anhängen
      hitboxGroup.add(hitbox);
    });
  }

  function addConstellationLines(stars) {
    if (stars.length === 0) {
      console.error("Keine gültigen Sterndaten verfügbar.");
      return;
    }

    for (let i = 1; i < stars.length - 1; i++) {
      const start = stars[i];
      const end = stars[i + 1];
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        start.y,
        start.z,
        start.x,
        end.y,
        end.z,
        end.x,
      ]);
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2, // Dickere Linien
        transparent: true,
        opacity: 0.8
      });
      const line = new THREE.Line(geometry, material);
      lineGroup.add(line);
    }
  }

  function addExtraStars(count) {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 200; // Bereich erweitern
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;

      const star = {
        x: x,
        y: y,
        z: z,
        id: `extra-${i}`,
        absmag: Math.random() * 10 - 5,
        ci: Math.random() * 2 - 1,
        mag: Math.random() * 10,
        dist: Math.random() * 2000,
      };

      let starGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const color = getColorByCI(star.ci);
      const intensity = getIntensityByMag(star.mag);
      const starMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: intensity * 1.5, // Erhöhte Intensität für leuchtendere Sterne
      });

      const sphere = new THREE.Mesh(starGeometry, starMaterial);
      sphere.position.set(star.x, star.y, star.z);
      backgroundStarGroup.add(sphere);

      // Hinzufügen der unsichtbaren Hitbox
      const hitboxGeometry = new THREE.SphereGeometry(1, 16, 16); // Größe der Hitbox
      const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      hitbox.position.set(star.x, star.y, star.z);
      hitbox.userData.starData = { ...star }; // Daten anhängen
      hitboxGroup.add(hitbox);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    updateVisibility();
    composer.render(); // Verwenden Sie den Composer für das Rendering
    controls.update();
  }

  function updateVisibility() {
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();

    cameraViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    starGroup.children.forEach(function (object) {
      object.visible = frustum.intersectsObject(object);
    });

    lineGroup.children.forEach(function (object) {
      object.visible = frustum.intersectsObject(object);
    });

    backgroundStarGroup.children.forEach(function (object) {
      object.visible = frustum.intersectsObject(object);
    });
  }

  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hitboxGroup.children);

    if (intersects.length > 0) {
      let firstObject = intersects[0].object;
      if (firstObject.userData.starData) {
        document.body.removeChild(renderer.domElement); // Stellen Sie sicher, dass dies ausgeführt wird
        const constellation = firstObject.userData.starData.constellation;
        push(`/${constellation}`);
      }
    }
  }

  function getColorByCI(ci) {
    if (ci < 0)
      return 0x9db4ff; // Blau
    else if (ci < 0.5)
      return 0xbcd2ff; // Hellblau
    else if (ci < 1.0)
      return 0xffffff; // Weiß
    else if (ci < 1.5)
      return 0xfff4ea; // Gelblich
    else return 0xffd2a1; // Orange/Rot
  }

  function getIntensityByMag(mag) {
    const minMag = 0;
    const maxMag = 10;
    const minIntensity = 0.1;
    const maxIntensity = 1;

    if (mag > maxMag) mag = maxMag;
    const intensity =
      maxIntensity -
      ((mag - minMag) / (maxMag - minMag)) * (maxIntensity - minIntensity);
    return intensity;
  }

  function berechneSternRadius(CI, M) {
    const L_sonne = 3.828e26;
    const sigma = 5.67e-8;
    const pi = Math.PI;

    const T = 4600 * (1 / (0.92 * CI + 1.7) + 1 / (0.92 * CI + 0.62));
    const L = L_sonne * Math.pow(10, 0.4 * (4.83 - M));
    const R = Math.sqrt(L / (4 * pi * sigma * Math.pow(T, 4)));
    const R_sonnen = R / 6.96e8;

    return R_sonnen;
  }

  function mapRadius(originalRadius, minOriginal, maxOriginal, minNew, maxNew) {
    return (
      ((originalRadius - minOriginal) / (maxOriginal - minOriginal)) *
        (maxNew - minNew) +
      minNew
    );
  }

  // Refresh function to reload the stars based on performance mode
  function refreshStars() {
    console.log("Refreshing stars based on performance mode.");
    lineGroup.clear();
    starGroup.clear();
    hitboxGroup.clear();
    backgroundStarGroup.clear();
    loadAllConstellations();
  }
</script>

<main>
  <button class="toggle-button" on:click={() => performanceMode.update(n => !n)}>
    Toggle Performance Mode
  </button>
  {#if $loading}
    <div class="loading">Loading...</div>
  {/if}
  {#if $errorMessage}
    <div class="error">{$errorMessage}</div>
  {/if}
</main>

<style>
  body {
    margin: 0;
    font-family: Arial, sans-serif;
    overflow: hidden;
    background: radial-gradient(ellipse at center, #1b2735 0%, #090a0f 100%);
    color: #ffffff;
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

  .toggle-button {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 10px;
    background: #444;
    color: white;
    cursor: pointer;
    z-index: 100;
    border: none;
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  .toggle-button:hover {
    background: #666;
  }
</style>
