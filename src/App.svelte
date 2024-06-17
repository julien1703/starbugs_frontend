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
      start.y0,
      start.z0,
      start.x0,
      end.y0,
      end.z0,
      end.x0,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    let color = Math.floor(Math.random() * 0xffffff);
    let material = new THREE.LineBasicMaterial({ color: color });
    let line = new THREE.Line(geometry, material);
    lineGroup.add(line);
    scene.add(lineGroup);
  }

  let arrays = {
    leo: [
      { x: -69.8918888888889, y: 34.736444444444444, z: -42.151777777777774 },
      { x0: -29.062, y0: 18.026, z0: 16.685 },
      { x0: -53.196, y0: 35.259, z0: 28.114 },
      { x0: -21.019, y0: 11.132, z0: 5.041 },
      { x0: -115.275, y0: 61.333, z0: -0.847 },
      { x0: -273.354, y0: 128.03, z0: -431.558 },
      { x0: -65.657, y0: 28.518, z0: -21.662 },
      { x0: -16.442, y0: 3.337, z0: 6.281 },
      { x0: -34.003, y0: 15.861, z0: 13.539 },
      { x0: -21.019, y0: 11.132, z0: 5.041 },
    ],
    gem: [
      { x: -18.741125000000004, y: 77.5919375, z: 34.9838125 },
      { x0: -3.532, y0: 17.638, z0: 4.118 },
      { x0: -9.825, y0: 27.709, z0: 8.731 },
      { x0: -5.888, y0: 16.151, z0: 6.94 },
      { x0: -84.119, y0: 292.833, z0: 114.34 },
      { x0: -5.266, y0: 31.714, z0: 9.461 },
      { x0: -84.119, y0: 292.833, z0: 114.34 },
      { x0: -5.888, y0: 16.151, z0: 6.94 },
      { x0: -28.15, y0: 63.284, z0: 35.133 },
      { x0: -17.374, y0: 35.447, z0: 17.905 },
      { x0: -28.15, y0: 63.284, z0: 35.133 },
      { x0: -4.055, y0: 8.195, z0: 4.867 },
      { x0: -28.15, y0: 63.284, z0: 35.133 },
      { x0: -13.456, y0: 34.281, z0: 19.415 },
      { x0: -31.691, y0: 98.796, z0: 60.496 },
      { x0: -5.312, y0: 12.13, z0: 8.239 },
      { x0: -31.691, y0: 98.796, z0: 60.496 },
      { x0: -11.225, y0: 47.866, z0: 33.114 },
      { x0: -31.691, y0: 98.796, z0: 60.496 },
      { x0: -46.024, y0: 237.15, z0: 113.322 },
      { x0: -26.594, y0: 209.318, z0: 77.684 },
      { x0: -46.024, y0: 237.15, z0: 113.322 },
      { x0: -6.562, y0: 65.281, z0: 27.195 },
      { x0: -6.562, y0: 65.281, z0: 27.195 },
      { x0: -0.785, y0: 43.678, z0: 18.781 },
    ],
    Widder: [
      { x: 26.385749999999998, y: 17.72025, z: 13.57625 },
      { _id: "663b7e1c2bdcc11befd4a1a5", x0: 41.77, y0: 22.568, z0: 16.62 },
      { _id: "663b7e1c2bdcc11befd4a24c", x0: 14.753, y0: 8.063, z0: 6.389 },
      { _id: "663b7e1c2bdcc11befd4ab7b", x0: 15.732, y0: 9.752, z0: 8.034 },
      { _id: "663b7e1e2bdcc11befd4c94e", x0: 33.288, y0: 30.498, z0: 23.262 },
    ],
    Wassermann: [
      {
        x: 71.29146666666665,
        y: -32.709799999999994,
        z: -11.578999999999999,
      },
      {
        _id: "663b7e542bdcc11befd943d5",
        hip: 115438,
        ra: 23.382842,
        dec: -20.10058,
        dist: 50.3632,
        x0: 46.68,
        y0: -7.608,
        z0: -17.308,
      },
      {
        _id: "663b7e532bdcc11befd93eab",
        hip: 114855,
        ra: 23.26485994,
        dec: -9.08773573,
        dist: 45.2645,
        x0: 43.871,
        y0: -8.549,
        z0: -7.149,
      },
      {
        _id: "663b7e522bdcc11befd92d35",
        hip: 112961,
        ra: 22.87691,
        dec: -7.579599,
        dist: 111.9069,
        x0: 106.169,
        y0: -32.148,
        z0: -14.761,
      },
      {
        _id: "663b7e522bdcc11befd91fa0",
        hip: 111497,
        ra: 22.589272,
        dec: -0.117498,
        dist: 54.434,
        x0: 50.763,
        y0: -19.65,
        z0: -0.112,
      },
      {
        _id: "663b7e522bdcc11befd91a77",
        hip: 110960,
        ra: 22.480531,
        dec: -0.019972,
        dist: 28.169,
        x0: 25.97,
        y0: -10.912,
        z0: -0.01,
      },
      {
        _id: "663b7e512bdcc11befd9149b",
        hip: 110395,
        ra: 22.360938,
        dec: -1.387331,
        dist: 50.2008,
        x0: 45.636,
        y0: -20.88,
        z0: -1.215,
      },
      {
        _id: "663b7e512bdcc11befd90710",
        hip: 109074,
        ra: 22.09639885,
        dec: -0.31984929,
        dist: 202.2185,
        x0: 177.619,
        y0: -96.656,
        z0: -1.129,
      },
      {
        _id: "663b7e4f2bdcc11befd8e928",
        hip: 106278,
        ra: 21.525982,
        dec: -5.571172,
        dist: 167.4261,
        x0: 132.887,
        y0: -100.54,
        z0: -16.254,
      },
      {
        _id: "663b7e4e2bdcc11befd8bdc8",
        hip: 102618,
        ra: 20.79459785,
        dec: -9.49577641,
        dist: 63.6943,
        x0: 41.97,
        y0: -46.745,
        z0: -10.508,
      },
      {
        _id: "663b7e4f2bdcc11befd8e928",
        hip: 106278,
        ra: 21.525982,
        dec: -5.571172,
        dist: 167.4261,
        x0: 132.887,
        y0: -100.54,
        z0: -16.254,
      },
      {
        _id: "663b7e512bdcc11befd90710",
        hip: 109074,
        ra: 22.09639885,
        dec: -0.31984929,
        dist: 202.2185,
        x0: 177.619,
        y0: -96.656,
        z0: -1.129,
      },
      {
        _id: "663b7e512bdcc11befd910b1",
        hip: 110003,
        ra: 22.28056584,
        dec: -7.78328831,
        dist: 58.5163,
        x0: 52.202,
        y0: -25.226,
        z0: -7.925,
      },
      {
        _id: "663b7e512bdcc11befd907a2",
        hip: 109139,
        ra: 22.10728585,
        dec: -13.86968033,
        dist: 64.5411,
        x0: 55.123,
        y0: -29.793,
        z0: -15.471,
      },
      {
        _id: "663b7e512bdcc11befd910b1",
        hip: 110003,
        ra: 22.28056584,
        dec: -7.78328831,
        dist: 58.5163,
        x0: 52.202,
        y0: -25.226,
        z0: -7.925,
      },
      {
        _id: "663b7e522bdcc11befd91c07",
        hip: 111123,
        ra: 22.51078213,
        dec: -10.67796039,
        dist: 88.8099,
        x0: 80.723,
        y0: -33.17,
        z0: -16.455,
      },
      {
        _id: "663b7e522bdcc11befd92aeb",
        hip: 112716,
        ra: 22.82652815,
        dec: -13.59262957,
        dist: 99.8288,
        x0: 92.49,
        y0: -29.343,
        z0: -23.461,
      },
      {
        _id: "663b7e532bdcc11befd92ea6",
        hip: 113136,
        ra: 22.910837,
        dec: -15.82082,
        dist: 49.2368,
        x0: 45.459,
        y0: -13.325,
        z0: -13.423,
      },
      {
        _id: "663b7e532bdcc11befd939fd",
        hip: 114341,
        ra: 23.157443,
        dec: -21.17241,
        dist: 78.9203,
        x0: 71.81,
        y0: -16.102,
        z0: -28.504,
      },
    ],
    Skorpion: [
      { x: -29.960153846153844, y: -122.941, z: -88.8423076923077 },
      { x0: -16.049, y0: -138.75, z0: -105.65 },
      { x0: -8.785, y0: -114.748, z0: -93.293 },
      { x0: -29.202, y0: -538.527, z0: -454.583 },
      { x0: -6.654, y0: -67.017, z0: -62.797 },
      { x0: -3.401, y0: -16.055, z0: -15.432 },
      { x0: -8.585, y0: -29.255, z0: -27.803 },
      { x0: -35.433, y0: -115.662, z0: -94.672 },
      { x0: -4.842, y0: -15.396, z0: -11.007 },
      { x0: -45.96, y0: -119.547, z0: -68.721 },
      { x0: -58.543, y0: -140.308, z0: -75.575 },
      { x0: -46.814, y0: -80.155, z0: -45.503 },
      { x0: -58.543, y0: -140.308, z0: -75.575 },
      { x0: -69.333, y0: -120.492, z0: -57.928 },
      { x0: -58.543, y0: -140.308, z0: -75.575 },
      { x0: -55.881, y0: -102.321, z0: -41.986 },
    ],
    Fische: [
      { x: 74.4677777777778, y: 19.51683333333333, z: 16.47005555555556 },
      { x0: 105.454, y0: 35.156, z0: 50.855 },
      { x0: 96.78, y0: 27.212, z0: 62.343 },
      { x0: 82.363, y0: 29.761, z0: 45.131 },
      { x0: 105.454, y0: 35.156, z0: 50.855 },
      { x0: 101.738, y0: 42.915, z0: 30.302 },
      { x0: 75.809, y0: 37.547, z0: 13.638 },
      { x0: 41.361, y0: 24.472, z0: 2.364 },
      { x0: 48.236, y0: 26.069, z0: 3.054 },
      { x0: 100.757, y0: 47.752, z0: 10.712 },
      { x0: 98.543, y0: 40.911, z0: 11.485 },
      { x0: 53.54, y0: 15.086, z0: 7.709 },
      { x0: 176.504, y0: 37.751, z0: 23.122 },
      { x0: 139.669, y0: 12.587, z0: 20.184 },
      { x0: 32.792, y0: -0.099, z0: 3.947 },
      { x0: 13.595, y0: -1.192, z0: 1.344 },
      { x0: 51.141, y0: -7.195, z0: 5.774 },
      { x0: 41.496, y0: -7.847, z0: 2.422 },
      { x0: 48.701, y0: -7.076, z0: 1.079 },
      { x0: 31.941, y0: -2.507, z0: 0.996 },
      { x0: 13.595, y0: -1.192, z0: 1.344 },
    ],
  };
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
