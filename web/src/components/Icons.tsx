/**
 * Consistent SVG icon system for Ekokan.
 * All icons render at currentColor, inherit font-size for sizing,
 * and use a uniform 2px stroke weight at 20×20 viewBox.
 */

interface IconProps {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

const defaults: IconProps = { size: 18, 'aria-hidden': true };

function svg(props: IconProps, ...paths: string[]) {
  const { size, className, ...rest } = { ...defaults, ...props };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function svgFilled(props: IconProps, fillD: string, ...strokePaths: string[]) {
  const { size, className, ...rest } = { ...defaults, ...props };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d={fillD} fill="currentColor" stroke="currentColor" strokeWidth={2} />
      {strokePaths.map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={2} />)}
    </svg>
  );
}

export function IconSearch(props: IconProps = {}) {
  return svg(props, 'M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5z', 'M16 16l4.5 4.5');
}

export function IconUpload(props: IconProps = {}) {
  return svg(props, 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12');
}

export function IconStar(props: IconProps = {}) {
  return svg(props, 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z');
}

export function IconStarFilled(props: IconProps = {}) {
  return svgFilled(props, 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z');
}

export function IconEdit(props: IconProps = {}) {
  return svg(props, 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z');
}

export function IconBan(props: IconProps = {}) {
  return svg(props, 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M4.93 4.93l14.14 14.14');
}

export function IconCheck(props: IconProps = {}) {
  return svg(props, 'M20 6L9 17l-5-5');
}

export function IconX(props: IconProps = {}) {
  return svg(props, 'M18 6L6 18', 'M6 6l12 12');
}

export function IconFilm(props: IconProps = {}) {
  return svg(props,
    'M19.82 2H4.18A2.18 2.18 0 0 0 2 4.18v15.64A2.18 2.18 0 0 0 4.18 22h15.64A2.18 2.18 0 0 0 22 19.82V4.18A2.18 2.18 0 0 0 19.82 2z',
    'M7 2v20', 'M17 2v20', 'M2 12h20', 'M2 7h5', 'M2 17h5', 'M17 17h5', 'M17 7h5'
  );
}

export function IconHeart(props: IconProps = {}) {
  return svg(props, 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z');
}

export function IconHeartFilled(props: IconProps = {}) {
  return svgFilled(props, 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z');
}

export function IconPlus(props: IconProps = {}) {
  return svg(props, 'M12 5v14', 'M5 12h14');
}

export function IconChevronLeft(props: IconProps = {}) {
  return svg(props, 'M15 18l-6-6 6-6');
}

export function IconExternalLink(props: IconProps = {}) {
  return svg(props, 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14L21 3');
}

export function IconFilter(props: IconProps = {}) {
  return svg(props, 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z');
}

export function IconTag(props: IconProps = {}) {
  return svg(props,
    'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z',
    'M7 7h.01'
  );
}

export function IconArrowLeft(props: IconProps = {}) {
  return svg(props, 'M19 12H5', 'M12 19l-7-7 7-7');
}

export function IconShield(props: IconProps = {}) {
  return svg(props, 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');
}

export function IconSliders(props: IconProps = {}) {
  return svg(props, 'M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6');
}

export function IconUsers(props: IconProps = {}) {
  return svg(props, 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75');
}

export function IconUser(props: IconProps = {}) {
  return svg(props, 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z');
}

export function IconRefresh(props: IconProps = {}) {
  return svg(props, 'M23 4v6h-6', 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10');
}

export function IconBolt(props: IconProps = {}) {
  return svg(props, 'M13 2L3 14h9l-1 8 10-12h-9l1-8z');
}

