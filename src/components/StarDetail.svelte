<!-- <script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  export let starId;

  const starDetails = writable({
    proper: null,
    bay: null,
    dist: null
  });

  onMount(async () => {
    const response = await fetch(`http://localhost:3000/stars/${starId}`);
    if (response.ok) {
      const details = await response.json();
      starDetails.set(details);
    } else {
      console.error('Failed to fetch star details');
    }
  });
</script>

{#if $starDetails.proper}
  <div class="star-detail">
    <h1>{$starDetails.proper || 'Unknown'}</h1>
    <p>Bayer designation: {$starDetails.bay || 'N/A'}</p>
    <p>Distance: {$starDetails.dist || 'Unknown distance'}</p>
    <!-- Weitere Details anzeigen -->
  <!-- </div>
{:else}
  <p>Details for the selected star are not available.</p>
{/if}

<style>
  .star-detail {
    padding: 20px;
    border: 1px solid #ccc;
    margin-top: 20px;
  }
</style> --> 
