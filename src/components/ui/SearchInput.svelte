<script lang="ts">
  import { onMount } from "svelte";

  /** Search input. Two-way bind `value`; forwards keydown for keyboard nav. */
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

<div class="ui-search">
  <svg class="ui-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="M20 20l-4-4"></path>
  </svg>
  <input
    bind:this={inputEl}
    class="ui-search-input"
    type="text"
    {placeholder}
    aria-label={ariaLabel}
    bind:value
    on:keydown
    on:input
  />
</div>
