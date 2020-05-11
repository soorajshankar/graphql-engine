declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare namespace SvgPanZoom {
  export interface Instance {}
}

declare module 'react-bootstrap/lib/Tooltip';
declare module 'react-bootstrap/lib/Col';
declare module 'react-bootstrap/lib/Row';
