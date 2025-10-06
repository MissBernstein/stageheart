// @keep - Smart image component with WebP optimization for future performance improvements
import React, { useState } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  webp?: string; // optional explicit webp path
}

// Basic component that prefers provided webp (or auto-replaces .png with .webp) and falls back on error.
export const SmartImage: React.FC<SmartImageProps> = ({ src, webp, alt = '', ...rest }) => {
  const [failed, setFailed] = useState(false);
  const derivedWebp = webp || (src?.endsWith('.png') ? src.replace(/\.png$/, '.webp') : undefined);
  if (!src) return null;
  if (failed || !derivedWebp) return <img src={src} alt={alt} {...rest} />;
  return (
    <picture>
      <source srcSet={derivedWebp} type="image/webp" onError={() => setFailed(true)} />
      <img src={src} alt={alt} {...rest} />
    </picture>
  );
};

export default SmartImage;