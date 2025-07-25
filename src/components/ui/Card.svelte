<script lang="ts">
  import { cn } from "@/lib/utils";

  interface CardProps {
    className?: string;
  }

  export let className: string = "";
</script>

<div
  class={cn(
    "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
    className,
  )}
  {...$$restProps}
>
  <slot />
</div>
