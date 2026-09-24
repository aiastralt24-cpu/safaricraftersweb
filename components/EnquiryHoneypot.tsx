export function EnquiryHoneypot() {
 return <div aria-hidden="true" style={{position:"absolute",left:"-10000px",width:1,height:1,overflow:"hidden"}}><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>;
}
