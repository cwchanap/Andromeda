<script lang="ts">
  import ModalShell from "@/components/ModalShell.svelte";

  export let isOpen = false;
  export let onClose: () => void = () => {};
  export let closeLabel = "Close modal";
</script>

<ModalShell
  {isOpen}
  {onClose}
  {closeLabel}
  maxWidth="600px"
  decoration="none"
  ariaLabel="Bare modal test dialog"
  ariaLabelledby="bare-shell-heading"
  theme={{}}
>
  <svelte:fragment slot="header">
    <h2 id="bare-shell-heading">Bare heading</h2>
  </svelte:fragment>

  <p>Bare body content</p>
</ModalShell>
