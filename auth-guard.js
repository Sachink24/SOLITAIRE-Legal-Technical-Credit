/* =====================================================================
   SOLITAIRE — Shared Auth Guard for Legal / Technical / Credit pages
   -----------------------------------------------------------------------
   Signs in against the SAME Supabase Auth users, roles and sessions as the
   main Associate App — no separate password, no separate users table.
   SOLITAIRE now has its own dedicated login screen (login.html); this guard
   sends unauthenticated visitors there and reuses whatever session already
   exists (same origin: sachink24.github.io).

   Usage: load AFTER supabase-config.js, and tag the <script> with the
   page's role so the guard knows which associate type owns this page:

     <script src="supabase-config.js"></script>
     <script src="auth-guard.js" data-page-role="legal"></script>

   Behavior:
   - No session -> redirect to the main app's login screen.
   - Session, but no matching active row in public.users -> sign out,
     redirect with a message.
   - Signed in as the matching associate role -> locked to the real
     evaluation role ("valuer" option), can't switch away.
   - Signed in as owner -> full access, can switch freely.
   - Signed in as anyone else (e.g. legal user opening credit.html) ->
     locked to "Agent (view only)".
   ===================================================================== */

(function () {
  // Hide the page until we've verified who's looking at it.
  document.write('<style id="sfm-auth-style">body{visibility:hidden}</style>');

  var PAGE_ROLE = (document.currentScript && document.currentScript.dataset.pageRole) || '';
  var LOGIN_URL = 'login.html';

  function overlay(msg) {
    var d = document.createElement('div');
    d.id = 'sfmAuthOverlay';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0A0D12;color:#ECE8E0;' +
      'display:flex;align-items:center;justify-content:center;font:15px Inter,system-ui,sans-serif;' +
      'visibility:visible;text-align:center;padding:24px;';
    d.textContent = msg || 'Checking access…';
    return d;
  }

  function addUserBadge(row) {
    var actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    var badge = document.createElement('div');
    badge.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:11px;' +
      'color:var(--ink-dim,#9BA3AE);margin-right:6px;white-space:nowrap;';
    var label = document.createElement('span');
    label.textContent = (row.name || row.email) + ' · ' + row.role;
    var btn = document.createElement('button');
    btn.textContent = 'Sign out';
    btn.style.cssText = 'background:none;border:1px solid var(--border,rgba(196,166,114,.3));' +
      'color:inherit;border-radius:100px;padding:4px 10px;font-size:11px;cursor:pointer;';
    btn.onclick = async function () {
      await window.SolitaireDB.sb.auth.signOut();
      window.location.href = LOGIN_URL;
    };
    badge.appendChild(label);
    badge.appendChild(btn);
    actions.prepend(badge);
  }

  function applyRole(row) {
    var sel = document.getElementById('roleSelect');
    if (!sel) return;
    var normRole = (row.role || '').toLowerCase();
    // The live DB uses 'tech' as the Technical associate's role value —
    // treat it as equivalent to a page tagged data-page-role="technical".
    var effectiveRole = (normRole === 'tech') ? 'technical' : normRole;
    if (normRole === 'owner' || normRole === 'admin') {
      // Owner/admin keeps full ability to switch views.
    } else if (effectiveRole === PAGE_ROLE) {
      sel.value = 'valuer';
      sel.disabled = true;
    } else {
      sel.value = 'agent';
      sel.disabled = true;
    }
    if (typeof sel.onchange === 'function') sel.onchange({ target: sel });
  }

  function reveal() {
    var style = document.getElementById('sfm-auth-style');
    if (style) style.remove();
    var ov = document.getElementById('sfmAuthOverlay');
    if (ov) ov.remove();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var ov = overlay('Checking access…');
    document.body.appendChild(ov);

    var sb = window.SolitaireDB && window.SolitaireDB.sb;
    if (!sb) {
      ov.textContent = 'Connection error. Redirecting to sign in…';
      setTimeout(function () { window.location.href = LOGIN_URL; }, 1200);
      return;
    }

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes && sessionRes.data && sessionRes.data.session;
    if (!session || !session.user) {
      window.location.href = LOGIN_URL + '?login_required=1';
      return;
    }

    var rowsRes = await sb.from('users').select('*').eq('auth_user_id', session.user.id).limit(1);
    var row = rowsRes && rowsRes.data && rowsRes.data[0];
    var AUTHORIZED_ROLES = ['admin', 'owner', 'legal', 'technical', 'tech', 'credit'];
    var roleForCheck = row && (row.role || '').toLowerCase();
    if (!row || row.status !== 'active' || AUTHORIZED_ROLES.indexOf(roleForCheck) === -1) {
      ov.textContent = 'Your account is not authorized to access the SOLITAIRE Underwriting Portal.';
      await sb.auth.signOut();
      setTimeout(function () { window.location.href = LOGIN_URL; }, 1800);
      return;
    }

    window.SolitaireAuth = { user: session.user, profile: row };

    // Give the page's own inline script a tick to finish its initial
    // render before we lock/relabel the role selector.
    setTimeout(function () {
      applyRole(row);
      addUserBadge(row);
      reveal();
    }, 60);
  });
})();
