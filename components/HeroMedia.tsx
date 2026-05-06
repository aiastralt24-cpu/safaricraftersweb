"use client";

import { useState } from "react";
import type { HeroMedia as HeroMediaData } from "@/lib/luxury";

export function HeroMedia({ media }: { media: HeroMediaData }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = media.type === "video" && !videoFailed && Boolean(media.videoMp4 || media.videoWebm);

  return (
    <div className="hero-media" aria-label={media.alt}>
      {showVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={media.posterImage.src}
          onError={() => setVideoFailed(true)}
        >
          {media.videoWebm ? <source src={media.videoWebm} type="video/webm" /> : null}
          {media.videoMp4 ? <source src={media.videoMp4} type="video/mp4" /> : null}
        </video>
      ) : null}
      <picture className={showVideo ? "hero-poster hero-poster-fallback" : "hero-poster"}>
        <source media="(max-width: 760px)" srcSet={media.mobilePosterImage.src} />
        <img src={media.posterImage.src} alt={media.alt} />
      </picture>
    </div>
  );
}
