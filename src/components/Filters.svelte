<script lang="ts">
    import { resultsStore } from "../store.js";
    import { onMount } from "svelte";
    import axios from "axios";

    export let selectedConstellation: string = '';

    async function fetchStars() {
        const API_URL = `https://api.julien-offray.de/constellation?constellation=${selectedConstellation}`;
        try {
            const response = await axios.get(API_URL);
            resultsStore.set(response.data);
        } catch (error) {
            console.error("Fehler beim Abrufen der Sterndaten:", error);
        }
    }

    $: if (selectedConstellation) fetchStars();
</script>

<div class="filters">
    <label for="constellationSelect" class="label">Wähle ein Sternbild:</label>
    <select id="constellationSelect" bind:value={selectedConstellation} class="select">
        <!-- Es muss sichergestellt werden, dass constellations hier korrekt initialisiert und gefüllt wird -->
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
