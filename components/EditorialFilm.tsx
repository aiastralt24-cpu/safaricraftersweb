import type { EditorialVideo } from "@/lib/data";

export function EditorialFilm({ video }: { video?: EditorialVideo }) {
  if (!video?.mp4 || !video.poster?.src || !video.title) return null;
  return (
    <figure className="container detail-section" style={{ marginBlock: "3rem" }}>
      <video controls preload="none" playsInline poster={video.poster.src} aria-label={video.title} style={{ width: "100%", maxHeight: "75vh", background: "#142015" }}>
        {video.webm ? <source src={video.webm} type="video/webm" /> : null}
        <source src={video.mp4} type="video/mp4" />
        Your browser cannot play this video.
      </video>
      {video.caption ? <figcaption>{video.caption}</figcaption> : null}
      {video.transcript ? <details><summary>Read the transcript</summary><p style={{ whiteSpace: "pre-line" }}>{video.transcript}</p></details> : null}
    </figure>
  );
}
