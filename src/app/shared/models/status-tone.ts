export type StatusTone =
	'healthy' | 'critical' | 'deep' | 'attention' | 'queued' | 'neutral' | 'brand';

export const LUMEN_TONES: Readonly<Record<string, StatusTone>> = Object.freeze({
	OK: 'healthy',
	FAULT: 'critical',
	MAINTENANCE: 'attention',
	OFFLINE: 'neutral',

	REPORTED: 'brand',
	VALIDATED: 'queued',
	IN_PROGRESS: 'attention',
	CLOSED: 'healthy',
	REJECTED: 'neutral',

	DRAFT: 'neutral',
	ASSIGNED: 'queued',
	DONE: 'healthy',

	DAY: 'healthy',
	NIGHT: 'deep',

	LOW: 'neutral',
	MEDIUM: 'queued',
	HIGH: 'critical',
	CRITICAL: 'deep',

	SODIUM: 'attention',
	LED: 'healthy',
	METAL_HALIDE: 'queued',

	ADMIN: 'deep',
	COUNCIL: 'queued',
	CONTRACTOR: 'attention',
	VIEWER: 'neutral'
});

export const toneFor = (value: string | null | undefined): StatusTone =>
	(value && LUMEN_TONES[value]) || 'neutral';

export const pillClass = (value: string | null | undefined): string =>
	`lum-pill lum-pill--${toneFor(value)}`;

/* Reads a tone's ink back out of the cascade, for the consumers that need a
   real colour string rather than a class: OpenLayers feature styles and
   ECharts option objects. Falls back to the muted ink when the stylesheet has
   not been applied yet (unit tests, server-side rendering). */
export const toneInk = (value: string | null | undefined): string => {
	const custom = getComputedStyle(document.documentElement)
		.getPropertyValue(`--tone-${toneFor(value)}-ink`)
		.trim();
	return custom || '#6a6a6a';
};
