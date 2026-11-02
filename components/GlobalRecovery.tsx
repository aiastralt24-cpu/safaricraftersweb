'use client';
/** Emergency recovery must not depend on the router, shared layout, styles or CMS. */
export function GlobalRecovery({reset}:{reset:()=>void}){
 const action={display:'inline-block',padding:'14px 24px',border:'1px solid #26372b',borderRadius:4,font:'inherit',cursor:'pointer',textDecoration:'none'};
 return <main style={{boxSizing:'border-box',minHeight:'100vh',padding:'max(48px, 12vh) 24px',background:'#f3eee4',color:'#26372b',fontFamily:'system-ui, sans-serif',textAlign:'center',overflowWrap:'anywhere'}}>
  <div style={{maxWidth:640,margin:'0 auto'}}>
   <p style={{fontSize:14,letterSpacing:2}}>SAFARI CRAFTERS</p>
   <h1 style={{fontSize:'clamp(32px, 6vw, 52px)',fontWeight:500,lineHeight:1.15,margin:'32px 0 24px'}}>We couldn’t load the website.</h1>
   <p style={{fontSize:18,lineHeight:1.6}}>Please try again. If the problem continues, our team can help with your journey.</p>
   <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:12,marginTop:32}}>
    <button style={{...action,background:'#26372b',color:'#fff'}} onClick={reset} type="button">Try again</button>
    <a style={{...action,background:'transparent',color:'#26372b'}} href="/">Return home</a>
   </div>
   <p style={{marginTop:32,fontSize:16,lineHeight:1.6}}><a href="mailto:info@safaricrafters.com" style={{color:'inherit',textUnderlineOffset:4}}>info@safaricrafters.com</a></p>
  </div>
 </main>;
}
