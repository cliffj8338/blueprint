/* Direct invitations reuse the existing waiting -> invited email trigger. */
(function (root) {
    'use strict';
    var pending = false;
    async function send(email, name) {
        if (pending) throw new Error('An invitation is already being processed.');
        if (typeof fbIsAdmin === 'undefined' || !fbIsAdmin
            || typeof showcaseMode !== 'undefined' && showcaseMode
            || typeof fbUser === 'undefined' || !fbUser || typeof fbDb === 'undefined' || !fbDb) {
            throw new Error('Sign in as an administrator to send invitations.');
        }
        email = String(email || '').trim().toLowerCase();
        name = String(name || '').trim();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Enter a valid email address.');
        }
        if (name.length > 200) throw new Error('Names must be 200 characters or fewer.');
        var uid = fbUser.uid;
        var ref = fbDb.collection('waitlist').doc(email.replace(/[^a-z0-9]/g, '_'));
        pending = true;
        try {
            // Use a transaction to avoid overwriting an existing registration.
            // A distinct update is necessary: the existing mailer listens for
            // status changes, not for documents created as already invited.
            var existing = await fbDb.runTransaction(async function (tx) {
                var doc = await tx.get(ref);
                if (!fbUser || fbUser.uid !== uid || !fbIsAdmin
                    || typeof showcaseMode !== 'undefined' && showcaseMode) {
                    throw new Error('The active administrator changed. Sign in again.');
                }
                if (doc.exists) {
                    var entry = doc.data();
                    // Legacy IDs replace punctuation, so distinct addresses can collide.
                    if (String(entry.email || '').trim().toLowerCase() !== email) {
                        throw new Error('This address conflicts with an existing invitation identifier. No record was changed.');
                    }
                    return entry.status === 'invited';
                }
                tx.set(ref, {
                    email: email, name: name || email, type: 'individual',
                    status: 'waiting', source: 'admin-direct',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return false;
            });
            if (existing) return { alreadyInvited: true, email: email };
            if (!fbUser || fbUser.uid !== uid || !fbIsAdmin
                || typeof showcaseMode !== 'undefined' && showcaseMode) {
                throw new Error('Administrator changed before the invitation was queued. The entry remains available in the waitlist.');
            }
            try {
                await ref.update({ status: 'invited' });
            } catch (_) {
                throw new Error('The entry is saved, but its invitation could not be queued. Try again or use Invite beside the waitlist entry.');
            }
            return { alreadyInvited: false, email: email };
        } finally {
            pending = false;
        }
    }
    root.BPDirectInvite = { send: send };
})(window);
