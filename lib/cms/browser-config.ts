/** Configuration filter, not JWT authentication. Never serialize a privileged
 * server key into page props, even if it was placed in the wrong environment var. */
export function publicCmsConfig(url:string|undefined,key:string|undefined):{url:string;key:string}|null {
  if(!url||!key)return null;
  try{
    const origin=new URL(url);
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)return null;
    let publicKey=/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key);
    if(!publicKey){
      const parts=key.split('.');
      if(parts.length===3){const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));publicKey=payload.role==='anon';}
    }
    return publicKey?{url:origin.origin,key}:null;
  }catch{return null;}
}
