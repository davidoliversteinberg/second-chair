import mark from "./assets/optimizely-o.svg";

export function BrandMark({ size = 32 }) {
  return (
    <img
      className="brand-mark"
      src={mark}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
