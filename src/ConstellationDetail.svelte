<!-- <script>
    export let constellation;

    let focusedStar = null;

    function handleFocus(star) {
        focusedStar = star;
        showStarInfo(star);
    }

    function showStarInfo(star) {
        // Implementiere eine Logik, um Informationen anzuzeigen, wenn man über einen Stern hover oder ihn fokussiert.
    }
</script>

<div class="constellation-detail">
    <h1>{constellation.name}</h1>
    <svg viewBox="0 0 100 100" aria-label="Constellation Map">
        {#each constellation.stars as star, index}
            <circle
                tabindex="0"
                role="button"
                cx={star.x}
                cy={star.y}
                r="2"
                on:mouseover={() => showStarInfo(star)}
                on:focus={() => handleFocus(star)}
                on:blur={() => focusedStar = null}
                aria-label={`Star ${index + 1} in ${constellation.name}`}
                class:focused={star === focusedStar}
            />
        {/each}
    </svg>
</div>

<style>
    .constellation-detail {
        position: relative;
    }
    circle {
        fill: blue;
    }
    .focused {
        stroke: red;
        stroke-width: 0.5;
    }
</style> -->
