import { json } from '@sveltejs/kit';
import { readdir } from 'fs/promises';
import { resolve } from 'path';

/** Lists all image files in static/assets/ for the background picker */
export async function GET() {
    const dir = resolve('static/assets');
    const files = await readdir(dir);
    const images = files
        .filter(f => /\.(png|jpe?g|webp|avif)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return json(images);
}
