<script>
    import Filters from "./components/Filters.svelte";
    import { resultsStore } from "./store.js";
    import { onMount } from "svelte";
    import axios from "axios";
    import { createStars, drawStars } from "./sky.js";
  
    let stars = [];
  
    async function fetchStars(constellation) {
      const API_URL = `https://api.julien-offray.de/constellation?constellation=${constellation}`;
      try {
        const response = await axios.get(API_URL);
        resultsStore.set(response.data);
        stars = createStars(response.data);
        drawStars(stars);
      } catch (error) {
        console.error("Error fetching star data:", error);
      }
    }
  
    $: stars, drawStars(stars);
  
    onMount(() => {
      fetchStars("ORI");
    });
</script>
  
<main class="container">
    <div class="filters">
      <Filters {fetchStars}/>
    </div>
</main>
  
<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
  
  .filters {
    position: absolute;
    top: 80px;
    left: 20px;
    z-index: 10;
    background: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 8px;
  }
</style>