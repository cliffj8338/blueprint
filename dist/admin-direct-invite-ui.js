(function (window, document) {
    'use strict';

    var FORM_ID = 'bp-direct-invite-form';

    function formHTML() {
        return '<section class="bp-direct-invite" aria-labelledby="bp-direct-invite-title">'
            + '<div class="bp-direct-invite__heading">'
            + '<div><h3 id="bp-direct-invite-title">Invite someone directly</h3>'
            + '<p>Send an invitation to a person who has not joined the waitlist.</p></div>'
            + '<span class="bp-direct-invite__tag">Individual access</span>'
            + '</div>'
            + '<form id="' + FORM_ID + '" novalidate>'
            + '<div class="bp-direct-invite__fields">'
            + '<div class="bp-direct-invite__field">'
            + '<label for="bp-direct-invite-name">Name <span>(optional)</span></label>'
            + '<input id="bp-direct-invite-name" name="name" type="text" maxlength="200" autocomplete="name" placeholder="Their name">'
            + '</div>'
            + '<div class="bp-direct-invite__field">'
            + '<label for="bp-direct-invite-email">Email <span aria-hidden="true">*</span></label>'
            + '<input id="bp-direct-invite-email" name="email" type="email" maxlength="254" autocomplete="email" required placeholder="name@example.com">'
            + '</div>'
            + '<button class="bp-direct-invite__submit" type="submit">Send invitation</button>'
            + '</div>'
            + '<p class="bp-direct-invite__note">The invitation is queued through the existing email flow. Email delivery is not confirmed here.</p>'
            + '<p class="bp-direct-invite__status" id="bp-direct-invite-status" role="status" aria-live="polite" aria-atomic="true"></p>'
            + '</form></section>';
    }

    function addStyles() {
        if (document.getElementById('bp-direct-invite-styles')) return;
        var style = document.createElement('style');
        style.id = 'bp-direct-invite-styles';
        style.textContent = [
            '.bp-direct-invite,.bp-direct-invite *{box-sizing:border-box;}',
            '.bp-direct-invite{margin:0 0 24px;padding:20px 22px;background:var(--c-surface-2,var(--bg-surface));border:1px solid var(--c-surface-5,var(--border));border-radius:12px;color:var(--c-text,var(--text-primary));}',
            '.bp-direct-invite__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}',
            '.bp-direct-invite__heading h3{margin:0;color:var(--text-primary,var(--c-text));font:700 1.05rem/1.3 Outfit,sans-serif;letter-spacing:.01em;}',
            '.bp-direct-invite__heading p{margin:4px 0 0;color:var(--text-muted,var(--c-muted));font-size:.86rem;line-height:1.45;}',
            '.bp-direct-invite__tag{flex:none;padding:5px 9px;border:1px solid var(--c-accent-border-1,var(--border));border-radius:999px;background:var(--c-accent-bg-1,var(--input-bg));color:var(--accent);font-size:.72rem;font-weight:600;letter-spacing:.035em;}',
            '.bp-direct-invite__fields{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(220px,1.25fr) auto;align-items:end;gap:12px;}',
            '.bp-direct-invite__field{min-width:0;}',
            '.bp-direct-invite__field label{display:block;margin:0 0 6px;color:var(--text-secondary,var(--c-muted));font-size:.78rem;font-weight:600;}',
            '.bp-direct-invite__field label span{font-weight:400;color:var(--text-muted,var(--c-muted));}',
            '.bp-direct-invite__field input{display:block;width:100%;min-height:42px;padding:9px 11px;border:1px solid var(--border-strong,var(--c-border-mid));border-radius:7px;background:var(--bg-surface,var(--card-bg));color:var(--text-primary,var(--c-text));font:inherit;font-size:.9rem;}',
            '.bp-direct-invite__field input::placeholder{color:var(--text-muted,var(--c-muted));opacity:.8;}',
            '.bp-direct-invite__field input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent);}',
            '.bp-direct-invite__submit{min-height:42px;padding:9px 16px;border:0;border-radius:7px;background:var(--accent);color:#fff;font:600 .86rem Outfit,sans-serif;cursor:pointer;white-space:nowrap;transition:opacity .15s ease,transform .15s ease;}',
            '.bp-direct-invite__submit:hover:not(:disabled){transform:translateY(-1px);}',
            '.bp-direct-invite__submit:focus-visible{outline:2px solid var(--accent);outline-offset:3px;}',
            '.bp-direct-invite__submit:disabled{opacity:.58;cursor:wait;}',
            '.bp-direct-invite__note{margin:10px 0 0;color:var(--text-muted,var(--c-muted));font-size:.77rem;line-height:1.45;}',
            '.bp-direct-invite__status{min-height:1.35em;margin:7px 0 0;color:var(--text-secondary,var(--c-muted));font-size:.83rem;line-height:1.4;}',
            '.bp-direct-invite__status[data-kind="success"]{color:var(--success,var(--c-success));}',
            '.bp-direct-invite__status[data-kind="error"]{color:var(--danger,var(--c-danger));}',
            '@media(max-width:680px){.bp-direct-invite{padding:17px 15px;margin-bottom:20px}.bp-direct-invite__fields{grid-template-columns:1fr}.bp-direct-invite__submit{width:100%}.bp-direct-invite__tag{font-size:.66rem}}',
            '@media(max-width:390px){.bp-direct-invite__heading{display:block}.bp-direct-invite__tag{display:inline-block;margin-top:9px}}'
        ].join('');
        document.head.appendChild(style);
    }

    function mount(container) {
        if (!container || !container.appendChild) return false;
        if (!window.fbIsAdmin || window.showcaseMode) return false;
        if (container.querySelector('.bp-direct-invite')) return true;

        addStyles();
        var wrapper = document.createElement('div');
        wrapper.innerHTML = formHTML();
        var panel = wrapper.firstChild;
        container.insertBefore(panel, container.firstChild);

        var form = panel.querySelector('#' + FORM_ID);
        var nameInput = panel.querySelector('#bp-direct-invite-name');
        var emailInput = panel.querySelector('#bp-direct-invite-email');
        var submit = panel.querySelector('.bp-direct-invite__submit');
        var status = panel.querySelector('#bp-direct-invite-status');

        function setStatus(message, kind) {
            status.textContent = message;
            if (kind) status.setAttribute('data-kind', kind);
            else status.removeAttribute('data-kind');
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (submit.disabled) return;

            var email = emailInput.value.trim();
            var name = nameInput.value.trim();
            if (!emailInput.validity.valid || !email) {
                emailInput.setCustomValidity(email ? 'Enter a valid email address.' : 'Enter an email address.');
                emailInput.reportValidity();
                emailInput.addEventListener('input', function clearEmailValidity() {
                    emailInput.setCustomValidity('');
                    emailInput.removeEventListener('input', clearEmailValidity);
                });
                return;
            }
            emailInput.setCustomValidity('');

            if (!window.BPDirectInvite || typeof window.BPDirectInvite.send !== 'function') {
                setStatus('Invitations are temporarily unavailable. Your details have been kept; please try again.', 'error');
                return;
            }

            submit.disabled = true;
            submit.setAttribute('aria-busy', 'true');
            setStatus('Queuing invitation…');

            Promise.resolve().then(function () {
                return window.BPDirectInvite.send(email, name);
            }).then(function (result) {
                if (result && result.alreadyInvited) {
                    setStatus((result.email || email) + ' has already been invited. No new invitation was sent.', 'error');
                    return;
                }

                setStatus('Invitation queued for ' + ((result && result.email) || email) + ' through the existing email flow. Email delivery is not confirmed here.', 'success');
                if (typeof window.showToast === 'function') window.showToast('Invitation queued for ' + ((result && result.email) || email) + '. Delivery is not confirmed.', 'success');
                form.reset();
                if (container.id === 'adminTabContent') {
                    if (typeof window.renderAdminWaitlist === 'function') window.renderAdminWaitlist(container);
                } else if (typeof window.loadAdminWaitlist === 'function') {
                    window.loadAdminWaitlist();
                }
            }).catch(function (error) {
                var detail = error && error.message ? ' ' + error.message : '';
                setStatus('Invitation could not be queued.' + detail + ' Your details have been kept; please try again.', 'error');
            }).then(function () {
                submit.disabled = false;
                submit.removeAttribute('aria-busy');
            });
        });

        return true;
    }

    window.BPDirectInviteUI = {
        mount: mount,
        formHTML: formHTML
    };
})(window, document);
