<!-- <script>
  export let handleFetchStars;
  let constellations = ["ARI", "TAU", "GEM", "CNC", "LEO", "VIR", "LIB", "SCO", "SGR", "CAP", "AQR", "PSC", "ORI", "LYR"];
  let selectedConstellation = "ORI";

  function handleSelectionChange() {
    handleFetchStars(selectedConstellation);
  }
</script>

<div class="filters">
  <label for="constellationSelect" class="label">Choose a constellation:</label>
  <select
    id="constellationSelect"
    bind:value={selectedConstellation}
    on:change={handleSelectionChange}
    class="select"
  >
    <option value="">All Stars</option>
    {#each constellations as constellation}
      <option value={constellation}>{constellation}</option>
    {/each}
  </select>
</div>

<style>
  .filters {
    text-align: left;
    margin-bottom: 20px;
  }

  .label {
    font-size: 1.2rem;
    font-weight: bold;
    color: white;
    margin-right: 10px;
  }

  .select {
    padding: 8px;
    font-size: 1rem;
    border-radius: 5px;
    border: 1px solid #ccc;
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
</style> -->
