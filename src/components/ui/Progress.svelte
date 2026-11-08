<script lang="ts">
  import { cn } from "@/lib/utils";

  export let value: number = 0;
  export let className: string = "";
</script>

<div
  class={cn("relative h-1 w-full overflow-hidden rounded-full bg-surface-2", className)}
  {...$$restProps}
>
  <div
    class="h-full w-full bg-accent transition-transform"
    style="transform: translateX(-{100 - (value || 0)}%)"
  ></div>
</div>
