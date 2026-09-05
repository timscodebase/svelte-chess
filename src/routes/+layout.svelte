<script lang="ts">
	import './layout.css';
	import faviconSvg from '#lib/assets/favicon.svg';
	import faviconPng from '#lib/assets/favicon.png';
	import appleTouchIcon from '#lib/assets/apple-touch-icon.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={faviconSvg} />
	<link rel="icon" type="image/png" sizes="32x32" href={faviconPng} />
	<link rel="apple-touch-icon" href={appleTouchIcon} />
</svelte:head>
{@render children()}
