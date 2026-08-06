import Reveal from './Reveal'
import { BUSINESS } from '../../lib/constants'

const OVERLAY_LABEL = 'Savor and Style Events'

const RATIOS = ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]']

const GALLERY_FILES = [
  'Gallery 1.jpg',
  'Gallery 2.jpg',
  'Gallery 3.jpg',
  'Gallery 4.jpg',
  'Gallery 5.jpg',
  'Gallery 6.jpg',
  'Gallery 7.jpg',
  'Gallery 9.jpg',
  'Gallery 10.jpg',
  'Gallery 11.jpg',
  'Gallery 12.jpg',
  'Gallery 13.jpg',
  'Gallery 14.jpg',
  'Gallery 15.jpg',
]

const GALLERY_ITEMS = GALLERY_FILES.map((file, index) => ({
  src: encodeURI(`/gallery/${file}`),
  ratio: RATIOS[index % RATIOS.length],
}))

export default function Gallery() {
  return (
    <section id="gallery" className="bg-cream py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">
            Moments We've Made Memorable
          </h2>
        </Reveal>

        <div className="mt-12 columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
          {GALLERY_ITEMS.map((item, index) => (
            <Reveal key={item.src} delay={(index % 3) * 0.08} className="mb-4 break-inside-avoid">
              <div className={`group relative ${item.ratio} rounded-xl overflow-hidden cursor-pointer`}>
                <img
                  src={item.src}
                  alt={OVERLAY_LABEL}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-wine/0 group-hover:bg-wine/60 transition-colors duration-300 flex items-center justify-center">
                  <span className="text-white font-heading font-semibold text-lg text-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {OVERLAY_LABEL}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 text-center" delay={0.2}>
          <a
            href={BUSINESS.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-wine text-white font-semibold px-8 py-3.5 rounded-full shadow-md transition-all hover:bg-wine-dark hover:scale-[1.02]"
          >
            See More on Facebook
          </a>
        </Reveal>
      </div>
    </section>
  )
}
