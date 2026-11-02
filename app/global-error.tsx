'use client';
import {GlobalRecovery} from '../components/GlobalRecovery';
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <html lang="en"><head><title>Website temporarily unavailable | Safari Crafters</title><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex, nofollow"/></head><body style={{margin:0}}><GlobalRecovery reset={reset}/></body></html>;
}
