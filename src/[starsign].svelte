<script>
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";
  import axios from "axios";

  let starsign = "";
  let apiKey = "";

  onMount(async () => {
    const hashFragment = window.location.hash.substring(1);
    hashFragment.split("/").forEach((fragment) => {
      starsign = fragment;
    });

    // API-Schlüssel vom Backend abrufen
    try {
      const response = await axios.get('https://api.julien-offray.de/get-api-key');
      apiKey = response.data.apiKey;
      console.log("API Key:", apiKey);
    } catch (error) {
      console.error("Fehler beim Abrufen des API-Schlüssels:", error);
    }

    console.log(hashFragment);
    console.log(starsign);
  });
</script>

<main>
  <button on:click={() => {push("/")}}>Button</button>
  <h1>Hallo, du hast auf das Sternzeichen {starsign} geklickt</h1>
</main>
