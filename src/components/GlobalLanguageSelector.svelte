<script lang="ts">
  import LanguageSelector from "./LanguageSelector.svelte";
</script>

<!-- Global Language Selector - Fixed position at top-right corner -->
<div class="fixed top-4 right-4 z-50 language-selector-global">
  <LanguageSelector />
</div>

<style>
  /* Ensure it stays above all other content */
  .z-50 {
    z-index: 50;
  }
  
  .language-selector-global {
    /* Ensure proper positioning and visibility */
    pointer-events: auto;
  }
  
  /* Responsive positioning */
  @media (max-width: 640px) {
    .language-selector-global {
      top: 1rem;
      right: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    .language-selector-global {
      top: 0.75rem;
      right: 0.75rem;
    }
  }
</style>
