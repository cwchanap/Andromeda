<script lang="ts">
  import { cn } from "@/lib/utils";

  interface SeparatorProps {
    className?: string;
    orientation?: "horizontal" | "vertical";
  }

  export let className: string = "";
  export let orientation: "horizontal" | "vertical" = "horizontal";
</script>

<div
  class={cn(
    "bg-border shrink-0",
    orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
    className
  )}
  role="separator"
  aria-orientation={orientation}
></div>
