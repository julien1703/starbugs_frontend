<script>
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";
  import axios from "axios";

  let starsign = "";
  let description = "";

  onMount(async () => {
    const hashFragment = window.location.hash.substring(1);
    hashFragment.split("/").forEach((fragment) => {
      starsign = fragment;
    });

    // Text basierend auf dem Sternzeichen generieren
    try {
      const textResponse = await axios.post('https://api.julien-offray.de/api/generate-text', {
        starsign: starsign
      });
      description = textResponse.data.text;
    } catch (error) {
      console.error("Fehler beim Generieren des Textes:", error);
      description = "Es gab einen Fehler bei der Textgenerierung.";
    }

    console.log(hashFragment);
    console.log(starsign);
  });
</script>

<main>
  <button on:click={() => {push("/")}}>Button</button>
  <h1>Hallo, du hast auf das Sternzeichen {starsign} geklickt</h1>
  <p>{description}</p>
</main>
