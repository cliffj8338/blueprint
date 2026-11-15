/* Explicit resend only. Initial/direct invitations keep their existing flow. */
(function (root, document) {
    'use strict';
    var pending = new Set();

    function allowed() {
        return root.fbIsAdmin && !root.showcaseMode && root.fbUser;
    }

    async function request(entryId, body) {
        if (!allowed()) throw new Error('Sign in as an administrator. Resending is disabled in showcase mode.');
        var user = root.fbUser;
        var token = await user.getIdToken();
        if (!allowed() || root.fbUser.uid !== user.uid) throw new Error('The active administrator changed. Sign in again.');
        var response;
        try {
            response = await root.fetch('/api/invitation-resend' + (body ? '' : '?entryId=' + encodeURIComponent(entryId)), {
                method: body ? 'POST' : 'GET',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(30_000)
            });
        } catch (_) {
            throw new Error('No response was received. The email may have been accepted. Check the last resend before trying again.');
        }
        var data;
        try { data = await response.json(); } catch (_) {
            throw new Error('The invitation endpoint is unavailable. No outcome could be confirmed.');
        }
        if (!response.ok) {
            var error = new Error(data.error || 'No resend outcome could be confirmed.');
            error.retryAt = data.retryAt;
            throw error;
        }
        if (!allowed() || root.fbUser.uid !== user.uid) throw new Error('The administrator changed. Refresh to check the last resend.');
        return data;
    }

    function describe(result) {
        var note = result.auditSaved === false ? ' The audit record could not be saved; do not immediately resend.' : '';
        if (result.outcome === 'accepted' && result.providerId) {
            return 'Accepted by Resend. Message ID: ' + result.providerId + '. Inbox delivery is not confirmed.' + note;
        }
        if (result.outcome === 'rejected') {
            return (result.providerStatus === 'configuration_unavailable'
                ? 'Not sent: the server could not access its email configuration.'
                : 'Rejected by Resend' + (result.providerStatus ? ' (HTTP ' + result.providerStatus + ')' : '') + '.')
                + ' No successful submission was confirmed.' + note;
        }
        if (result.outcome === 'processing') return 'A resend is being processed. Do not submit another request.';
        if (result.outcome === 'none') return 'No resend attempt has been recorded. Original invitation delivery is not confirmed here.';
        return 'Outcome unknown. The email may have been accepted. Do not immediately resend.' + note;
    }

    function mount(container, entries) {
        if (!container || !allowed()) return;
        var byId = new Map((entries || []).map(function (entry) { return [entry._id, entry]; }));
        container.querySelectorAll('[data-bp-invited-id]').forEach(function (row) {
            var entry = byId.get(row.getAttribute('data-bp-invited-id'));
            if (!entry || row.querySelector('.bp-invite-resend')) return;
            var panel = document.createElement('div');
            panel.className = 'bp-invite-resend';
            panel.style.cssText = 'margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Resend invitation';
            button.style.cssText = 'padding:7px 12px;background:var(--accent);color:#fff;border:0;border-radius:6px;cursor:pointer;font:inherit;font-size:.8em;font-weight:600;';
            button.setAttribute('aria-label', 'Resend invitation to ' + entry.email);
            var check = document.createElement('button');
            check.type = 'button';
            check.textContent = 'Check last resend';
            check.style.cssText = 'padding:7px 10px;background:transparent;color:var(--accent);border:1px solid var(--accent);border-radius:6px;cursor:pointer;font:inherit;font-size:.8em;';
            var status = document.createElement('p');
            status.style.cssText = 'flex-basis:100%;margin:0;color:var(--text-secondary);font-size:.8em;overflow-wrap:anywhere;';
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
            status.setAttribute('aria-atomic', 'true');
            status.textContent = 'Resends: five minutes apart; up to three attempts per recipient per UTC day. Delivery is not confirmed.';
            panel.appendChild(button);
            panel.appendChild(check);
            panel.appendChild(status);
            // Keep the existing row's content/layout intact.
            row.firstElementChild.appendChild(panel);

            function busy(value) {
                button.disabled = value;
                check.disabled = value;
                panel.setAttribute('aria-busy', String(value));
            }
            function show(result) {
                status.textContent = describe(result);
                if (result.retryAt && result.retryAt > Date.now()) {
                    status.textContent += ' Next eligible resend: ' + new Date(result.retryAt).toLocaleString() + '.';
                }
            }
            function showError(error) {
                status.textContent = error.message;
                if (error.retryAt) status.textContent += ' Try after ' + new Date(error.retryAt).toLocaleString() + '.';
            }
            check.addEventListener('click', async function () {
                if (!allowed() || pending.has(entry._id)) return;
                busy(true);
                try { show(await request(entry._id)); } catch (error) { showError(error); }
                finally { busy(false); }
            });
            button.addEventListener('click', async function () {
                if (!allowed() || pending.has(entry._id)) return;
                if (!root.confirm('Resend the invitation to ' + entry.email + '?\n\nThis sends another email. Inbox delivery is not guaranteed. Resends are limited to one every five minutes and three attempts per recipient per UTC day.')) return;
                if (!allowed() || pending.has(entry._id)) return;
                pending.add(entry._id);
                busy(true);
                status.textContent = 'Submitting to Resend… Do not submit another request.';
                try {
                    show(await request(entry._id, {
                        entryId: entry._id, email: entry.email,
                        confirmed: true, requestId: root.crypto.randomUUID()
                    }));
                } catch (error) { showError(error); }
                finally { pending.delete(entry._id); busy(false); }
            });
        });
    }

    root.BPInviteResend = { mount: mount, describe: describe };
})(window, document);
