<script lang="ts">
  import Modal from "@/components/ui/Modal.svelte";

  export let isOpen = false;
  export let onClose: () => void = () => {};
  export let closeLabel = "Close modal";
</script>

<Modal
  {isOpen}
  {onClose}
  {closeLabel}
  maxWidth="600px"
  ariaLabel="Bare modal test dialog"
  ariaLabelledby="bare-shell-heading"
>
  <svelte:fragment slot="header">
    <h2 id="bare-shell-heading">Bare heading</h2>
  </svelte:fragment>

  <p>Bare body content</p>
</Modal>
