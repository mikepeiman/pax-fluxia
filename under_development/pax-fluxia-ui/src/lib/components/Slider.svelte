<script lang="ts">
  export let label: string;
  export let min: number = 0;
  export let max: number = 100;
  export let step: number = 1;
  export let value: number;
  export let unit: string = '';
  export let width: string = '100%';

  function handleChange(e: Event) {
    value = +(e.target as HTMLInputElement).value;
  }
</script>

<div class="slider-container" style="width: {width}">
  <div class="header">
    <span class="label">{label}</span>
    <span class="value">{value}{unit}</span>
  </div>
  <input
    type="range"
    {min}
    {max}
    {step}
    bind:value
    on:input={handleChange}
    style="--percent: {(value - min) / (max - min) * 100}%"
  />
</div>

<style>
  .slider-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #fff;
    font-weight: bold;
    text-transform: uppercase;
  }
  
  .value {
    color: var(--primary-color);
  }

  input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    height: 8px;
    background: linear-gradient(to right, var(--primary-color) var(--percent), #0f3460 var(--percent));
    border-radius: 4px;
    outline: none;
    border: 1px solid rgba(0, 255, 255, 0.3);
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.2);
  }

  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #000;
    border: 2px solid var(--primary-color);
    box-shadow: 0 0 10px var(--primary-color);
    cursor: pointer;
    transition: transform 0.1s;
  }

  input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  input[type=range]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #000;
    border: 2px solid var(--primary-color);
    box-shadow: 0 0 10px var(--primary-color);
    cursor: pointer;
  }
</style>
