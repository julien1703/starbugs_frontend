import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';

// Create the scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 200); // Position the camera to see the whole constellation

// Create the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('sky-container').appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.enablePan = true; // Enable panning

// Allow full 360-degree rotation
controls.minAzimuthAngle = -Infinity; // No limit on horizontal rotation
controls.maxAzimuthAngle = Infinity;  // No limit on horizontal rotation
controls.minPolarAngle = 0;           // No limit on vertical rotation
controls.maxPolarAngle = Math.PI;     // No limit on vertical rotation

// Function to create stars
function createStar(x, y, z, magnitude) {
    const geometry = new THREE.SphereGeometry(0.5 * (8 - magnitude), 24, 24); // Smaller size for realistic stars
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geometry, material);
    star.position.set(x, y, z);
    scene.add(star);
    return star;
}

// Function to convert RA/Dec to 3D coordinates on a sphere
function convertRaDecTo3D(ra, dec, distance) {
    const raRad = ra * (Math.PI / 12); // Convert RA to radians
    const decRad = dec * (Math.PI / 180); // Convert Dec to radians
    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.cos(decRad) * Math.sin(raRad);
    const z = distance * Math.sin(decRad);
    return { x, y, z };
}

// Function to create connections between stars
function createConnections(connections, starsMap) {
    connections.forEach(connection => {
        const fromStar = starsMap[connection.from];
        const toStar = starsMap[connection.to];

        if (fromStar && toStar) {
            const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const points = [];
            points.push(new THREE.Vector3(fromStar.position.x, fromStar.position.y, fromStar.position.z));
            points.push(new THREE.Vector3(toStar.position.x, toStar.position.y, toStar.position.z));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            scene.add(line);
        }
    });
}

// Fetch star data and create stars and connections
async function fetchStars(constellation) {
    const API_URL = `https://api.julien-offray.de/constellation?constellation=${constellation}`;
    try {
        const response = await axios.get(API_URL);
        const { stars, connections } = response.data;
        clearStars();

        const starsMap = {};
        stars.forEach(star => {
            const { x, y, z } = convertRaDecTo3D(star.ra, star.dec, 200); // Adjust distance for better visibility
            const starMesh = createStar(x, y, z, star.mag);
            starsMap[star.proper] = starMesh;
        });

        createConnections(connections, starsMap);
    } catch (error) {
        console.error("Error fetching star data:", error);
    }
}

// Clear previous stars from the scene
function clearStars() {
    while (scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

export { fetchStars, clearStars, convertRaDecTo3D, createStar };
