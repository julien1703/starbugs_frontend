<script>
  import Filters from "./components/Filters.svelte";
  import { onMount } from "svelte";
  import { fetchStars } from './sky.js';

  async function handleFetchStars(constellation) {
    await fetchStars(constellation);
  }

  onMount(() => {
    handleFetchStars("ORI");
  });
</script>

<main class="container">
  <div class="filters">
    <Filters {handleFetchStars}/>
  </div>
  <div id="sky-container"></div>
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
