'use strict';

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function detectIntent(message = '') {
    const text = message.toLowerCase();
    if (/(book|ticket|seat|train)/.test(text)) return 'booking';
    if (/(pnr|status|waitlist|confirm|confirmed|probability)/.test(text)) return 'status';
    if (/(alternative|route|transfer|fastest|cheapest)/.test(text)) return 'alternatives';
    if (/(admin|dashboard|revenue|utilization|operator)/.test(text)) return 'admin';
    return 'general';
}

function buildSuggestions(intent) {
    switch (intent) {
        case 'booking':
            return [
                { label: 'Open Booking', path: '/book' },
                { label: 'Find Alternatives', path: '/alternatives' },
                { label: 'Check PNR', path: '/status' },
            ];
        case 'status':
            return [
                { label: 'Open PNR Status', path: '/status' },
                { label: 'Book Ticket', path: '/book' },
            ];
        case 'alternatives':
            return [
                { label: 'Open Alternatives', path: '/alternatives' },
                { label: 'Book Ticket', path: '/book' },
            ];
        case 'admin':
            return [
                { label: 'Admin Login', path: '/login' },
                { label: 'Go Home', path: '/' },
            ];
        default:
            return [
                { label: 'Book Ticket', path: '/book' },
                { label: 'Check PNR', path: '/status' },
                { label: 'Smart Routes', path: '/alternatives' },
            ];
    }
}

function buildFallbackReply(intent, message) {
    switch (intent) {
        case 'booking':
            return 'I can help you book a train ticket. Open the booking page, choose source, destination, date, class, and quota, then select a train and add passenger details.';
        case 'status':
            return 'You can check a PNR from the status page to see booking details, waitlist position, and confirmation probability. If you already have a PNR, paste it there directly.';
        case 'alternatives':
            return 'If no direct train is available, the Smart Alternatives page can suggest direct or one-transfer journeys sorted by fastest, cheapest, or fewest transfers.';
        case 'admin':
            return 'The admin dashboard is protected. Use the operator login to access booking stats, routes, utilization, and recent activity.';
        default:
            return `I'm your RailWise assistant. I can help with booking tickets, checking PNR status, finding alternative routes, and guiding you to the admin area. You asked: "${message.trim() || 'help'}".`;
    }
}

function extractGeminiText(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
        .map(part => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();
    return text || null;
}

async function generateGeminiReply(message) {
    if (!GEMINI_API_KEY) return null;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        systemInstruction: {
            parts: [
                {
                    text: [
                        'You are the RailWise assistant for a railway booking demo app.',
                        'Be concise, helpful, and specific to this app.',
                        'The app supports booking tickets, checking PNR status, viewing waitlist prediction, finding alternative routes, and an admin dashboard.',
                        'Do not invent policies, prices, or live train data.',
                        'If the user asks for something outside the app, gently redirect to what the app can do.',
                        'Keep replies under 90 words.',
                    ].join(' '),
                },
            ],
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: message }],
            },
        ],
        generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 180,
        },
    };

    const { data } = await axios.post(endpoint, payload, {
        timeout: 12000,
        headers: { 'Content-Type': 'application/json' },
    });

    return extractGeminiText(data);
}

async function chatWithAssistant(req, res) {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }

    const intent = detectIntent(message);
    const suggestions = buildSuggestions(intent);

    try {
        const geminiReply = await generateGeminiReply(message);
        const reply = geminiReply || buildFallbackReply(intent, message);

        return res.json({
            intent,
            reply,
            suggestions,
            provider: geminiReply ? 'gemini' : 'fallback',
            ts: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[Chat] Gemini fallback triggered:', err.message);
        return res.json({
            intent,
            reply: buildFallbackReply(intent, message),
            suggestions,
            provider: 'fallback',
            ts: new Date().toISOString(),
        });
    }
}

module.exports = { chatWithAssistant };
