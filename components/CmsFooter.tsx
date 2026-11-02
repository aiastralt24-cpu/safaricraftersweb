import type {InterfaceText} from '../lib/cms/interface-text';
import Link from 'next/link';
import type {GlobalSettings} from '../lib/cms/global-settings';
import type {SectionLink} from '../lib/cms/composition';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import './Footer.css';
import './CmsFooter.css';
function FooterLink({link}:{link:SectionLink}){return <Link href={link.href} target={link.newWindow?'_blank':undefined} rel={link.newWindow?'noopener noreferrer':undefined}>{link.label}</Link>;}
export function CmsFooter({settings,interfaceText}:{settings:Pick<GlobalSettings,'brand'|'contact'|'footer'|'social'>;interfaceText?:InterfaceText}){
 const {brand,contact,footer,social}=settings,phone=contact.phone.replace(/[ ().-]/g,'');
 return <footer className='footer cms-public-footer' aria-label={interfaceText?.footer??`${brand.name} footer`}>
 {footer.cta?.enabled&&<div className='container footer-journey-cta'><div><h2>{footer.cta.title}</h2>{footer.cta.body&&<p>{footer.cta.body}</p>}</div>{footer.cta.button&&<FooterLink link={footer.cta.button}/>}</div>}
 <div className='container cms-footer-grid'><section className='cms-footer-brand'><Link href={interfaceText?.homeHref??'/'} aria-label={interfaceText?.homeLabel??`${brand.name} home`}>{brand.logo?<picture>{brand.mobileLogo&&<source media='(max-width: 700px)' srcSet={publishedMediaUrl(brand.mobileLogo.assetId)}/>}<img src={publishedMediaUrl(brand.logo.assetId)} alt={brand.logo.decorative?'':brand.logo.alt} className='cms-footer-logo'/></picture>:<span className='cms-footer-name'>{brand.name}</span>}</Link>{brand.tagline&&<p>{brand.tagline}</p>}
 {contact.email&&<a href={`mailto:${contact.email}`}>{contact.email}</a>}{contact.phone&&(/^\+?[0-9]{3,20}$/.test(phone)?<a href={`tel:${phone}`}>{contact.phone}</a>:<p>{contact.phone}</p>)}
 {contact.addresses.map(address=><address key={address.id}><strong>{address.label}</strong><span>{address.address}</span></address>)}
 {social.length>0&&<nav aria-label={interfaceText?.socialProfiles??'Social profiles'}>{social.map(profile=><a key={profile.id} href={profile.url} target='_blank' rel='noopener noreferrer'>{profile.label}</a>)}</nav>}
 </section>{footer.groups.map(group=><nav key={group.id} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map(item=><li key={item.id}><FooterLink link={item.link}/></li>)}</ul></nav>)}</div>
 {footer.marks.length>0&&<div className='container cms-footer-marks'>{footer.marks.map(mark=><figure key={mark.id}><img src={publishedMediaUrl(mark.image.assetId)} alt={mark.image.decorative?'':mark.image.alt} loading='lazy'/><figcaption>{mark.label}{mark.image.caption&&<span>{mark.image.caption}</span>}{mark.image.credit&&<small>{mark.image.credit}</small>}</figcaption></figure>)}</div>}
 <div className='container cms-footer-bottom'><div>{footer.copyright&&<p>{footer.copyright}</p>}{footer.disclaimer&&<p>{footer.disclaimer}</p>}</div>{footer.legalLinks.length>0&&<nav aria-label={interfaceText?.legalLinks??'Legal links'}>{footer.legalLinks.map(item=><FooterLink key={item.id} link={item.link}/>)}</nav>}</div>
 </footer>;
}
