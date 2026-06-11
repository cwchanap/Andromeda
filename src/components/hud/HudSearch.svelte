<script lang="ts">
  import { onMount } from "svelte";

  /** HUD search input. Two-way bind `value`; forwards keydown for keyboard nav. */
  export let value = "";
  export let placeholder = "";
  export let ariaLabel = "Search";
  export let autofocus = false;

  let inputEl: HTMLInputElement;

  // Focus when mounted if requested (used by the toggle-open finder).
  onMount(() => {
    if (autofocus && inputEl) inputEl.focus();
  });
</script>

<div class="hud-search">
  <span class="hud-search-icon" aria-hidden="true">&gt;</span>
  <input
    bind:this={inputEl}
    class="hud-search-input"
    type="text"
    {placeholder}
    aria-label={ariaLabel}
    bind:value
    on:keydown
    on:input
  />
</div>
