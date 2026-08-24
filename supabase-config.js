/* =====================================================================
   SOLITAIRE — Shared Supabase Configuration
   -----------------------------------------------------------------------
   Used by: index.html, legal.html, technical.html, credit.html
   Project: nbpvamrwzqrgoiwpadwc  (Solitaire Finz Mart)

   Load this file AFTER the supabase-js CDN script and BEFORE your page's
   own <script> block, e.g.:

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="supabase-config.js"></script>
     <script> ... page code that uses window.SolitaireDB ... </script>

   Everything is namespaced under window.SolitaireDB so it can't collide
   with each page's own `state`, `sb`, etc.
   ===================================================================== */

(function () {
    const SUPABASE_URL = "https://nbpvamrwzqrgoiwpadwc.supabase.co";
    const SUPABASE_KEY = "sb_publishable_GrJ_9z_y903WFMGjoAg82Q_cG3N2_Jx";
    const REMEMBER_KEY = 'sfm_remember_device';

    // "Remember this device" (set on login.html) decides whether the auth
    // session survives a browser restart (localStorage) or lasts only the
    // current tab session (sessionStorage). Defaults to remembered.
    function authStorage() {
        try {
            const v = window.localStorage.getItem(REMEMBER_KEY);
            return (v === '0') ? window.sessionStorage : window.localStorage;
        } catch (e) { return window.localStorage; }
    }

    const sb = (window.supabase && window.supabase.createClient)
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { storage: authStorage(), persistSession: true, autoRefreshToken: true }
        })
        : null;

    const MEDIA_BUCKET = 'evaluation-media';

    /* -------------------------------------------------------------
       LEADS  (associate-app "leads" table)
       leads columns: id (bigint PK), borrower (jsonb), loan_type,
       loan_amount, credit, institution_type, institution_name,
       property (jsonb), co_applicants (jsonb[]), stage, ...
       ------------------------------------------------------------- */

    // Search leads by numeric id or by borrower name (partial match).
    async function searchLeads(term) {
        if (!sb) return [];
        term = (term || '').trim();
        let query = sb.from('leads')
            .select('id, borrower, loan_type, loan_amount, institution_name, property, stage, created_at')
            .order('id', { ascending: false })
            .limit(20);

        if (term) {
            if (/^\d+$/.test(term)) {
                query = sb.from('leads')
                    .select('id, borrower, loan_type, loan_amount, institution_name, property, stage, created_at')
                    .eq('id', Number(term));
            } else {
                query = query.ilike('borrower->>name', `%${term}%`);
            }
        }
        const { data, error } = await query;
        if (error) { console.error('SolitaireDB.searchLeads error:', error); return []; }
        return data || [];
    }

    // Fetch a single lead row by its numeric id.
    async function getLeadById(id) {
        if (!sb || id === null || id === undefined || id === '') return null;
        const { data, error } = await sb.from('leads').select('*').eq('id', Number(id)).maybeSingle();
        if (error) { console.error('SolitaireDB.getLeadById error:', error); return null; }
        return data;
    }

    // Canonical loan application number derived from a lead's numeric id.
    // Kept as its own function so every page generates the SAME app no.
    function loanAppNoForLead(lead) {
        return 'LN-' + lead.id;
    }

    // Human-readable one-line label for a lead, e.g. for a picker dropdown.
    function leadLabel(lead) {
        const b = lead.borrower || {};
        const bits = ['#' + lead.id, b.name || 'Unnamed', lead.loan_type || ''].filter(Boolean);
        return bits.join(' — ');
    }

    // Best-known mapping of a lender's short/free-text name in `leads`
    // to the exact option strings used in the Legal/Technical dropdowns.
    const BANK_ALIASES = {
        'ICICI': 'ICICI Bank',
        'AXIS': 'Axis Bank',
        'SBI': 'State Bank of India',
        'STATE BANK': 'State Bank of India',
        'PNB': 'PNB Housing',
        'HDFC': 'HDFC Ltd',
        'PIRAMAL': 'Piramal Finance',
        'GODREJ': 'Godrej Capital',
        'SHRIRAM': 'Shriram Finance',
        'TATA': 'Tata Capital',
        'IIFL': 'IIFL Finance'
    };

    function normalizeBankName(raw) {
        const up = (raw || '').toUpperCase();
        for (const key in BANK_ALIASES) {
            if (up.includes(key)) return BANK_ALIASES[key];
        }
        return '';
    }

    // Converts a `leads` row into the flat field shape the Legal /
    // Technical report forms expect (state.data). Only fills fields that
    // exist on the lead — anything unknown is left for the user to fill.
    function mapLeadToReportData(lead) {
        if (!lead) return {};
        const b = lead.borrower || {};
        const p = lead.property || {};
        const co = Array.isArray(lead.co_applicants) ? lead.co_applicants : [];

        const borrowerNames = [b.name, ...co.map(c => (c.name ? c.name + ' (Co-Applicant)' : null))]
            .filter(Boolean).join(', ');

        const propertyAddress = [p.address, p.city, p.state, p.pincode]
            .filter(Boolean).join(', ');

        return {
            loanAppNo: loanAppNoForLead(lead),
            borrowers: borrowerNames,
            propertyAddress: propertyAddress,
            reportDate: new Date().toISOString().slice(0, 10),
            bankName: normalizeBankName(lead.institution_name),
            loanType: lead.loan_type || '',
            requestedLoanAmount: lead.loan_amount || '',
            cibilScore: b.cibilScore || '',
            __leadId: lead.id,
            __rawLead: lead   // kept in case a page wants deeper fields (docs, valuation, etc.)
        };
    }

    /* -------------------------------------------------------------
       EVALUATION REPORTS  (evaluation_reports table)
       columns: report_type ('legal'|'technical'), loan_app_no, status,
       data (jsonb), gps, signature_path, updated_by, ...
       ------------------------------------------------------------- */

    async function loadReportFromCloud(reportType, appNo) {
        if (!sb || !appNo) return null;
        const { data, error } = await sb.from('evaluation_reports').select('*')
            .eq('report_type', reportType).eq('loan_app_no', appNo).maybeSingle();
        if (error) { console.error('SolitaireDB.loadReportFromCloud error:', error); return null; }
        return data;
    }

    async function saveReportToCloud(payload) {
        if (!sb) return { error: { message: 'Supabase client not available' } };
        const { error } = await sb.from('evaluation_reports')
            .upsert(payload, { onConflict: 'report_type,loan_app_no' });
        if (error) console.error('SolitaireDB.saveReportToCloud error:', error);
        return { error };
    }

    async function uploadDataUrlToStorage(dataUrl, path, contentType) {
        if (!sb) return false;
        try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, blob, { upsert: true, contentType });
            return !error;
        } catch (err) { console.error('SolitaireDB.uploadDataUrlToStorage error:', err); return false; }
    }

    async function signedUrlFor(path, expiresSeconds) {
        if (!sb || !path) return null;
        const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUrl(path, expiresSeconds || 3600);
        if (error) { console.error('SolitaireDB.signedUrlFor error:', error); return null; }
        return data ? data.signedUrl : null;
    }

    /* -------------------------------------------------------------
       WORKFLOW — submit / approve / reject / rework lifecycle
       Used by legal.html, technical.html, credit.html, admin.html.
       ------------------------------------------------------------- */

    // Lightweight status-only update (no full jsonb re-upload) — used for
    // approve/reject/rework/submit metadata columns on evaluation_reports.
    async function patchReportStatus(reportType, appNo, patch) {
        if (!sb || !appNo) return { error: { message: 'Supabase client not available or missing app no' } };
        const { error } = await sb.from('evaluation_reports')
            .update(patch)
            .eq('report_type', reportType).eq('loan_app_no', appNo);
        if (error) console.error('SolitaireDB.patchReportStatus error:', error);
        return { error };
    }

    // Append-only audit trail row (public.workflow_history). Resolves the
    // acting user's display name/role from public.users via the live session
    // so callers don't have to pass it in.
    async function logWorkflowEvent({ leadId, applicationNo, action, oldStatus, newStatus, remarks }) {
        if (!sb) return { error: { message: 'Supabase client not available' } };
        let userName = null, role = null;
        try {
            const { data: sessData } = await sb.auth.getSession();
            const uid = sessData && sessData.session && sessData.session.user && sessData.session.user.id;
            if (uid) {
                const { data: prof } = await sb.from('users').select('name,email,role').eq('auth_user_id', uid).maybeSingle();
                if (prof) { userName = prof.name || prof.email; role = prof.role; }
            }
        } catch (e) { /* best-effort — history row still gets written without identity */ }

        const { error } = await sb.from('workflow_history').insert({
            lead_id: leadId || null,
            application_no: applicationNo || null,
            action,
            old_status: oldStatus || null,
            new_status: newStatus || null,
            user_name: userName,
            role,
            remarks: remarks || null
        });
        if (error) console.error('SolitaireDB.logWorkflowEvent error:', error);
        return { error };
    }

    // Mirrors a section's status onto the `leads` row so the Admin Dashboard
    // and the main Associate App can read progress without joining
    // evaluation_reports. reportType is 'legal' | 'technical' | 'credit'.
    async function syncLeadStatus(leadId, reportType, status, extra) {
        if (!sb || !leadId) return { error: { message: 'Missing client or leadId' } };
        const patch = Object.assign({}, extra || {});
        patch[reportType + '_status'] = status;
        if (status === 'submitted') {
            patch[reportType + '_submitted'] = true;
            patch[reportType + '_submitted_date'] = new Date().toISOString();
        }
        const { error } = await sb.from('leads').update(patch).eq('id', leadId);
        if (error) console.error('SolitaireDB.syncLeadStatus error:', error);
        return { error };
    }

    // Full case bundle for the Admin case-detail view: the lead row plus its
    // legal/technical/credit reports and its audit trail, in one call.
    async function getCaseBundle(leadId) {
        if (!sb || !leadId) return null;
        const [{ data: lead }, { data: reports }, { data: history }, { data: sanction }] = await Promise.all([
            sb.from('leads').select('*').eq('id', leadId).maybeSingle(),
            sb.from('evaluation_reports').select('*').eq('lead_id', leadId),
            sb.from('workflow_history').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
            sb.from('sanctions').select('*').eq('lead_id', leadId).maybeSingle()
        ]);
        const byType = { legal: null, technical: null, credit: null };
        (reports || []).forEach(r => { byType[r.report_type] = r; });
        return { lead: lead || null, reports: byType, history: history || [], sanction: sanction || null };
    }

    window.SolitaireDB = {
        sb, SUPABASE_URL, SUPABASE_KEY, MEDIA_BUCKET,
        // leads
        searchLeads, getLeadById, loanAppNoForLead, leadLabel, mapLeadToReportData,
        // evaluation_reports
        loadReportFromCloud, saveReportToCloud, uploadDataUrlToStorage, signedUrlFor,
        // workflow
        patchReportStatus, logWorkflowEvent, syncLeadStatus, getCaseBundle
    };
})();
