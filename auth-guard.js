/* SOLITAIRE authentication/role guard.
   Load after supabase-config.js.
   Example:
   <script src="auth-guard.js" data-page-role="legal"></script>
*/
(function(){
  const LOGIN_URL='login.html';
  const PAGE_ROLE=(document.currentScript && document.currentScript.dataset.pageRole)||'';
  const ALLOWED=['admin','owner','legal','technical','tech','credit'];

  function hide(){
    const s=document.createElement('style');
    s.id='sfm-auth-style';
    s.textContent='body{visibility:hidden!important}';
    document.head.appendChild(s);
  }
  function reveal(){
    const s=document.getElementById('sfm-auth-style');
    if(s)s.remove();
  }
  function fail(message){
    console.error(message);
    window.location.href=LOGIN_URL+'?login_required=1';
  }

  hide();

  document.addEventListener('DOMContentLoaded',async()=>{
    const sb=window.SolitaireDB && window.SolitaireDB.sb;
    if(!sb)return fail('Supabase client unavailable');

    try{
      // getUser() validates the JWT with Supabase Auth.
      const {data:{user},error:userError}=await sb.auth.getUser();
      if(userError || !user){
        return fail('No authenticated Supabase user');
      }

      const {data:profile,error:profileError}=await sb
        .from('users')
        .select('id,auth_user_id,name,email,role,status')
        .eq('auth_user_id',user.id)
        .maybeSingle();

      if(profileError){
        console.error('Profile error:',profileError);
        return fail('Unable to read user profile');
      }

      if(!profile || profile.status!=='active' || !ALLOWED.includes(profile.role)){
        await sb.auth.signOut();
        return fail('Unauthorized account');
      }

      // Admin/owner can open all sections. Other roles are locked to their page.
      if(profile.role!=='admin' && profile.role!=='owner'){
        const normalized=profile.role==='tech'?'technical':profile.role;
        if(normalized!==PAGE_ROLE){
          alert('This page is restricted to your assigned role.');
          return fail('Wrong role for page');
        }
      }

      window.SolitaireAuth={user,profile};
      console.log('SOLITAIRE AUTH READY:',user.id,profile.role);
      reveal();
      document.dispatchEvent(new CustomEvent('solitaire-auth-ready',{detail:window.SolitaireAuth}));
    }catch(err){
      console.error('Auth guard error:',err);
      fail('Authentication check failed');
    }
  });
})();
