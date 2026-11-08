<script lang="ts">
  /** Observatory button. Styling lives in styles/components.css (.ui-btn). */
  export let variant: "secondary" | "primary" | "ghost" | "danger" = "secondary";
  export let size: "md" | "sm" | "icon" = "md";
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
  class="ui-btn {className}"
  class:ui-btn--primary={variant === "primary"}
  class:ui-btn--ghost={variant === "ghost"}
  class:ui-btn--danger={variant === "danger"}
  class:ui-btn--sm={size === "sm"}
  class:ui-btn--icon={size === "icon"}
  {disabled}
  aria-label={ariaLabel}
  aria-pressed={ariaPressed}
  on:click
>
  <slot />
</button>
