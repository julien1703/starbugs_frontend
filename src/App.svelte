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
    { name: "Aries", abbreviation: "ari" },
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
      { x: -29.062, y: 18.026, z: 16.685 },
      { x: -53.196, y: 35.259, z: 28.114 },
      { x: -21.019, y: 11.132, z: 5.041 },
      { x: -115.275, y: 61.333, z: -0.847 },
      { x: -273.354, y: 128.03, z: -431.558 },
      { x: -65.657, y: 28.518, z: -21.662 },
      { x: -16.442, y: 3.337, z: 6.281 },
      { x: -34.003, y: 15.861, z: 13.539 },
      { x: -21.019, y: 11.132, z: 5.041 },
    ],
    gem: [
      { x: -18.741125000000004, y: 77.5919375, z: 34.9838125 },
      { x: -3.532, y: 17.638, z: 4.118 },
      { x: -9.825, y: 27.709, z: 8.731 },
      { x: -5.888, y: 16.151, z: 6.94 },
      { x: -84.119, y: 292.833, z: 114.34 },
      { x: -5.266, y: 31.714, z: 9.461 },
      { x: -84.119, y: 292.833, z: 114.34 },
      { x: -5.888, y: 16.151, z: 6.94 },
      { x: -28.15, y: 63.284, z: 35.133 },
      { x: -17.374, y: 35.447, z: 17.905 },
      { x: -28.15, y: 63.284, z: 35.133 },
      { x: -4.055, y: 8.195, z: 4.867 },
      { x: -28.15, y: 63.284, z: 35.133 },
      { x: -13.456, y: 34.281, z: 19.415 },
      { x: -31.691, y: 98.796, z: 60.496 },
      { x: -5.312, y: 12.13, z: 8.239 },
      { x: -31.691, y: 98.796, z: 60.496 },
      { x: -11.225, y: 47.866, z: 33.114 },
      { x: -31.691, y: 98.796, z: 60.496 },
      { x: -46.024, y: 237.15, z: 113.322 },
      { x: -26.594, y: 209.318, z: 77.684 },
      { x: -46.024, y: 237.15, z: 113.322 },
      { x: -6.562, y: 65.281, z: 27.195 },
      { x: -6.562, y: 65.281, z: 27.195 },
      { x: -0.785, y: 43.678, z: 18.781 },
    ],
    ari: [
      { x: 26.385749999999998, y: 17.72025, z: 13.57625 },
      { _id: '663b7e1c2bdcc11befd4a1a5', x: 41.77, y: 22.568, z: 16.62, absmag: 0.372, mag: 3.88, dist: 50.3018, id: 142805, ci: -0.047},
      { _id: '663b7e1c2bdcc11befd4a24c', x: 14.753, y: 8.063, z: 6.389, absmag: 1.365, mag: 2.64, dist: 17.9856, id: 144249, ci: 0.165},
      { _id: '663b7e1c2bdcc11befd4ab7b', x: 15.732, y: 9.752, z: 8.034, absmag: 0.486, mag: 2.01, dist: 20.1776, id: 160205, ci: 1.151},
      { _id: '663b7e1e2bdcc11befd4c94e', x: 33.288, y: 30.498, z: 23.262, absmag: 0.081, mag: 3.61, dist: 50.7872, id: 213523, ci: -0.1}
    ],
    aqr: [
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
        x: 46.68,
        y: -7.608,
        z: -17.308,
      },
      {
        _id: "663b7e532bdcc11befd93eab",
        hip: 114855,
        ra: 23.26485994,
        dec: -9.08773573,
        dist: 45.2645,
        x: 43.871,
        y: -8.549,
        z: -7.149,
      },
      {
        _id: "663b7e522bdcc11befd92d35",
        hip: 112961,
        ra: 22.87691,
        dec: -7.579599,
        dist: 111.9069,
        x: 106.169,
        y: -32.148,
        z: -14.761,
      },
      {
        _id: "663b7e522bdcc11befd91fa0",
        hip: 111497,
        ra: 22.589272,
        dec: -0.117498,
        dist: 54.434,
        x: 50.763,
        y: -19.65,
        z: -0.112,
      },
      {
        _id: "663b7e522bdcc11befd91a77",
        hip: 110960,
        ra: 22.480531,
        dec: -0.019972,
        dist: 28.169,
        x: 25.97,
        y: -10.912,
        z: -0.01,
      },
      {
        _id: "663b7e512bdcc11befd9149b",
        hip: 110395,
        ra: 22.360938,
        dec: -1.387331,
        dist: 50.2008,
        x: 45.636,
        y: -20.88,
        z: -1.215,
      },
      {
        _id: "663b7e512bdcc11befd90710",
        hip: 109074,
        ra: 22.09639885,
        dec: -0.31984929,
        dist: 202.2185,
        x: 177.619,
        y: -96.656,
        z: -1.129,
      },
      {
        _id: "663b7e4f2bdcc11befd8e928",
        hip: 106278,
        ra: 21.525982,
        dec: -5.571172,
        dist: 167.4261,
        x: 132.887,
        y: -100.54,
        z: -16.254,
      },
      {
        _id: "663b7e4e2bdcc11befd8bdc8",
        hip: 102618,
        ra: 20.79459785,
        dec: -9.49577641,
        dist: 63.6943,
        x: 41.97,
        y: -46.745,
        z: -10.508,
      },
      {
        _id: "663b7e4f2bdcc11befd8e928",
        hip: 106278,
        ra: 21.525982,
        dec: -5.571172,
        dist: 167.4261,
        x: 132.887,
        y: -100.54,
        z: -16.254,
      },
      {
        _id: "663b7e512bdcc11befd90710",
        hip: 109074,
        ra: 22.09639885,
        dec: -0.31984929,
        dist: 202.2185,
        x: 177.619,
        y: -96.656,
        z: -1.129,
      },
      {
        _id: "663b7e512bdcc11befd910b1",
        hip: 110003,
        ra: 22.28056584,
        dec: -7.78328831,
        dist: 58.5163,
        x: 52.202,
        y: -25.226,
        z: -7.925,
      },
      {
        _id: "663b7e512bdcc11befd907a2",
        hip: 109139,
        ra: 22.10728585,
        dec: -13.86968033,
        dist: 64.5411,
        x: 55.123,
        y: -29.793,
        z: -15.471,
      },
      {
        _id: "663b7e512bdcc11befd910b1",
        hip: 110003,
        ra: 22.28056584,
        dec: -7.78328831,
        dist: 58.5163,
        x: 52.202,
        y: -25.226,
        z: -7.925,
      },
      {
        _id: "663b7e522bdcc11befd91c07",
        hip: 111123,
        ra: 22.51078213,
        dec: -10.67796039,
        dist: 88.8099,
        x: 80.723,
        y: -33.17,
        z: -16.455,
      },
      {
        _id: "663b7e522bdcc11befd92aeb",
        hip: 112716,
        ra: 22.82652815,
        dec: -13.59262957,
        dist: 99.8288,
        x: 92.49,
        y: -29.343,
        z: -23.461,
      },
      {
        _id: "663b7e532bdcc11befd92ea6",
        hip: 113136,
        ra: 22.910837,
        dec: -15.82082,
        dist: 49.2368,
        x: 45.459,
        y: -13.325,
        z: -13.423,
      },
      {
        _id: "663b7e532bdcc11befd939fd",
        hip: 114341,
        ra: 23.157443,
        dec: -21.17241,
        dist: 78.9203,
        x: 71.81,
        y: -16.102,
        z: -28.504,
      },
    ],
    sco: [
      { x: -29.960153846153844, y: -122.941, z: -88.8423076923077 },
      { x: -16.049, y: -138.75, z: -105.65 },
      { x: -8.785, y: -114.748, z: -93.293 },
      { x: -29.202, y: -538.527, z: -454.583 },
      { x: -6.654, y: -67.017, z: -62.797 },
      { x: -3.401, y: -16.055, z: -15.432 },
      { x: -8.585, y: -29.255, z: -27.803 },
      { x: -35.433, y: -115.662, z: -94.672 },
      { x: -4.842, y: -15.396, z: -11.007 },
      { x: -45.96, y: -119.547, z: -68.721 },
      { x: -58.543, y: -140.308, z: -75.575 },
      { x: -46.814, y: -80.155, z: -45.503 },
      { x: -58.543, y: -140.308, z: -75.575 },
      { x: -69.333, y: -120.492, z: -57.928 },
      { x: -58.543, y: -140.308, z: -75.575 },
      { x: -55.881, y: -102.321, z: -41.986 },
    ],
    psc: [
      { x: 74.4677777777778, y: 19.51683333333333, z: 16.47005555555556 },
      { x: 105.454, y: 35.156, z: 50.855 },
      { x: 96.78, y: 27.212, z: 62.343 },
      { x: 82.363, y: 29.761, z: 45.131 },
      { x: 105.454, y: 35.156, z: 50.855 },
      { x: 101.738, y: 42.915, z: 30.302 },
      { x: 75.809, y: 37.547, z: 13.638 },
      { x: 41.361, y: 24.472, z: 2.364 },
      { x: 48.236, y: 26.069, z: 3.054 },
      { x: 100.757, y: 47.752, z: 10.712 },
      { x: 98.543, y: 40.911, z: 11.485 },
      { x: 53.54, y: 15.086, z: 7.709 },
      { x: 176.504, y: 37.751, z: 23.122 },
      { x: 139.669, y: 12.587, z: 20.184 },
      { x: 32.792, y: -0.099, z: 3.947 },
      { x: 13.595, y: -1.192, z: 1.344 },
      { x: 51.141, y: -7.195, z: 5.774 },
      { x: 41.496, y: -7.847, z: 2.422 },
      { x: 48.701, y: -7.076, z: 1.079 },
      { x: 31.941, y: -2.507, z: 0.996 },
      { x: 13.595, y: -1.192, z: 1.344 },
    ],
    tau: [
      { x: 25.943533333333335, y: 61.5118, z: 23.37933333333333 },
      {
        _id: "663b7e1f2bdcc11befd4e074",
        hip: 15900,
        ra: 3.4135552,
        dec: 9.02887505,
        dist: 89.2061,
        x: 55.2,
        y: 68.663,
        z: 13.999,
      },
      {
        _id: "663b7e202bdcc11befd4f8e6",
        hip: 18724,
        ra: 4.01133764,
        dec: 12.49034684,
        dist: 124.3823,
        x: 60.407,
        y: 105.349,
        z: 26.901,
      },
      {
        _id: "663b7e212bdcc11befd50633",
        hip: 20205,
        ra: 4.32988998,
        dec: 15.6276446,
        dist: 46.1584,
        x: 18.823,
        y: 40.27,
        z: 12.434,
      },
      {
        _id: "663b7e212bdcc11befd50c8a",
        hip: 20894,
        ra: 4.4777058,
        dec: 15.87088179,
        dist: 46.1042,
        x: 17.21,
        y: 40.872,
        z: 12.608,
      },
      {
        _id: "663b7e212bdcc11befd51178",
        hip: 21421,
        ra: 4.5986668,
        dec: 16.50976164,
        dist: 20.4332,
        x: 7.027,
        y: 18.288,
        z: 5.807,
      },
      {
        _id: "663b7e242bdcc11befd547f6",
        hip: 26451,
        ra: 5.627413,
        dec: 21.142549,
        dist: 136.4256,
        x: 12.392,
        y: 126.638,
        z: 49.207,
      },
      {
        _id: "663b7e212bdcc11befd51178",
        hip: 21421,
        ra: 4.5986668,
        dec: 16.50976164,
        dist: 20.4332,
        x: 7.027,
        y: 18.288,
        z: 5.807,
      },
      {
        _id: "663b7e212bdcc11befd50c7e",
        hip: 20889,
        ra: 4.47694409,
        dec: 19.18043252,
        dist: 44.712,
        x: 16.396,
        y: 38.917,
        z: 14.69,
      },
      {
        _id: "663b7e222bdcc11befd515d4",
        hip: 21881,
        ra: 4.70408391,
        dec: 22.95694022,
        dist: 122.1001,
        x: 37.416,
        y: 106.021,
        z: 47.624,
      },
      {
        _id: "663b7e242bdcc11befd53bb7",
        hip: 25428,
        ra: 5.43819387,
        dec: 28.60787346,
        dist: 41.0509,
        x: 5.282,
        y: 35.65,
        z: 19.655,
      },
      {
        _id: "663b7e222bdcc11befd515d4",
        hip: 21881,
        ra: 4.70408391,
        dec: 22.95694022,
        dist: 122.1001,
        x: 37.416,
        y: 106.021,
        z: 47.624,
      },
      {
        _id: "663b7e212bdcc11befd50c7e",
        hip: 20889,
        ra: 4.47694409,
        dec: 19.18043252,
        dist: 44.712,
        x: 16.396,
        y: 38.917,
        z: 14.69,
      },
      {
        _id: "663b7e212bdcc11befd50a34",
        tyc: "1269-1246-1",
        ra: 4.42482999,
        dec: 17.92790534,
        dist: 47.4237,
        x: 18.084,
        y: 41.339,
        z: 14.598,
      },
      {
        _id: "663b7e212bdcc11befd50868",
        hip: 20455,
        ra: 4.38224798,
        dec: 17.54251527,
        dist: 49.2388,
        x: 19.295,
        y: 42.801,
        z: 14.841,
      },
      {
        _id: "663b7e202bdcc11befd4f136",
        hip: 17847,
        ra: 3.81937298,
        dec: 24.05341343,
        dist: 123.1762,
        x: 60.782,
        y: 94.643,
        z: 50.205,
      },
    ],
    cnc: [
      { x: -37.501000000000005, y: 44.46088888888889, z: 21.989111111111114 },
      {
        _id: "663b7e2f2bdcc11befd616fe",
        hip: 40526,
        ra: 8.27525572,
        dec: 9.1855446,
        dist: 98.9845,
        x: -54.824,
        y: 80.886,
        z: 15.801,
      },
      {
        _id: "663b7e302bdcc11befd63726",
        hip: 42911,
        ra: 8.74475018,
        dec: 18.15430914,
        dist: 40.032,
        x: -25.042,
        y: 28.634,
        z: 12.473,
      },
      {
        _id: "663b7e302bdcc11befd63726",
        hip: 42911,
        ra: 8.74475018,
        dec: 18.15430914,
        dist: 40.032,
        x: -25.042,
        y: 28.634,
        z: 12.473,
      },
      {
        _id: "663b7e302bdcc11befd635ae",
        hip: 42806,
        ra: 8.72142952,
        dec: 21.46849861,
        dist: 53.6392,
        x: -32.631,
        y: 37.775,
        z: 19.631,
      },
      {
        _id: "663b7e302bdcc11befd6395e",
        hip: 43103,
        ra: 8.77828306,
        dec: 28.75990042,
        dist: 101.5228,
        x: -59.175,
        y: 66.477,
        z: 48.847,
      },
      {
        _id: "663b7e302bdcc11befd635ae",
        hip: 42806,
        ra: 8.72142952,
        dec: 21.46849861,
        dist: 53.6392,
        x: -32.631,
        y: 37.775,
        z: 19.631,
      },
      {
        _id: "663b7e2f2bdcc11befd61b46",
        hip: 40843,
        ra: 8.33440576,
        dec: 27.21770692,
        dist: 18.2233,
        x: -9.299,
        y: 13.272,
        z: 8.335,
      },
      {
        _id: "663b7e302bdcc11befd6395e",
        hip: 43103,
        ra: 8.77828306,
        dec: 28.75990042,
        dist: 101.5228,
        x: -59.175,
        y: 66.477,
        z: 48.847,
      },
      {
        _id: "663b7e312bdcc11befd64555",
        hip: 44066,
        ra: 8.9747827,
        dec: 11.85768694,
        dist: 57.7367,
        x: -39.69,
        y: 40.218,
        z: 11.864,
      },
    ],
    vir: [
      {
        x: -48.40464705882353,
        y: -16.85235294117647,
        z: -1.2731176470588232
      },
      {
        _id: "663b7e3c2bdcc11befd74ae6",
        hip: 71957,
        ra: 14.717673,
        dec: -5.658207,
        dist: 18.2715,
        x: -13.771,
        y: -11.872,
        z: -1.801,
      },
      {
        _id: "663b7e3c2bdcc11befd737a9",
        hip: 69701,
        ra: 14.266908,
        dec: -6.000547,
        dist: 22.237,
        x: -18.334,
        y: -12.368,
        z: -2.325,
      },
      {
        _id: "663b7e3b2bdcc11befd73560",
        hip: 69427,
        ra: 14.21492928,
        dec: -10.2737004,
        dist: 86.2979,
        x: -71.034,
        y: -46.526,
        z: -15.391,
      },
      {
        _id: "663b7e3a2bdcc11befd713bc",
        hip: 65474,
        ra: 13.41989015,
        dec: -11.16124491,
        dist: 76.5697,
        x: -69.991,
        y: -27.286,
        z: -14.822,
      },
      {
        _id: "663b7e3a2bdcc11befd71a54",
        hip: 66249,
        ra: 13.57822,
        dec: -0.59582,
        dist: 22.7118,
        x: -20.799,
        y: -9.119,
        z: -0.236,
      },
      {
        _id: "663b7e3b2bdcc11befd72d84",
        hip: 68520,
        ra: 14.02744238,
        dec: 1.54453325,
        dist: 69.5262,
        x: -59.938,
        y: -35.182,
        z: 1.874,
      },
      {
        _id: "663b7e3c2bdcc11befd74d43",
        hip: 72220,
        ra: 14.77081222,
        dec: 1.89288176,
        dist: 41.1838,
        x: -30.798,
        y: -27.308,
        z: 1.36,
      },
      {
        _id: "663b7e3b2bdcc11befd72d84",
        hip: 68520,
        ra: 14.02744238,
        dec: 1.54453325,
        dist: 69.5262,
        x: -59.938,
        y: -35.182,
        z: 1.874,
      },
      {
        _id: "663b7e3a2bdcc11befd71a54",
        hip: 66249,
        ra: 13.57822,
        dec: -0.59582,
        dist: 22.7118,
        x: -20.799,
        y: -9.119,
        z: -0.236,
      },
      {
        _id: "663b7e392bdcc11befd6ff74",
        hip: 63090,
        ra: 12.92672454,
        dec: 3.39747144,
        dist: 60.8273,
        x: -58.942,
        y: -14.588,
        z: 3.605,
      },
      {
        _id: "663b7e392bdcc11befd703cd",
        hip: 63608,
        ra: 13.03627731,
        dec: 10.95914863,
        dist: 33.1006,
        x: -31.308,
        y: -8.709,
        z: 6.293,
      },
      {
        _id: "663b7e392bdcc11befd6ff74",
        hip: 63090,
        ra: 12.92672454,
        dec: 3.39747144,
        dist: 60.8273,
        x: -58.942,
        y: -14.588,
        z: 3.605,
      },
      {
        _id: "663b7e392bdcc11befd6f621",
        hip: 61941,
        ra: 12.694345,
        dec: -1.449375,
        dist: 11.685,
        x: -11.489,
        y: -2.112,
        z: -0.296,
      },
      {
        _id: "663b7e3a2bdcc11befd713bc",
        hip: 65474,
        ra: 13.41989015,
        dec: -11.16124491,
        dist: 76.5697,
        x: -69.991,
        y: -27.286,
        z: -14.822,
      },
      {
        _id: "663b7e392bdcc11befd6f621",
        hip: 61941,
        ra: 12.694345,
        dec: -1.449375,
        dist: 11.685,
        x: -11.489,
        y: -2.112,
        z: -0.296,
      },
      {
        _id: "663b7e382bdcc11befd6e6c9",
        hip: 60030,
        ra: 12.31119956,
        dec: -0.78718713,
        dist: 114.9812,
        x: -114.589,
        y: -9.356,
        z: -1.58,
      },
      {
        _id: "663b7e372bdcc11befd6d03e",
        hip: 57380,
        ra: 11.76432288,
        dec: 6.52938127,
        dist: 101.5783,
        x: -100.727,
        y: 6.223,
        z: 11.551,
      },
    ],
    lib: [
      {
        x: -30.863166666666668,
        y: -38.12066666666667,
        z: -14.967333333333334
      },
      {
        _id: "663b7e3f2bdcc11befd781cb",
        hip: 77853,
        ra: 15.89709401,
        dec: -16.72929324,
        dist: 51.6529,
        x: -25.878,
        y: -42.158,
        z: -14.868,
      },
      {
        _id: "663b7e3e2bdcc11befd77344",
        hip: 76333,
        ra: 15.592105,
        dec: -14.789537,
        dist: 49.3601,
        x: -28.132,
        y: -38.552,
        z: -12.6,
      },
      {
        _id: "663b7e3d2bdcc11befd7648b",
        hip: 74785,
        ra: 15.283449,
        dec: -9.382917,
        dist: 56.7537,
        x: -36.549,
        y: -42.42,
        z: -9.253,
      },
      {
        _id: "663b7e3d2bdcc11befd750ab",
        hip: 72622,
        ra: 14.84797594,
        dec: -16.04177696,
        dist: 23.2396,
        x: -16.409,
        y: -15.152,
        z: -6.422,
      },
      {
        _id: "663b7e3d2bdcc11befd75a8b",
        hip: 73714,
        ra: 15.06783762,
        dec: -25.28196292,
        dist: 79.7534,
        x: -50.079,
        y: -51.89,
        z: -34.061,
      },
      {
        _id: "663b7e3e2bdcc11befd77344",
        hip: 76333,
        ra: 15.592105,
        dec: -14.789537,
        dist: 49.3601,
        x: -28.132,
        y: -38.552,
        z: -12.6,
      },
    ],
    sgr: [
      {
        _id: "663b7e492bdcc11befd8572b",
        hip: 95294,
        ra: 19.38698243,
        dec: -44.79978637,
        dist: 42.806,
        x: 10.788,
        y: -28.394,
        z: -30.162,
      },
      {
        _id: "663b7e4b2bdcc11befd87e30",
        hip: 98032,
        ra: 19.921027,
        dec: -41.86827352,
        dist: 55.7414,
        x: 20.007,
        y: -36.37,
        z: -37.203,
      },
      {
        _id: "663b7e492bdcc11befd857e7",
        hip: 95347,
        ra: 19.39810471,
        dec: -40.61593839,
        dist: 55.2218,
        x: 15.003,
        y: -39.142,
        z: -35.949,
      },
      {
        _id: "663b7e4b2bdcc11befd87e30",
        hip: 98032,
        ra: 19.921027,
        dec: -41.86827352,
        dist: 55.7414,
        x: 20.007,
        y: -36.37,
        z: -37.203,
      },
      {
        _id: "663b7e4b2bdcc11befd883a8",
        hip: 98412,
        ra: 19.99560529,
        dec: -35.27630705,
        dist: 205.6676,
        x: 83.784,
        y: -145.504,
        z: -118.777,
      },
      {
        _id: "663b7e4b2bdcc11befd8877f",
        hip: 98688,
        ra: 20.04429991,
        dec: -27.70984656,
        dist: 137.5942,
        x: 62.126,
        y: -104.781,
        z: -63.981,
      },
      {
        _id: "663b7e492bdcc11befd8667f",
        hip: 96406,
        ra: 19.60045931,
        dec: -24.71908406,
        dist: 81.1725,
        x: 29.999,
        y: -67.356,
        z: -33.944,
      },
      {
        _id: "663b7e482bdcc11befd843bd",
        hip: 93864,
        ra: 19.11566829,
        dec: -27.67042392,
        dist: 37.2856,
        x: 9.508,
        y: -31.623,
        z: -17.315,
      },
      {
        _id: "663b7e472bdcc11befd83606",
        hip: 92855,
        ra: 18.92108797,
        dec: -26.29659428,
        dist: 69.8324,
        x: 14.951,
        y: -60.794,
        z: -30.937,
      },
      {
        _id: "663b7e482bdcc11befd838ef",
        hip: 93085,
        ra: 18.962167,
        dec: -21.10665345,
        dist: 118.917,
        x: 27.65,
        y: -107.438,
        z: -42.823,
      },
      {
        _id: "663b7e482bdcc11befd84128",
        hip: 93683,
        ra: 19.07805048,
        dec: -21.7414935,
        dist: 41.9955,
        x: 10.864,
        y: -37.465,
        z: -15.556,
      },
      {
        _id: "663b7e492bdcc11befd85097",
        hip: 94820,
        ra: 19.29391079,
        dec: -18.95291023,
        dist: 147.5524,
        x: 46.374,
        y: -131.622,
        z: -47.924,
      },
      {
        _id: "663b7e492bdcc11befd85578",
        hip: 95168,
        ra: 19.36121085,
        dec: -17.84720025,
        dist: 39.9982,
        x: 13.283,
        y: -35.681,
        z: -12.259,
      },
      {
        _id: "663b7e492bdcc11befd85097",
        hip: 94820,
        ra: 19.29391079,
        dec: -18.95291023,
        dist: 147.5524,
        x: 46.374,
        y: -131.622,
        z: -47.924,
      },
      {
        _id: "663b7e482bdcc11befd84128",
        hip: 93683,
        ra: 19.07805048,
        dec: -21.7414935,
        dist: 41.9955,
        x: 10.864,
        y: -37.465,
        z: -15.556,
      },
      {
        _id: "663b7e482bdcc11befd838ef",
        hip: 93085,
        ra: 18.962167,
        dec: -21.10665345,
        dist: 118.917,
        x: 27.65,
        y: -107.438,
        z: -42.823,
      },
      {
        _id: "663b7e472bdcc11befd83606",
        hip: 92855,
        ra: 18.92108797,
        dec: -26.29659428,
        dist: 69.8324,
        x: 14.951,
        y: -60.794,
        z: -30.937,
      },
      {
        _id: "663b7e472bdcc11befd82ab7",
        hip: 92041,
        ra: 18.76094075,
        dec: -26.99077697,
        dist: 73.3676,
        x: 12.938,
        y: -64.084,
        z: -33.298,
      },
      {
        _id: "663b7e482bdcc11befd83eb2",
        hip: 93506,
        ra: 19.043532,
        dec: -29.880105,
        dist: 27.0416,
        x: 6.326,
        y: -22.578,
        z: -13.472,
      },
      {
        _id: "663b7e482bdcc11befd843bd",
        hip: 93864,
        ra: 19.11566829,
        dec: -27.67042392,
        dist: 37.2856,
        x: 9.508,
        y: -31.623,
        z: -17.315,
      },
      {
        _id: "663b7e472bdcc11befd82ab7",
        hip: 92041,
        ra: 18.76094075,
        dec: -26.99077697,
        dist: 73.3676,
        x: 12.938,
        y: -64.084,
        z: -33.298,
      },
      {
        _id: "663b7e452bdcc11befd8118f",
        hip: 90185,
        ra: 18.40287398,
        dec: -34.3843146,
        dist: 43.9367,
        x: 3.817,
        y: -36.058,
        z: -24.813,
      },
      {
        _id: "663b7e452bdcc11befd809a6",
        hip: 89642,
        ra: 18.29378698,
        dec: -36.76168819,
        dist: 44.7427,
        x: 2.754,
        y: -35.739,
        z: -26.778,
      },
      {
        _id: "663b7e452bdcc11befd8118f",
        hip: 90185,
        ra: 18.40287398,
        dec: -34.3843146,
        dist: 43.9367,
        x: 3.817,
        y: -36.058,
        z: -24.813,
      },
      {
        _id: "663b7e442bdcc11befd7fb5c",
        hip: 88635,
        ra: 18.09680182,
        dec: -30.42409858,
        dist: 29.7,
        x: 0.649,
        y: -25.602,
        z: -15.04,
      },
      {
        _id: "663b7e432bdcc11befd7e698",
        hip: 87072,
        ra: 17.7926735,
        dec: -27.83079164,
        dist: 356.4158,
        x: -17.099,
        y: -314.725,
        z: -166.397,
      },
      {
        _id: "663b7e442bdcc11befd7fb5c",
        hip: 88635,
        ra: 18.09680182,
        dec: -30.42409858,
        dist: 29.7,
        x: 0.649,
        y: -25.602,
        z: -15.04,
      },
      {
        _id: "663b7e452bdcc11befd80dd5",
        hip: 89931,
        ra: 18.34990047,
        dec: -29.8281024,
        dist: 127.441,
        x: 10.113,
        y: -110.094,
        z: -63.389,
      },
      {
        _id: "663b7e452bdcc11befd8118f",
        hip: 90185,
        ra: 18.40287398,
        dec: -34.3843146,
        dist: 43.9367,
        x: 3.817,
        y: -36.058,
        z: -24.813,
      },
      {
        _id: "663b7e452bdcc11befd80dd5",
        hip: 89931,
        ra: 18.34990047,
        dec: -29.8281024,
        dist: 127.441,
        x: 10.113,
        y: -110.094,
        z: -63.389,
      },
      {
        _id: "663b7e472bdcc11befd82ab7",
        hip: 92041,
        ra: 18.76094075,
        dec: -26.99077697,
        dist: 73.3676,
        x: 12.938,
        y: -64.084,
        z: -33.298,
      },
      {
        _id: "663b7e462bdcc11befd81624",
        hip: 90496,
        ra: 18.46617795,
        dec: -25.42170006,
        dist: 23.2993,
        x: 2.562,
        y: -20.887,
        z: -10.002,
      },
      {
        _id: "663b7e452bdcc11befd804f4",
        hip: 89341,
        ra: 18.229392,
        dec: -21.058834,
      },
      {
        _id: "663b7e462bdcc11befd81624",
        hip: 90496,
        ra: 18.46617795,
        dec: -25.42170006,
        dist: 23.2993,
        x: 2.562,
        y: -20.887,
        z: -10.002,
      },
      {
        _id: "663b7e452bdcc11befd80dd5",
        hip: 89931,
        ra: 18.34990047,
        dec: -29.8281024,
        dist: 127.441,
        x: 10.113,
        y: -110.094,
        z: -63.389,
      },
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
