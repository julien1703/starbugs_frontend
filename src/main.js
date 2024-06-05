import './app.css';
import App from './App.svelte';
import './sky.js'; // Importing sky.js to initialize the 3D scene

const app = new App({
  target: document.getElementById('app'),
});

export default app;
