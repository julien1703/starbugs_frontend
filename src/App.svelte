<script>
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  // import Starsign from './[starsign].svelte';
  import Test from "./test.svelte"; // Importieren Sie die neue Seite
  import Three from "./three.svelte"; // Importieren Sie die neue Seite
  import Starsign from "./[starsign].svelte";

  const routes = {
    // '/:starsign': Starsign,
    "/test": Test, // Neue Route hinzufügen
    "/": Three,
    "/:starsign": Starsign,
  };
</script>

<main>
  <h1>Hallo alle zusammen</h1>

  <button on:click={() => push("/test")}>Test</button>
  <!-- Neuer Button -->
  <Router {routes} />
</main>
