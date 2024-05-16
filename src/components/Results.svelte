<!-- Results.svelte -->
<script>
    import { resultsStore } from "../store.js";
</script>

<div class="results">
    <h3 class="results-heading">Results:</h3>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Bayer</th>
                <th>Flamsteed</th>
                <th>vMag</th>
            </tr>
        </thead>
        <tbody>
            {#each $resultsStore as star}
                <tr>
                    <td>{star.proper || ""}</td>
                    <td>{star.bayer || ""}</td>
                    <td>{star.flam || ""}</td>
                    <td>{star.mag || ""}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .results {
        background-color: #fff;
        border-radius: 8px;
        padding: 20px;
    }

    .results-heading {
        font-size: 1.5rem;
        color: #333;
        margin-bottom: 10px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
    }

    th, td {
        padding: 10px;
        border-bottom: 1px solid #ddd;
    }

    th {
        text-align: left;
        background-color: #f2f2f2;
    }

    tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    tr:hover {
        background-color: #ddd;
    }
</style>
