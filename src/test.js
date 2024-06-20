console.log('Script loaded and running.');
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';

let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

init();

function init() {
    console.log('Script loaded and running.');

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

    // Event-Listener für Maus-Klicks hinzufügen
    renderer.domElement.addEventListener('click', onMouseClick, false);

    // Test-Log, um sicherzustellen, dass der Event-Listener registriert wird
    console.log('Event listener registered for mouse clicks.');
}

async function fetchStars(constellation) {
    try {
        const response = await axios.get(`https://api.julien-offray.de/constellation?constellation=${constellation}`);
        const { stars, connections } = response.data;
        addStars(stars, constellation);
        moveCameraToConstellation(stars);
        animate();
    } catch (error) {
        console.error("Error fetching star data:", error);
    }
}

function addStars(stars, constellation) {
    stars.forEach(star => {
        // Vergrößere die Geometrie der Sterne, um die Erkennungsfläche zu vergrößern
        const geometry = new THREE.SphereGeometry(10, 24, 24); // Erhöhe die Größe der Sterne
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const starMesh = new THREE.Mesh(geometry, material);
        starMesh.position.set(star.x0, star.y0, star.z0);
        starMesh.userData.constellation = constellation; // Sternbildinformationen hinzufügen
        scene.add(starMesh);
    });
}

function moveCameraToConstellation(stars) {
    if (stars.length === 0) return;
    const firstStar = stars[0];
    if (firstStar) {
        const targetPosition = new THREE.Vector3(firstStar.y0, firstStar.z0, firstStar.x0);
        controls.target = targetPosition;
        camera.position.copy(targetPosition.clone().add(new THREE.Vector3(0.01, 0.01, 0.01)));
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

function onMouseClick(event) {
    // Test-Log, um sicherzustellen, dass der Event-Listener funktioniert
    console.log('Mouse click detected.');

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const firstObject = intersects[0].object;
        if (firstObject.userData.constellation) {
            console.log(`Clicked on constellation: ${firstObject.userData.constellation}`);
        } else {
            console.log('Clicked on an object without constellation data.');
        }
    } else {
        console.log('No intersections detected.');
    }
}
