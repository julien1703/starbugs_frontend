<script lang="ts">
    import { onMount } from 'svelte';
    import axios from 'axios';

    export let selectedConstellation: string = '';

    let constellations: Array<{ name: string }> = [];

    onMount(async () => {
        try {
            const response = await axios.get('https://api.julien-offray.de/constellations');
            constellations = response.data;
        } catch (error) {
            console.error("Fehler beim Laden der Sternbilder:", error);
        }
    });
</script>

<div class="carousel">
    {#each constellations as constellation}
        <button on:click={() => selectedConstellation = constellation.name}>
            {constellation.name}
        </button>
    {/each}
</div>

<style>
    .carousel {
        display: flex;
        overflow-x: scroll;
        padding: 10px;
        gap: 10px;
    }
    button {
        padding: 10px;
        background-color: #f0f0f0;
        border: none;
        border-radius: 8px;
    }
    button:hover {
        background-color: #ccc;
    }
</style>
