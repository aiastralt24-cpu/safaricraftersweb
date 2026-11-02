'use client';

import {useEffect, useRef, useState} from 'react';
import type {AviationSectionData} from '../lib/cms/private-aviation-content';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import './CmsAviationHeroMedia.css';

type Media = AviationSectionData<'aviationHero'>['media'];
type Connection = {saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, callback: () => void) => void; removeEventListener?: (type: string, callback: () => void) => void};
function Player({media}: {media: Media}) {
  const video = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const small = matchMedia('(max-width: 600px)');
    const connection = (navigator as Navigator & {connection?: Connection}).connection;
    const update = () => {
      setMobile(small.matches);
      setAllowed(!reduced.matches && !document.hidden && !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? ''));
    };
    update();
    reduced.addEventListener('change', update); small.addEventListener('change', update);
    document.addEventListener('visibilitychange', update); connection?.addEventListener?.('change', update);
    return () => {
      reduced.removeEventListener('change', update); small.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update); connection?.removeEventListener?.('change', update);
    };
  }, []);
  const asset = media.background.kind === 'video' ? (mobile ? media.background.mobileAssetId ?? media.background.desktopAssetId : media.background.desktopAssetId) : null;
  const poster = mobile ? media.mobilePoster ?? media.poster : media.poster;
  const playing = Boolean(asset && allowed && !paused && failed !== asset);
  useEffect(() => {
    if (!playing || !asset || !video.current) return;
    let current = true;
    video.current.play().catch(() => { if (current) setFailed(asset); });
    return () => { current = false; };
  }, [playing, asset]);
  if (asset && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(asset)) throw Error('Invalid video identifier.');
  return <div className='cms-aviation-hero-player'>
    <picture>{media.mobilePoster && <source media='(max-width: 600px)' srcSet={publishedMediaUrl(media.mobilePoster.assetId)}/>}<img src={publishedMediaUrl(media.poster.assetId)} alt={poster.decorative ? '' : poster.alt} loading='eager' fetchPriority='high'/></picture>
    {playing && asset && <video ref={video} key={asset} src={`/api/cms/published/videos/${asset}`} muted loop playsInline preload='metadata' aria-hidden='true' onError={() => setFailed(asset)}/>}
    {asset && allowed && failed !== asset && <button type='button' aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume background video' : 'Pause background video'}</button>}
    {(poster.caption || poster.credit) && <p className='cms-aviation-poster-credit'>{[poster.caption, poster.credit].filter(Boolean).join(' · ')}</p>}
  </div>;
}
/** Only for caller-authorized public projections. Same-origin delivery endpoints
 * independently enforce current publication and media rights. No original URLs. */
export function CmsAviationHeroMedia({media}: {media: Media}) {
  return <Player key={JSON.stringify(media)} media={media}/>;
}
