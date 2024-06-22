<script>
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";

  let starsign = "";

  let hashFragment;

  onMount(() => {
    hashFragment = window.location.hash.substring(1);
    hashFragment.split("/").forEach((fragment) => {
      starsign = fragment;
    });
    console.log(hashFragment);
    console.log(starsign);
  });
</script>

<main>
  <button on:click={() => {push("/")}}>Button</button>
  <h1>Hallo, du hast auf das Sternzeichen {starsign} geklickt</h1>
</main>
