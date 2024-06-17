import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';

let scene, camera, renderer, controls;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
    camera.position.set(0, 0, 0.00001);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    fetchStars('leo');
    window.addEventListener('resize', onWindowResize, false);
}

async function fetchStars(constellation) {
    try {
        const response = await axios.get(`https://api.julien-offray.de/constellation?constellation=${constellation}`);
        const { stars, connections } = response.data;
        addStars(stars);
        animate();
    } catch (error) {
        console.error("Error fetching star data:", error);
    }
}

function addStars(stars) {
    stars.forEach(star => {
        const geometry = new THREE.SphereGeometry(3, 24, 24);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const starMesh = new THREE.Mesh(geometry, material);
        starMesh.position.set(star.x0, star.y0, star.z0);
        scene.add(starMesh);
    });

    const firstStar = stars[0];
    if (firstStar) {
        const lookatPosition = new THREE.Vector3(firstStar.x0, firstStar.y0, firstStar.z0);
        controls.target.set(lookatPosition);
        controls.update();
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
