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

export function IconChevronRight(props: IconProps = {}) {
  return svg(props, 'M9 18l6-6-6-6');
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

export function IconChevronDown(props: IconProps = {}) {
  return svg(props, 'M6 9l6 6 6-6');
}

export function IconTrash(props: IconProps = {}) {
  return svg(props, 'M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');
}

export function IconImage(props: IconProps = {}) {
  return svg(props, 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z', 'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M21 15l-5-5L5 21');
}

export function IconWarning(props: IconProps = {}) {
  return svg(props, 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01');
}

export function IconPackage(props: IconProps = {}) {
  return svg(props, 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12');
}

export function IconFileText(props: IconProps = {}) {
  return svg(props, 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8');
}

export function IconSave(props: IconProps = {}) {
  return svg(props, 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8V3');
}

export function IconEkokanLogo({ size = 28, className, 'aria-hidden': ariaHidden = true }: IconProps = {}) {
  const numericWidth = Number(size) || 28;
  const numericHeight = Math.round((numericWidth * 607) / 703);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 703 607"
      width={numericWidth}
      height={numericHeight}
      className={className}
      aria-hidden={ariaHidden}
      fill="currentColor"
    >
      <g transform="translate(-30.072629,635.941460) scale(0.1,-0.1)" fill="currentColor" stroke="none">
        <path d="M7262 6334 c-98 -45 -396 -152 -562 -202 -475 -144 -1087 -269 -1585 -326 -709 -81 -1586 -89 -2373 -21 -787 68 -1687 270 -2315 519 -66 26 -122 45 -125 41 -10 -10 38 -143 90 -248 44 -88 64 -115 142 -192 146 -145 264 -197 606 -265 651 -130 1389 -207 2178 -227 l262 -6 0 -319 0 -318 -732 -2 c-744 -3 -817 -2 -823 4 -2 2 -8 48 -15 103 -30 263 -76 368 -195 450 -41 28 -161 72 -171 62 -1 -1 8 -65 21 -142 23 -142 55 -400 55 -448 l0 -27 -375 0 -375 0 6 -27 c21 -91 82 -181 145 -213 35 -19 60 -20 327 -20 l289 0 8 -165 c11 -265 -13 -774 -56 -1165 -77 -711 -233 -1370 -462 -1960 -56 -144 -176 -417 -234 -534 -24 -48 -42 -90 -39 -93 3 -3 42 -7 88 -10 245 -16 431 88 533 297 177 365 364 1237 439 2050 38 414 52 1024 33 1418 l-8 162 1598 0 c1542 0 1599 1 1639 19 86 39 154 121 169 204 l7 37 -706 0 -706 0 0 318 0 319 288 6 c710 17 1384 84 2042 203 418 75 562 129 708 267 96 91 170 219 226 392 14 44 26 81 26 82 0 6 -17 0 -68 -23z"/>
        <path d="M5919 5376 c-163 -44 -264 -183 -293 -406 -50 -375 -74 -964 -57 -1400 6 -168 14 -342 18 -387 l6 -83 -201 0 -201 0 -3 118 c-2 64 -4 285 -6 491 -1 206 -4 376 -7 379 -9 9 -234 -17 -335 -38 -255 -54 -490 -172 -545 -273 -10 -20 -16 -39 -12 -43 3 -4 73 16 154 44 82 28 184 60 228 71 95 25 297 60 308 54 4 -2 7 -512 7 -1132 l0 -1127 -94 -12 c-351 -44 -727 -207 -968 -419 -79 -69 -166 -170 -195 -226 l-16 -31 49 41 c89 74 247 173 379 238 302 148 582 221 895 234 l155 6 2 690 2 690 213 0 212 0 18 -153 c65 -566 182 -1158 299 -1518 22 -69 39 -128 36 -130 -2 -2 -359 -3 -793 -2 l-789 3 110 37 c122 40 228 62 385 78 58 6 127 18 154 27 48 15 136 88 136 111 0 17 -233 15 -377 -3 -457 -59 -902 -276 -1115 -544 -123 -154 -172 -310 -137 -436 l11 -40 25 85 c13 46 36 107 51 134 54 100 213 246 323 296 43 19 67 20 1085 20 l1040 0 35 -46 c73 -98 190 -163 332 -185 70 -11 211 -8 224 4 3 4 -22 65 -56 137 -250 526 -430 1063 -551 1645 -38 187 -80 428 -80 468 0 16 18 17 245 17 225 0 249 2 284 20 51 26 97 82 117 145 9 27 19 56 22 63 3 9 -71 12 -352 12 -299 0 -356 2 -356 14 0 8 -7 74 -15 148 -32 294 -47 586 -47 913 0 440 21 734 78 1062 13 78 24 145 24 148 0 7 -7 6 -61 -9z"/>
        <path d="M6026 4748 c-3 -13 -7 -71 -10 -130 l-5 -108 225 0 c247 0 267 4 326 67 31 33 76 118 84 162 l7 31 -312 0 -311 0 -4 -22z"/>
        <path d="M4069 4283 c-6 -16 -24 -65 -41 -111 -37 -101 -81 -169 -128 -197 -48 -28 -139 -27 -203 3 l-48 21 7 -22 c13 -41 46 -78 97 -107 193 -110 401 108 357 372 -13 73 -24 84 -41 41z"/>
        <path d="M3506 3838 c-46 -71 -85 -209 -86 -301 0 -84 29 -193 105 -390 88 -230 113 -339 97 -423 -21 -102 -48 -140 -210 -299 -225 -220 -289 -330 -300 -515 -9 -158 40 -294 198 -550 99 -161 121 -209 146 -315 l19 -80 3 56 c5 99 -30 234 -108 415 -39 91 -80 200 -91 242 -23 89 -25 205 -4 281 31 117 59 157 233 330 237 236 277 307 276 491 -1 121 -36 233 -130 416 -84 163 -118 243 -138 332 -20 87 -21 223 -2 285 16 52 14 58 -8 25z"/>
        <path d="M2440 2363 l0 -1350 98 5 c116 5 299 -11 432 -38 52 -11 174 -47 270 -79 96 -33 176 -58 179 -56 2 3 -29 38 -70 78 -137 135 -347 215 -661 253 l-48 5 0 1185 0 1184 53 0 c124 -1 349 -44 510 -99 104 -36 112 -26 35 44 -125 112 -399 197 -685 212 l-113 6 0 -1350z"/>
        <path d="M4026 3644 c-27 -69 20 -152 149 -264 144 -126 165 -157 145 -229 -6 -25 -33 -64 -71 -107 -89 -98 -89 -97 -82 -335 5 -183 3 -215 -16 -307 -35 -166 -86 -305 -186 -507 -89 -178 -125 -262 -125 -289 0 -6 17 17 38 51 20 34 84 131 141 215 216 319 293 544 292 857 l-1 163 50 55 c78 85 102 133 108 213 4 61 1 76 -23 125 -23 47 -40 65 -103 108 -127 87 -168 124 -227 197 -56 70 -78 84 -89 54z"/>
      </g>
    </svg>
  );
}
