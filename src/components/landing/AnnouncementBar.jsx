import { ANNOUNCEMENT_TEXT } from '../../lib/constants'

export default function AnnouncementBar() {
  return (
    <div className="bg-wine text-gold text-center text-xs sm:text-sm font-medium px-4 py-2 leading-snug">
      {ANNOUNCEMENT_TEXT}
    </div>
  )
}
