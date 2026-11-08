<script lang="ts">
  /** Observatory panel: surface card with an optional caption + serif title. */
  export let title: string | undefined = undefined;
  export let caption: string | undefined = undefined;
  export let animate = true;
  let className = "";
  export { className as class };
</script>

<section class="ui-panel {className}" class:ui-panel-anim={animate}>
  {#if title}
    <header class="ui-panel-header">
      <div class="ui-panel-heading">
        {#if caption}<div class="ui-caption">{caption}</div>{/if}
        <h3 class="ui-panel-title">{title}</h3>
      </div>
      <slot name="actions" />
    </header>
  {/if}
  <slot />
</section>

<style>
  .ui-panel-heading {
    flex: 1;
    min-width: 0;
  }
</style>
