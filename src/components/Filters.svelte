<!-- Filters.svelte -->
<script>
    import { resultsStore } from "../store.js";
    import { onMount } from "svelte";
    import axios from "axios";

    let constellations = [
        "Orion",
        "Scorpius",
        "Leo",
        "Lyra",
        "Cygnus",
        "Aquila",
        "Sagitta",
        "Vulpecula",
    ];
    let selectedConstellation = constellations[0];

    async function fetchStars() {
        const API_URL = `https://api.julien-offray.de/constellation?constellation=${selectedConstellation}`;
         console.log(API_URL);
        try {
            const response = await axios.get(API_URL);
            resultsStore.set(response.data);
        } catch (error) {
            console.error("Fehler beim Abrufen der Sterndaten:", error);
        }
    }
    

    onMount(() => {
        fetchStars();
    });

    $: selectedConstellation, fetchStars();
</script>

<div class="filters">
    <label for="constellationSelect" class="label">Choose a constellation:</label>
    <select id="constellationSelect" bind:value={selectedConstellation} class="select">
        {#each constellations as constellation}
            <option value={constellation}>{constellation}</option>
        {/each}
    </select>
</div>

<style>
    .filters {
        text-align: center;
        margin-bottom: 20px;
    }

    .label {
        font-size: 1.2rem;
        font-weight: bold;
        color: #333;
        margin-right: 10px;
    }

    .select {
        padding: 8px;
        font-size: 1rem;
        border-radius: 5px;
        border: 1px solid #ccc;
    }
</style>
