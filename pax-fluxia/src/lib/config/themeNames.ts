import { resolveThemeRenderMode, type ThemePrimitiveValues } from './themeRouting';

export interface ThemeNameInput {
    providedName?: string | null;
    sourceName?: string | null;
    createdAt?: string | null;
    values?: ThemePrimitiveValues;
}

const FILE_TIMESTAMP_RE =
    /(?:^|[-_ ])(\d{4}-\d{2}-\d{2})T(\d{2})[-:](\d{2})[-:](\d{2})(?:$|[-_ .])/i;

const LEADING_GENERIC_TOKENS = new Set([
    'custom',
    'theme',
    'preset',
]);

const NOISY_TOKENS = new Set([
    'exported',
    'settings',
    'keeper',
]);

const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const UPPERCASE_TOKEN_MAP: Record<string, string> = {
    ai: 'AI',
    bg: 'BG',
    cdf: 'CDF',
    df: 'DF',
    dy4: 'DY4',
    fx: 'FX',
    hud: 'HUD',
    msr: 'MSR',
    pvv: 'PVV',
    pvv2: 'PVV2',
    pvv3: 'PVV3',
    rts: 'RTS',
    sla: 'SLA',
    ui: 'UI',
    vs: 'VS',
};

const GENERATED_NAME_BY_RENDER_MODE: Record<string, string> = {
    territory_canonical: 'Layered Runtime Theme',
    territory_engine: 'DY4 Theme',
    vs_pvv3: 'PVV3 Theme',
    power_voronoi: 'Power Voronoi Theme',
    pvv2_dy4: 'PVV2 DY4 Theme',
    modified_voronoi: 'Modified Voronoi Theme',
    voronoi: 'Voronoi Theme',
    distance_field: 'Distance Field Theme',
    metaball: 'Metaball Theme',
    perimeter_field: 'Perimeter Field Theme',
    graph: 'Graph Theme',
    pixel: 'Pixel Theme',
    contour: 'Contour Theme',
    none: 'Territory Off Theme',
};

function monthLabelFromNumber(rawMonth: string): string | null {
    const monthNumber = Number.parseInt(rawMonth, 10);
    if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return null;
    }
    return MONTH_LABELS[monthNumber - 1];
}

function normalizeDayToken(rawDay: string): number | null {
    const dayNumber = Number.parseInt(rawDay.slice(-2), 10);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 31) {
        return null;
    }
    return dayNumber;
}

function rewriteDatePrefixes(rawName: string): string {
    let name = rawName;

    name = name.replace(
        /^(\d{4})[-_ ](\d{1,2})[-_ ](0?\d{1,3})(?=$|[-_ ,]+)/,
        (match, _year, rawMonth, rawDay) => {
            const monthLabel = monthLabelFromNumber(rawMonth);
            const dayNumber = normalizeDayToken(rawDay);
            if (!monthLabel || dayNumber === null) return match;
            return `${monthLabel} ${String(dayNumber).padStart(2, '0')}`;
        },
    );

    name = name.replace(
        /^0?(\d{2})(\d{2})(?=$|[-_ ,]+)/,
        (match, rawMonth, rawDay) => {
            const monthLabel = monthLabelFromNumber(rawMonth);
            const dayNumber = normalizeDayToken(rawDay);
            if (!monthLabel || dayNumber === null) return match;
            return `${monthLabel} ${String(dayNumber).padStart(2, '0')}`;
        },
    );

    return name.replace(
        /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(\d{1,2})\b/gi,
        '$1 $2',
    );
}

function tokenizeThemeName(rawName: string): string[] {
    const stripped = rawName
        .replace(/\.json$/i, '')
        .replace(/^pax-theme[-_ ]?/i, '')
        .replace(FILE_TIMESTAMP_RE, ' ');

    const rewritten = rewriteDatePrefixes(stripped)
        .replace(/([A-Za-z])(\d)/g, '$1 $2')
        .replace(/(\d)([A-Za-z])/g, '$1 $2')
        .replace(/[()[\]{}]/g, ' ')
        .replace(/[\\/,_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return rewritten ? rewritten.split(' ') : [];
}

function stripGenericTokens(tokens: string[]): string[] {
    const trimmed = [...tokens];

    while (
        trimmed.length > 1
        && LEADING_GENERIC_TOKENS.has(trimmed[0].toLowerCase())
    ) {
        trimmed.shift();
    }

    const filtered = trimmed.filter(
        (token) => !NOISY_TOKENS.has(token.toLowerCase()),
    );
    return filtered.length > 0 ? filtered : trimmed;
}

function isMeaningfulToken(token: string): boolean {
    return (
        /[A-Za-z]/.test(token)
        && !LEADING_GENERIC_TOKENS.has(token.toLowerCase())
        && !NOISY_TOKENS.has(token.toLowerCase())
    );
}

function hasMeaningfulTokens(tokens: string[]): boolean {
    return tokens.some((token) => isMeaningfulToken(token));
}

function formatThemeToken(token: string): string {
    if (/^\d+$/.test(token)) return token;

    const lower = token.toLowerCase();
    if (UPPERCASE_TOKEN_MAP[lower]) {
        return UPPERCASE_TOKEN_MAP[lower];
    }

    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalizeThemeNameCandidate(rawName?: string | null): string | null {
    if (!rawName) return null;

    const tokens = stripGenericTokens(tokenizeThemeName(rawName));
    if (!hasMeaningfulTokens(tokens)) return null;

    return tokens.map((token) => formatThemeToken(token)).join(' ').trim();
}

function parseThemeDate(input: ThemeNameInput): Date | null {
    if (input.createdAt && !Number.isNaN(Date.parse(input.createdAt))) {
        return new Date(input.createdAt);
    }

    for (const rawName of [input.sourceName, input.providedName]) {
        if (!rawName) continue;
        const match = rawName.match(FILE_TIMESTAMP_RE);
        if (!match) continue;
        const [, date, hours, minutes, seconds] = match;
        const iso = `${date}T${hours}:${minutes}:${seconds}.000Z`;
        if (!Number.isNaN(Date.parse(iso))) {
            return new Date(iso);
        }
    }

    return null;
}

function formatThemeDateLabel(
    input: ThemeNameInput,
    includeTime = false,
): string | null {
    const date = parseThemeDate(input);
    if (!date) return null;

    const iso = date.toISOString();
    if (!includeTime) {
        return iso.slice(0, 10);
    }
    return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

function generateThemeBaseName(values?: ThemePrimitiveValues): string {
    if (!values) return 'Theme';

    const renderMode = resolveThemeRenderMode(values as Record<string, unknown>);
    if (!renderMode) return 'Theme';

    return GENERATED_NAME_BY_RENDER_MODE[renderMode] ?? 'Theme';
}

export function resolveThemeBaseName(input: ThemeNameInput): string {
    return (
        normalizeThemeNameCandidate(input.providedName)
        ?? normalizeThemeNameCandidate(input.sourceName)
        ?? generateThemeBaseName(input.values)
    );
}

export function buildThemeDisplayName(
    input: ThemeNameInput,
    options?: {
        includeDate?: boolean;
        includeTime?: boolean;
    },
): string {
    const includeDate = options?.includeDate ?? true;
    const baseName = resolveThemeBaseName(input);
    if (!includeDate) return baseName;

    const dateLabel = formatThemeDateLabel(input, options?.includeTime ?? false);
    return dateLabel ? `${baseName} (${dateLabel})` : baseName;
}

function stripTrailingDateLabel(name: string): string {
    return name.replace(/\s+\([^)]*\)(?:\s+#\d+)?$/, '').trim();
}

export function ensureUniqueThemeDisplayName(
    proposedName: string,
    existingNames: ReadonlySet<string>,
    input: ThemeNameInput,
): string {
    if (!existingNames.has(proposedName)) return proposedName;

    const baseName = stripTrailingDateLabel(proposedName);
    const dateTimeLabel = formatThemeDateLabel(input, true);
    const withTime = dateTimeLabel
        ? `${baseName} (${dateTimeLabel})`
        : `${baseName} #2`;

    if (!existingNames.has(withTime)) {
        return withTime;
    }

    let suffix = 2;
    let candidate = `${withTime} #${suffix}`;
    while (existingNames.has(candidate)) {
        suffix += 1;
        candidate = `${withTime} #${suffix}`;
    }
    return candidate;
}
