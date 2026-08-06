<script lang="ts">
  /** Bracketed tactical-HUD button. Forwards clicks; styling from shared hud.css. */
  export let bracket = false;        // show leading "<" magenta bracket
  export let ariaLabel: string | undefined = undefined;
  export let ariaPressed: boolean | undefined = undefined;
  export let disabled = false;
  export let type: "button" | "submit" = "button";
  let className = "";
  export { className as class };
</script>

<button
  {...$$restProps}
  {type}
  class="hud-btn {className}"
  {disabled}
  aria-label={ariaLabel}
  aria-pressed={ariaPressed}
  on:click
>
  {#if bracket}<span class="hud-btn-bracket">&lt;</span>{/if}<slot />
</button>
