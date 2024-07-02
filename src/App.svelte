<script>
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import Three from "./three.svelte"; 
  import Chat from "./chat.svelte"; 
  import Starsign from "./[starsign].svelte";

  const routes = {
    "/": Three,
    "/:starsign": Starsign,
    "/chat": Chat,
  };
</script>

<main>
  <Router {routes} />
</main>
