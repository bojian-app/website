import Image from "next/image";

export function LandscapeHome() {
  return (
    <main id="main" className="minimal-home" aria-labelledby="landing-title">
      <div className="landscape-background" aria-hidden="true">
        <Image
          className="landscape-image"
          src="/backgrounds/moraine-lake.jpg"
          alt=""
          fill
          sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          preload
        />
        <div className="landscape-shade" />
      </div>
      <div className="brand-stage">
        <h1 id="landing-title" className="brand-title">
          助力失业者找到好的归属
        </h1>
      </div>
    </main>
  );
}
