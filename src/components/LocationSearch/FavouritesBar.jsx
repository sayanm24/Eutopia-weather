import { Star, X } from 'lucide-react'
import { locKey, sameLoc } from '../../utils/location.js'

/** Horizontal list of favourite places: one click to switch, × to remove. */
export default function FavouritesBar({ favourites, current, onSelect, onRemove }) {
  if (!favourites.length) return null
  return (
    <ul className="favs" aria-label="Favourite locations">
      {favourites.map((f) => {
        const active = sameLoc(f, current)
        return (
          <li key={locKey(f)} className={`fav${active ? ' active' : ''}`}>
            <button className="fav-main" onClick={() => !active && onSelect(f)} aria-current={active ? 'true' : undefined}>
              <Star size={13} aria-hidden="true" />
              <span>{f.name}</span>
              {f.country && <small>{f.country}</small>}
            </button>
            <button className="fav-remove" onClick={() => onRemove(f)} aria-label={`Remove ${f.name} from favourites`}>
              <X size={13} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
