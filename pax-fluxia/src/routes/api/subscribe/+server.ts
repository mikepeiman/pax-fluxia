import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { email } = await request.json();

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return json({ success: false, message: 'Invalid email address.' }, { status: 400 });
        }

        const API_KEY = env.BEEHIIV_API_KEY;
        const PUB_ID = env.BEEHIIV_PUB_ID;

        if (!API_KEY || !PUB_ID) {
            console.error('Beehiiv API keys are missing from environment variables.');
            return json({ success: false, message: 'Server configuration error.' }, { status: 500 });
        }

        const response = await fetch(`https://api.beehiiv.com/v2/publications/${PUB_ID}/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                reactivate_existing: true,
                send_welcome_email: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Beehiiv API Error:', errorData);
            return json({ success: false, message: 'Failed to subscribe. Please try again later.' }, { status: response.status });
        }

        return json({ success: true, message: 'Successfully subscribed!' });
    } catch (err) {
        console.error('Subscribe endpoint error:', err);
        return json({ success: false, message: 'Internal server error.' }, { status: 500 });
    }
};
