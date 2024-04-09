<!-- app.svelte -->
<script>
  import Filters from "./components/Filters.svelte";
  import Results from "./components/Results.svelte";
</script>

<main class="container">
  <header class="header">
      <h1 class="title">Constellarium</h1>
  </header>
  <section class="content">
      <Filters />
      <Results />
  </section>
  <footer class="footer">
      <p class="copyright">© 2024 Constellarium. All rights reserved.</p>
  </footer>
</main>

<style>
  .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
  }

  .header {
      background-color: #333;
      color: #fff;
      text-align: center;
      padding: 20px 0;
      margin-bottom: 20px;
  }

  .title {
      font-size: 2rem;
      margin: 0;
  }

  .content {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
  }

  .footer {
      text-align: center;
      color: #666;
      font-size: 0.8rem;
  }
</style>
