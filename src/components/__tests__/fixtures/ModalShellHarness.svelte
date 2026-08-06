<script lang="ts">
  import ModalShell, { type ModalDecoration } from "@/components/ModalShell.svelte";

  export let isOpen = false;
  export let decoration: ModalDecoration = "none";
  export let onClose: () => void = () => {};
  export let onEscape: (() => boolean) | undefined = undefined;
  export let closeLabel = "Close modal";
</script>

<ModalShell
  {isOpen}
  {onClose}
  {onEscape}
  {closeLabel}
  maxWidth="600px"
  decoration={decoration}
  ariaLabel="Modal shell test dialog"
  ariaLabelledby="modal-shell-heading"
  ariaDescribedby="modal-shell-description"
  theme={{
    primary: "#123456",
    secondary: "#234567",
    accent: "#345678",
    background: "#010203",
    textColor: "#fefefe"
  }}
>
  <svelte:fragment slot="header">
    <h2 id="modal-shell-heading">Harness heading</h2>
  </svelte:fragment>

  <p id="modal-shell-description">Harness body content</p>

  <svelte:fragment slot="actions">
    <button type="button">Harness action</button>
  </svelte:fragment>

  <svelte:fragment slot="notices">
    <p role="status">Harness notice</p>
  </svelte:fragment>
</ModalShell>
