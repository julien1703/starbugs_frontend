<script>
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";
  import axios from "axios";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { arrays } from "./components/arrays.js";
  import leo from "../Sternbilder/leo.webp";
  import vir from "../Sternbilder/vir.webp";
  import lib from "../Sternbilder/lib.webp";
  import sco from "../Sternbilder/sco.webp";
  import sgr from "../Sternbilder/sgr.webp";
  import cap from "../Sternbilder/cap.webp";
  import aqr from "../Sternbilder/aqr.webp";
  import psc from "../Sternbilder/psc.webp";
  import ori from "../Sternbilder/ori.webp";
  import gem from "../Sternbilder/gem.webp";
  import tau from "../Sternbilder/tau.webp";
  import cnc from "../Sternbilder/cnc.webp";
  import ari from "../Sternbilder/ari.webp";

  let starsign = "";
  let starsignFullName = "";
  let description = "";
  let imagePath = "";
  let camera, scene, renderer, controls;
  let lineGroup = new THREE.Group();
  const maxMag = 8;
  const minRadius = 0.17;
  const maxRadius = 1587.37;
  const minNewRadius = 0.05;
  const maxNewRadius = 0.3;

  const starsignNames = {
    leo: "Löwe",
    vir: "Jungfrau",
    lib: "Waage",
    sco: "Skorpion",
    sgr: "Schütze",
    cap: "Steinbock",
    aqr: "Wassermann",
    psc: "Fische",
    ori: "Orion",
    gem: "Zwillinge",
    tau: "Stier",
    cnc: "Krebs",
    ari: "Widder"
  };

  onMount(async () => {
    const hashFragment = window.location.hash.substring(1);
    hashFragment.split("/").forEach((fragment) => {
      starsign = fragment;
      starsignFullName = starsignNames[fragment] || "Unbekanntes Sternzeichen";
    });

    // Generate text based on the starsign
    try {
      await generateDescription(starsign);
    } catch (error) {
      console.error("Fehler beim Generieren des Textes:", error);
      description = "Es gab einen Fehler bei der Textgenerierung.";
    }

    // Set the image path based on the starsign
    switch (starsign) {
      case "leo":
        imagePath = leo;
        break;
      case "vir":
        imagePath = vir;
        break;
      case "lib":
        imagePath = lib;
        break;
      case "sco":
        imagePath = sco;
        break;
      case "sgr":
        imagePath = sgr;
        break;
      case "cap":
        imagePath = cap;
        break;
      case "aqr":
        imagePath = aqr;
        break;
      case "psc":
        imagePath = psc;
        break;
      case "ori":
        imagePath = ori;
        break;
      case "gem":
        imagePath = gem;
        break;
      case "tau":
        imagePath = tau;
        break;
      case "cnc":
        imagePath = cnc;
        break;
      case "ari":
        imagePath = ari;
        break;
      default:
        console.error("Sternzeichen nicht erkannt");
        break;
    }
    console.log(`Bildpfad: ${imagePath}`);
    init();
    getConstellationStars(starsign).then((stars) => {
      addStars(stars);
      addConstellationLines(stars);
      scene.add(lineGroup);
    });
  });

  async function generateDescription(starsign) {
    const response = await axios.post('http://localhost:3000/api/generate-text-stream', { starsign });
    const reader = response.data.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      description += chunk;
    }
  }

  function init() {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    camera.position.z = 0.0001;

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('three-container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    animate();
  }

  async function getConstellationStars(starsign) {
    const data = arrays[starsign];
    console.log(`Sternen-Daten für ${starsign}:`, data);
    return data;
  }

  async function customLookAtControls(x, y, z) {
    const controlPosition = camera.position;
    console.log("Kameraposition:", camera?.position);
    console.log("Ziel der OrbitControls:", controls?.target);

    let dirVector = {
      x: x - controlPosition.x,
      y: y - controlPosition.y,
      z: z - controlPosition.z,
    };

    let length = Math.sqrt(
      dirVector.x ** 2 + dirVector.y ** 2 + dirVector.z ** 2
    );

    dirVector.x /= length;
    dirVector.y /= length;
    dirVector.z /= length;

    const distance = 0.01;

    let newPoint2 = {
      x: controlPosition.x + dirVector.x * distance,
      y: controlPosition.y + dirVector.y * distance,
      z: controlPosition.z + dirVector.z * distance,
    };
    console.log(newPoint2);
    controls.target.copy(new THREE.Vector3(newPoint2.x, newPoint2.y, newPoint2.z));
    controls.update();
  }

  function addStars(stars) {
    if (stars.length === 0) {
      console.error("Keine gültigen Sterndaten verfügbar.");
      return;
    }

    stars.forEach((star) => {
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
      sphere.userData.starData = { ...star };

      scene.add(sphere);
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
      const material = new THREE.LineBasicMaterial({ color: 0xffffff });
      const line = new THREE.Line(geometry, material);
      lineGroup.add(line);
    }
    customLookAtControls(stars[0].y, stars[0].z, stars[0].x);
  }

  function getColorByCI(ci) {
    if (ci < 0)
      return 0x9db4ff;
    else if (ci < 0.5)
      return 0xbcd2ff;
    else if (ci < 1.0)
      return 0xfbfbfb;
    else if (ci < 1.5)
      return 0xfff4ea;
    else return 0xffd2a1;
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
        const wasVisible = object.visible;
        object.visible = frustum.intersectsObject(object);
        if (
          object.userData.starData &&
          object.userData.starData.id !== undefined
        ) {
          if (object.visible !== wasVisible) {
            // console.log(`Visibility changed for star: ${object.userData.starData.id}, now visible: ${object.visible}`);
          }
        }
      }
    });
  }
</script>

<style>
  body {
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: white;
    background-color: #001f3f;
    background-image: linear-gradient(to bottom right, #001f3f, #001f3f 50%, #111 100%);
  }

  #container {
    position: relative;
    display: flex;
    flex-direction: row;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }

  #sidebar {
    position: relative;
    width: 40%;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    background-color: rgba(10, 10, 20, 0.9);
    z-index: 10;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.7);
    overflow-y: auto;
    border-right: 1px solid #0a0a14;
  }

  #three-container {
    position: relative;
    top: 0;
    left: 0;
    width: 60%;
    height: 100vh;
    z-index: 1;
  }

  h1 {
    margin: 0;
    font-size: 2.5em;
    color: #ffcc00;
    text-shadow: 0 0 2px rgba(255, 204, 0, 0.7);
    border-bottom: 2px solid #ffcc00;
    padding-bottom: 10px;
  }

  p {
    margin-top: 20px;
    font-size: 1 em;
    line-height: 1.6em;
    text-align: justify;
    color: #ddd;
  }

  .star-image {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    margin-top: 20px;
    border: 1px solid #ffcc00;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
  }

  .button {
    background-color: #ffcc00;
    border: none;
    color: #001f3f;
    padding: 10px 20px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 1em;
    margin: 20px 0;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s, transform 0.3s;
  }

  .button:hover {
    background-color: #ffaa00;
    transform: scale(1.05);
  }

  .button:active {
    background-color: #cc8800;
  }

  .icon {
    width: 50px;
    height: 50px;
    background-image: url("/mnt/data/{starsign}.webp");
    background-size: cover;
    margin-bottom: 20px;
  }
</style>

<div id="container">
  <header>
  </header>
  <div id="sidebar">
    <div class="icon"></div>
    <h1>{starsignFullName}</h1>
    <p>{description}</p>
    <img src="{imagePath}" alt="{starsign} Bild" class="star-image" />
    <button class="button" on:click="{() => push('/')}">Zurück</button>
  </div>
  <div id="three-container"></div>
</div>
