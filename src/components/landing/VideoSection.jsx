import { PlayCircle } from 'lucide-react'
import Reveal from './Reveal'
import { YOUTUBE_VIDEO_ID } from '../../lib/constants'

export default function VideoSection() {
  return (
    <section className="bg-cream py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal className="text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-wine">
            Panoorin muna bago mag-inquire 😊
          </h2>
        </Reveal>

        <Reveal delay={0.15} className="mt-10">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border border-gold/30">
            {YOUTUBE_VIDEO_ID ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`}
                title="Savor and Style Catering Services"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-wine to-wine-dark text-center px-6">
                <PlayCircle size={64} className="text-gold" />
                <p className="font-heading font-semibold text-xl text-white">Video coming soon</p>
                <p className="text-cream/80 text-sm max-w-sm">
                  Our intro video will be uploaded here — watch this space!
                </p>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
