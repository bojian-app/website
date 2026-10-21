import Image from "next/image";
export function Phone({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">
        <Image
          src={src}
          alt={alt}
          width={1440}
          height={3168}
          sizes="(max-width: 600px) 230px, 320px"
          loading={priority ? "eager" : "lazy"}
        />
        <span className="phone-camera" aria-hidden="true" />
      </div>
      <span className="phone-side" aria-hidden="true" />
    </div>
  );
}
