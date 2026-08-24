/* SOLITAIRE shared Supabase client.
   IMPORTANT: use the SAME Supabase project as Associate App.
*/
(function(){
  const SUPABASE_URL = "https://nbpvamrwzqrgoiwpadwc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_GrJ_9z_y903WFMGjoAg82Q_cG3N2_Jx";

  function getStorage(){
    try{
      return window.localStorage;
    }catch(e){
      return window.sessionStorage;
    }
  }

  const sb = window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{
      storage:getStorage(),
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  });

  window.SolitaireDB = {
    sb,
    SUPABASE_URL,
    SUPABASE_KEY
  };
})();
