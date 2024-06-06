// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import axios from 'axios';

// // Create the scene
// const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x000000); // Ensure the background is black

// // Create a camera
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
// camera.position.set(0, 0, 300); // Set initial position

// // Create the renderer
// const renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.getElementById('sky-container').appendChild(renderer.domElement);

// // Add orbit controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
// controls.dampingFactor = 0.25;
// controls.enableZoom = true; // Enable zoom
// controls.enablePan = true; // Enable panning
// controls.autoRotate = false; // Disable auto rotation

// // Function to create stars with color and size
// function createStar(x, y, z, magnitude, color) {
//     const size = 3; // Larger size for brighter stars
//     const geometry = new THREE.SphereGeometry(size, 24, 24);
//     // const starColor = color ? parseInt(color.replace('#', ''), 16) : 0xffffff; // Default to white if color is undefined
//     const material = new THREE.MeshBasicMaterial({ color: 'white' });
//     const star = new THREE.Mesh(geometry, material);
//     star.position.set(x, y, z);
//     scene.add(star);
//     return star;
// }

// // Function to create connections between stars
// function createConnections(connections, starsMap) {
//     connections.forEach(connection => {
//         const fromStar = starsMap[connection.from];
//         const toStar = starsMap[connection.to];

//         if (fromStar && toStar) {
//             const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 }); // Thicker red line
//             const points = [];
//             points.push(new THREE.Vector3(fromStar.position.x, fromStar.position.y, fromStar.position.z));
//             points.push(new THREE.Vector3(toStar.position.x, toStar.position.y, toStar.position.z));
//             const geometry = new THREE.BufferGeometry().setFromPoints(points);
//             const line = new THREE.Line(geometry, material);
//             scene.add(line);
//         }
//     });
// }

// // Fetch star data and create stars and connections
// async function fetchStars(constellation) {
//     const API_URL = `https://api.julien-offray.de/constellation?constellation=${constellation}`;
//     try {
//         const response = await axios.get(API_URL);
//         const { stars, connections } = response.data;
//         clearStars();
//         console.log(response.data);

//         const starsMap = {};
//         stars.forEach(star => {
//             const x = star.x0 * 50; // Adjust the scale for better visibility
//             const y = star.y0 * 50;
//             const z = star.z0 * 50;
//             const starMesh = createStar(x, y, z, star.mag, star.color);
//             starsMap[star.proper] = starMesh;
//         });
//         console.log(starsMap);

//         createConnections(connections, starsMap);

//         // Center the constellation
//         centerConstellation(starsMap);
//     } catch (error) {
//         console.error("Error fetching star data:", error);
//     }
// }

// // Function to center the constellation
// function centerConstellation(starsMap) {
//     const positions = Object.values(starsMap).map(star => star.position);
//     const centroid = new THREE.Vector3();

//     positions.forEach(pos => {
//         centroid.add(pos);
//     });

//     centroid.divideScalar(positions.length);

//     const offset = new THREE.Vector3(-centroid.x, -centroid.y, -centroid.z);
//     Object.values(starsMap).forEach(star => {
//         star.position.add(offset);
//     });

//     // Center the camera on the constellation
//     camera.position.set(offset.x, offset.y, 300);
//     controls.target.set(offset.x, offset.y, offset.z);
//     controls.update();
// }

// // Clear previous stars from the scene
// function clearStars() {
//     while (scene.children.length > 0) {
//         scene.remove(scene.children[0]);
//     }
// }

// // Animation loop
// function animate() {
//     requestAnimationFrame(animate);
//     controls.update();
//     renderer.render(scene, camera);
// }

// animate();

// // Handle window resize
// window.addEventListener('resize', () => {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// });

// export { fetchStars, clearStars };
