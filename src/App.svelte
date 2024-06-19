<script>
  import { onMount } from "svelte";
  import axios from "axios";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { writable } from 'svelte/store';

  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();

  let camera, scene, renderer, controls;
  let loading = writable(false);
  let errorMessage = writable('');

  const maxMag = 8;
  const minRadius = 0.17;
  const maxRadius = 1587.37;
  const minNewRadius = 0.05; // Mindestgröße für Sichtbarkeit
  const maxNewRadius = 0.3; // Maximalgröße für die Darstellung
  let lastRemovedStar = null;
  let selectedStar = null;
  let sunIgnored = false;

  let lineGroup = new THREE.Group();

  onMount(() => {
    init();
    loadStars("gem");
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
  }

  async function loadStars(constellation) {
    loading.set(true);
    const url = `https://api.julien-offray.de/constellation?constellation=${constellation}`;
    try {
      const response = await axios.get(url);
      scene.clear(); // Leert die Szene vor dem Hinzufügen neuer Sterne
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
        }));
      addStars(starsData);
      animate();
      loading.set(false);
    } catch (error) {
      console.error("Fehler beim Abrufen der Sterndaten:", error);
      errorMessage.set('Fehler beim Laden der Sterne');
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
        emissiveIntensity: intensity,
      });

      const sphere = new THREE.Mesh(starGeometry, starMaterial);
      sphere.position.set(star.y, star.z, star.x);
      sphere.userData.starData = { ...star }; // Daten anhängen
      scene.add(sphere);
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    updateVisibility();
    renderer.render(scene, camera);
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

    scene.traverse(function (object) {
      if (object instanceof THREE.Mesh) {
        object.visible = frustum.intersectsObject(object);
      }
    });
  }

  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      let firstObject = intersects[0].object;
      if (firstObject.userData.starData) {
        console.log(firstObject.userData.starData);
        if (lastRemovedStar != null) addStars([lastRemovedStar]);

        lastRemovedStar = null;

        selectedStar = {
          ...firstObject.userData.starData,
          object: firstObject,
        };
      }
    }
  }
  window.addEventListener("click", onMouseClick);

  function getColorByCI(ci) {
    if (ci < 0)
      return 0x9db4ff; // Blau
    else if (ci < 0.5)
      return 0xbcd2ff; // Hellblau
    else if (ci < 1.0)
      return 0xfbfbfb; // Weiß
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
    { name: "Aries", abbreviation: "ari" }
  ];

  let selectedArray;
  $: if (selectedArray) {
    updateLines(selectedArray);
  }

  function updateLines(arrayName) {
    lineGroup.clear();
    let array = arrays[arrayName];
    if (array) {
      for (let i = 1; i < array.length - 1; i++) {
        addLine(array[i], array[i + 1], array[0]);
      }
    } else {
      console.error("Unbekanntes Array:", arrayName);
    }
  }

  function addLine(start, end, center) {
    let geometry = new THREE.BufferGeometry();
    let vertices = new Float32Array([
      start.y,
      start.z,
      start.x,
      end.y,
      end.z,
      end.x,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    let color = Math.floor(Math.random() * 0xffffff);
    let material = new THREE.LineBasicMaterial({ color: color });
    let line = new THREE.Line(geometry, material);
    lineGroup.add(line);
    scene.add(lineGroup);
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
    z-index: 100;
  }

  button {
    padding: 10px;
    font-size: 14px;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    background-color: #444;
    color: white;
    transition: background-color 0.3s;
  }

  button:hover {
    background-color: #666;
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
</style>

<main>
  <div class="buttons">
    {#each constellations as constellation}
      <button on:click={() => loadStars(constellation.abbreviation)}>
        {constellation.name}
      </button>
    {/each}
  </div>
  {#if $loading}
    <div class="loading">Loading...</div>
  {/if}
  {#if $errorMessage}
    <div class="error">{$errorMessage}</div>
  {/if}
</main>
