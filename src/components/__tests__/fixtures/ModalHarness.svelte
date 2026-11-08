<script lang="ts">
  import Modal from "@/components/ui/Modal.svelte";

  export let isOpen = false;
  export let onClose: () => void = () => {};
  export let onEscape: (() => boolean) | undefined = undefined;
  export let closeLabel = "Close modal";
  export let placement: "center" | "right" = "center";
</script>

<Modal
  {isOpen}
  {onClose}
  {onEscape}
  {closeLabel}
  {placement}
  maxWidth="600px"
  ariaLabel="Modal shell test dialog"
  ariaLabelledby="ui-modal-heading"
  ariaDescribedby="ui-modal-description"
>
  <svelte:fragment slot="header">
    <h2 id="ui-modal-heading">Harness heading</h2>
  </svelte:fragment>

  <p id="ui-modal-description">Harness body content</p>

  <svelte:fragment slot="actions">
    <button type="button">Harness action</button>
  </svelte:fragment>

  <svelte:fragment slot="notices">
    <p role="status">Harness notice</p>
  </svelte:fragment>
</Modal>
