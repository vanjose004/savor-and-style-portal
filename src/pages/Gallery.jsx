import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { GALLERY_CATEGORIES, BUSINESS } from '../lib/constants'
import { cn } from '../lib/utils'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Logo from '../components/ui/Logo'
import Lightbox from '../components/gallery/Lightbox'

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.rpc('get_gallery_photos')
      if (cancelled) return
      if (!error) setPhotos(data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const albums = useMemo(() => {
    const all = { value: '', label: 'All', count: photos.length }
    const categories = GALLERY_CATEGORIES.map((cat) => ({
      value: cat,
      label: cat,
      count: photos.filter((p) => p.category === cat).length,
    })).filter((cat) => cat.count > 0)
    return [all, ...categories]
  }, [photos])

  const visiblePhotos = selectedCategory ? photos.filter((p) => p.category === selectedCategory) : photos

  const handleNavigate = (direction) => {
    setLightboxIndex((prev) => {
      if (prev === null) return prev
      const next = (prev + direction + visiblePhotos.length) % visiblePhotos.length
      return next
    })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf6ee' }}>
      <header className="sticky top-0 z-30 backdrop-blur-sm border-b" style={{ backgroundColor: '#6B1A1A', borderColor: 'rgba(184,150,46,0.3)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <Logo className="h-9 w-9" />
            <span className="font-heading font-bold text-lg text-white tracking-wide hidden sm:inline">
              {BUSINESS.name}
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl" style={{ color: '#6B1A1A' }}>
            Our Gallery
          </h1>
          <p className="mt-2 text-text-muted">Moments we've made memorable, one event at a time.</p>
        </div>

        {/* Mobile: horizontal scrollable category tabs */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 mb-4">
          {albums.map((album) => (
            <button
              key={album.value}
              type="button"
              onClick={() => setSelectedCategory(album.value)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                selectedCategory === album.value ? 'text-white' : 'text-text-muted border-gold/30'
              )}
              style={
                selectedCategory === album.value
                  ? { backgroundColor: '#6B1A1A', borderColor: '#6B1A1A' }
                  : undefined
              }
            >
              {album.label} ({album.count})
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* Desktop: sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {albums.map((album) => (
                <button
                  key={album.value}
                  type="button"
                  onClick={() => setSelectedCategory(album.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedCategory === album.value ? 'text-white' : 'text-text-dark hover:bg-cream'
                  )}
                  style={selectedCategory === album.value ? { backgroundColor: '#6B1A1A' } : undefined}
                >
                  <span>{album.label}</span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      selectedCategory === album.value ? 'bg-white/20' : 'bg-cream text-text-muted'
                    )}
                  >
                    {album.count}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Masonry grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Spinner className="w-8 h-8" />
              </div>
            ) : visiblePhotos.length === 0 ? (
              <EmptyState icon={ImageIcon} title="No photos yet" description="Check back soon for event highlights." />
            ) : (
              <div className="columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
                {visiblePhotos.map((photo, index) => (
                  <motion.button
                    key={photo.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
                    onClick={() => setLightboxIndex(index)}
                    className="group block w-full mb-4 break-inside-avoid rounded-xl overflow-hidden relative shadow-sm"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption ?? photo.category}
                      loading="lazy"
                      decoding="async"
                      width={photo.width || undefined}
                      height={photo.height || undefined}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {photo.caption && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                        <span className="text-white text-sm font-medium px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {photo.caption}
                        </span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={visiblePhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  )
}
