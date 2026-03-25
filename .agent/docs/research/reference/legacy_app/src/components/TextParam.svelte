<script>
	import Param from './Param.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let label = '';
	export let value = '';
	export let color = 'currentColor'
	function dispatchMessage() {
		dispatch('message', {
			value: value
		})
            console.log(`🚀 ~ file: Slider.svelte ~ line 17 ~ dispatchMessage ~ ${label}: `, value)
	}
	$: value = value
</script>

<Param {label} {value} {color}>
	<div class="flex">
		<input type="text" bind:value on:change={dispatchMessage} />
	</div>
</Param>

<style>
	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type='number'] {
		-moz-appearance: textfield;
	}
</style>
