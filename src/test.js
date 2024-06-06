import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';
import { onMount } from 'svelte';

let scene, camera, renderer, controls;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Ensure the background is black
    
    // Create a camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
    camera.position.set(0, 0, 0.00001); // Set initial position

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    fetchStars('leo');
}


async function fetchStars(constellation) {
    try {
        const response = await axios.get(`https://api.julien-offray.de/constellation?constellation=${constellation}`);
        const { stars, connections } = response.data;
        console.log(response.data);
        addStars(stars);
        animate();
    } catch (error) {
        console.error("Error fetching star data:", error);
    }
}


async function addStars(stars) {
    console.log(stars);
    stars.forEach(star => {
        let geometry;
        geometry = new THREE.SphereGeometry(3, 24, 24);

        const material = new THREE.MeshStandardMaterial( { color: 0xff0000});

        const starMesh = new THREE.Mesh(geometry, material);
        starMesh.position.set(star.x0, star.y0, star.z0);

        // if(in Sternzeichen drin) {
        //     starMesh.userData.starData = {

        //     }
        
        // }
        scene.add(starMesh);
    });
    console.log("Stars added to scene");
    let lookatPosition = new THREE.Vector3(
        stars[0].x0,
        stars[0].y0,
        stars[0].z0
    );
    controls.target.set(lookatPosition);
    controls.update();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}