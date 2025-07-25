<script lang="ts">
  import { cn } from "@/lib/utils";

  interface CardContentProps {
    className?: string;
  }

  export let className: string = "";
</script>

<div
  class={cn("px-6", className)}
  {...$$restProps}
>
  <slot />
</div>
