// Minimal dev adapter for this Vercel endpoint; production uses api/*.js.
export function invitationResendDev() {
    return {
        name: 'invitation-resend-dev',
        configureServer(server) {
            server.middlewares.use('/api/invitation-resend', async (req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.status = code => { res.statusCode = code; return res; };
                res.json = data => res.end(JSON.stringify(data));
                req.query = Object.fromEntries(new URL(req.url, 'http://dev.invalid').searchParams);
                try {
                    let raw = '';
                    for await (const chunk of req) {
                        raw += chunk;
                        if (Buffer.byteLength(raw) > 4096) return res.status(413).json({ error: 'Request too large.' });
                    }
                    req.body = raw;
                    const { default: handler } = await import('../api/invitation-resend.js');
                    await handler(req, res);
                } catch (_) {
                    res.status(503).json({ error: 'Invitation service unavailable.' });
                }
            });
        }
    };
}
