import Card from '../../ui/Card'

export default function RecentList({ title, actions, items, renderItem, emptyMessage }) {
  return (
    <Card title={title} actions={actions}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-gold/10">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
