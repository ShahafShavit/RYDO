/** Required Mapbox + data-provider credits (default map controls hidden on live maps). */
export default function LiveRideMapAttribution() {
  return (
    <p className="pointer-events-auto pt-0.5 text-center text-[8px] leading-none text-fg-subtle/45">
      <a
        href="https://www.mapbox.com/about/maps/"
        target="_blank"
        rel="noreferrer noopener"
        className="text-inherit no-underline hover:text-fg-subtle/70"
      >
        Mapbox
      </a>
      <span className="mx-0.5" aria-hidden>
        ·
      </span>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer noopener"
        className="text-inherit no-underline hover:text-fg-subtle/70"
      >
        OSM
      </a>
    </p>
  );
}
