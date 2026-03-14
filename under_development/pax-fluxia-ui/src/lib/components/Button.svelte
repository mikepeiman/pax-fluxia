<script lang="ts">
  export let label: string;
  export let onClick: () => void;
  export let variant: 'primary' | 'secondary' = 'primary';
  export let fullWidth: boolean = false;
  export let size: 'small' | 'medium' | 'large' = 'medium';
</script>

<button
  type="button"
  class="btn {variant} {size} {fullWidth ? 'full-width' : ''}"
  on:click={onClick}
>
  {label}
</button>

<style>
  .btn {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-family: var(--font-main);
    font-weight: bold;
    text-transform: uppercase;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    letter-spacing: 1px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .btn.primary {
    background: linear-gradient(135deg, #00ffff 0%, #008b8b 100%);
    color: #000;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }

  .btn.primary:hover {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
    transform: translateY(-2px);
  }

  .btn.secondary {
    background: transparent;
    border: 2px solid var(--primary-color);
    color: var(--primary-color);
  }

  .btn.secondary:hover {
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  .small {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
  
  .medium {
    padding: 10px 20px;
    font-size: 1rem;
  }

  .large {
    padding: 14px 28px;
    font-size: 1.2rem;
  }

  .full-width {
    width: 100%;
  }
</style>
