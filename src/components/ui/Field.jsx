export default function Field({ label, value }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-dark font-medium mt-0.5">{value}</dd>
    </div>
  )
}
