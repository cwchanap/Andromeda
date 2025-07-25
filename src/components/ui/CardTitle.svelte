<script lang="ts">
  import { cn } from "@/lib/utils";

  interface CardTitleProps {
    className?: string;
  }

  export let className: string = "";
</script>

<div
  class={cn("leading-none font-semibold", className)}
  {...$$restProps}
>
  <slot />
</div>
