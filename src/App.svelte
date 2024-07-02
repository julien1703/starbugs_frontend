<script>
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import Three from "./three.svelte"; 
  import Starsign from "./[starsign].svelte";

  const routes = {
    "/": Three,
    "/:starsign": Starsign,
  };
</script>

<main>
  <Router {routes} />
</main>
