<script lang="ts">
  // The gold-standard build was folded into the single /themes comparison
  // screen (select "Nebula Veil" there). This route now just redirects — no
  // theme work lives on a separate route.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  onMount(() => void goto("/themes", { replaceState: true }));
</script>

<svelte:head><title>Redirecting…</title></svelte:head>

<p style="padding:2rem;font-family:system-ui;color:#8b93b8">
  The Theme Lab now lives on one screen. Redirecting to <a href="/themes" style="color:#3aa0ff">/themes</a>…
</p>
