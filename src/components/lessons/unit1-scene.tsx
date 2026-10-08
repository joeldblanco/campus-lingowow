import Image from 'next/image'

/** Complete illustrated canvas. White fades protect content, without shaped crops. */
export function Unit1Scene({ src, side = 'right', mobile = false }: { src: string; side?: 'left' | 'right'; mobile?: boolean }) {
  const isCarlReading = src === '/images/lessons/this-is-me/carl.webp'
  return <div aria-hidden="true" data-unit1-scene={mobile ? 'mobile' : 'canvas'} data-scene-side={side}
    className={mobile ? 'unit1-scene-mobile relative order-2 h-[300px] w-full overflow-hidden lg:hidden' : 'unit1-scene-canvas pointer-events-none absolute inset-0 hidden overflow-hidden lg:block'}>
    <Image key={src} src={src} alt="" fill unoptimized sizes={mobile ? '100vw' : '(min-width: 1024px) 100vw, 1px'} style={{ objectPosition: 'center top' }} className={`object-cover${isCarlReading ? ' -scale-x-100' : ''}`} />
    {!mobile && <div className="unit1-scene-fade absolute inset-0" style={{ background: isCarlReading
      ? 'linear-gradient(to right, #fff 0%, #fff 38%, #ffffffee 42%, transparent 58%)'
      : side === 'left'
        ? 'linear-gradient(to left, #fff 0%, #fffffff5 28%, #ffffffbd 42%, transparent 65%)'
        : 'linear-gradient(to right, #fff 0%, #fffffff5 28%, #ffffffbd 42%, transparent 65%)' }} />}
  </div>
}
