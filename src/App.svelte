<script>
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import Test from "./test.svelte"; // Importieren Sie die neue Seite
  import Three from "./three.svelte"; // Importieren Sie die neue Seite
  import Starsign from "./[starsign].svelte";

  const routes = {
    "/test": Test, // Neue Route hinzufügen
    "/": Three,
    "/:starsign": Starsign,
  };
</script>

<main>
  <Router {routes} />
</main>
