import Link from 'next/link';
import type {GlobalSettings} from '../lib/cms/global-settings';
import {publishedMediaUrl} from '../lib/cms/published-journey';
export function CmsBrandMark({brand,homeHref='/',homeLabel=`${brand.name} home`}:{brand:GlobalSettings['brand'];homeHref?:string;homeLabel?:string}){return <Link href={homeHref} className='cms-header-brand' aria-label={homeLabel}>{brand.logo?<picture>{brand.mobileLogo&&<source media='(max-width: 700px)' srcSet={publishedMediaUrl(brand.mobileLogo.assetId)}/>}<img src={publishedMediaUrl(brand.logo.assetId)} alt={brand.logo.decorative?'':brand.logo.alt}/></picture>:<span>{brand.name}</span>}</Link>;}
