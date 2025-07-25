<script lang="ts">
  import { cn } from "@/lib/utils";

  interface ProgressProps {
    value?: number;
    className?: string;
  }

  export let value: number = 0;
  export let className: string = "";
</script>

<div
  class={cn(
    "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
    className,
  )}
  {...$$restProps}
>
  <div
    class="bg-primary h-full w-full flex-1 transition-all"
    style="transform: translateX(-{100 - (value || 0)}%)"
  ></div>
</div>
