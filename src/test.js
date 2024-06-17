import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';

let scene, camera, renderer, controls;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
    camera.position.set(0, 0, 10);

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
        moveCameraToConstellation(stars);
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
}

function moveCameraToConstellation(stars) {
    if (stars.length === 0) return;

    const boundingBox = new THREE.Box3();
    stars.forEach(star => {
        const starPosition = new THREE.Vector3(star.y0, star.z0, star.x0);
        boundingBox.expandByPoint(starPosition);
    });

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const size = boundingBox.getSize(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize * 1.5;

    const direction = new THREE.Vector3(0, 0, 1);
    const position = center.clone().add(direction.multiplyScalar(distance));

    camera.position.copy(position);
    controls.target.copy(center);
    controls.update();
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
