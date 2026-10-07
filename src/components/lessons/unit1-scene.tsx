import Image from 'next/image'

/** Complete illustrated canvas. White fades protect content, without shaped crops. */
export function Unit1Scene({ src, side = 'right', mobile = false }: { src: string; side?: 'left' | 'right'; mobile?: boolean }) {
  return <div aria-hidden="true" data-unit1-scene={mobile ? 'mobile' : 'canvas'} data-scene-side={side}
    className={mobile ? 'unit1-scene-mobile relative order-2 h-[300px] w-full overflow-hidden lg:hidden' : 'unit1-scene-canvas pointer-events-none absolute inset-0 hidden overflow-hidden lg:block'}>
    <Image key={src} src={src} alt="" fill unoptimized sizes={mobile ? '100vw' : '(min-width: 1024px) 100vw, 1px'} className="object-cover object-top" />
    {!mobile && <div className="unit1-scene-fade absolute inset-0" style={{ background: side === 'left'
      ? 'linear-gradient(to left, #fff 0%, #fffffff5 34%, #ffffffdf 47%, #ffffff8f 58%, transparent 74%)'
      : 'linear-gradient(to right, #fff 0%, #fffffff5 34%, #ffffffdf 47%, #ffffff8f 58%, transparent 74%)' }} />}
  </div>
}
