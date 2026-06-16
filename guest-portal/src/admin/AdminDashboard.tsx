import { useState, useEffect, useRef } from 'react'
import type { FormEvent, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Room {
  id: number
  sort_order: number
  tag: string
  name: string
  description: string
  features: string[]
  price: string
  gradient: string
  accent: string
  image_url: string | null
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [rooms, setRooms]       = useState<Room[]>([])
  const [editing, setEditing]   = useState<Room | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [fetchErr, setFetchErr] = useState('')

  const token = localStorage.getItem('admin_token') ?? ''

  useEffect(() => { if (!token) navigate('/admin') }, [token, navigate])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`${API}/admin/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) { logout(); return }
        if (!res.ok) throw new Error('Failed to load rooms')
        return res.json() as Promise<Room[]>
      })
      .then((data) => { if (data) setRooms(data) })
      .catch((err: unknown) => setFetchErr(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function logout() {
    localStorage.removeItem('admin_token')
    navigate('/admin')
  }

  function openEdit(room: Room) {
    setEditing({ ...room, features: [...room.features] })
    setSaveMsg(null)
  }

  function handleFeatureChange(index: number, value: string) {
    if (!editing) return
    const updated = [...editing.features]
    updated[index] = value
    setEditing({ ...editing, features: updated })
  }

  function addFeature() {
    if (!editing) return
    setEditing({ ...editing, features: [...editing.features, ''] })
  }

  function removeFeature(index: number) {
    if (!editing) return
    setEditing({ ...editing, features: editing.features.filter((_, i) => i !== index) })
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`${API}/admin/rooms/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tag: editing.tag, name: editing.name, desc: editing.description,
          features: editing.features.filter((f) => f.trim() !== ''), price: editing.price,
        }),
      })
      if (res.status === 401) { logout(); return }
      const data = await res.json() as Room | { error?: string }
      if (!res.ok) { setSaveMsg({ ok: false, text: (data as { error?: string }).error ?? 'Save failed' }); return }
      const updated = data as Room
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setEditing(null)
      setSaveMsg({ ok: true, text: `"${updated.name}" saved successfully!` })
    } catch {
      setSaveMsg({ ok: false, text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  function handleImageUpdated(roomId: number, newImageUrl: string | null) {
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, image_url: newImageUrl } : r))
    if (editing?.id === roomId) setEditing((prev) => prev ? { ...prev, image_url: newImageUrl } : prev)
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      {/* Top bar */}
      <header style={s.topbar}>
        <div style={s.topbarBrand}>
          <span style={s.brandIcon}>🌿</span>
          <span style={s.brandText}>Green Village Admin</span>
        </div>
        <div style={s.topbarRight}>
          <a href="/" target="_blank" rel="noreferrer" style={s.viewSiteBtn}>View Site ↗</a>
          <button onClick={logout} style={s.logoutBtn}>Sign Out</button>
        </div>
      </header>

      <main style={s.main}>
        <h1 style={s.pageTitle}>Rooms &amp; Suites</h1>
        <p style={s.pageSub}>Edit room details and photos — changes go live on the website immediately.</p>

        {saveMsg && (
          <div style={{ ...s.toast, ...(saveMsg.ok ? s.toastOk : s.toastErr) }}>{saveMsg.text}</div>
        )}

        {loading  && <p style={s.dimText}>Loading rooms…</p>}
        {fetchErr && <p style={s.errorText}>{fetchErr}</p>}

        {!loading && !fetchErr && (
          <div style={s.grid}>
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                token={token}
                onEdit={() => openEdit(room)}
                onImageUpdated={(url) => handleImageUpdated(room.id, url)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit details modal */}
      {editing && (
        <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Edit room">
          <div style={s.modal} role="document">
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Edit — {editing.name}</h2>
              <button onClick={() => setEditing(null)} style={s.closeBtn} aria-label="Close">✕</button>
            </div>

            <form onSubmit={handleSave} style={s.form}>
              <FieldGroup label="Tag (badge label)">
                <input style={s.input} value={editing.tag}
                  onChange={(e) => setEditing({ ...editing, tag: e.target.value })} required />
              </FieldGroup>

              <FieldGroup label="Room Name">
                <input style={s.input} value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              </FieldGroup>

              <FieldGroup label="Description">
                <textarea style={{ ...s.input, ...s.textarea }} value={editing.description} rows={3}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })} required />
              </FieldGroup>

              <FieldGroup label="Price (e.g. From $45/night)">
                <input style={s.input} value={editing.price} placeholder="From $45/night"
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })} required />
              </FieldGroup>

              <FieldGroup label="Features">
                {editing.features.map((f, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={`feat-${i}`} style={s.featureRow}>
                    <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={f}
                      placeholder={`Feature ${i + 1}`}
                      onChange={(e) => handleFeatureChange(i, e.target.value)} />
                    <button type="button" onClick={() => removeFeature(i)} style={s.removeBtn} aria-label="Remove">✕</button>
                  </div>
                ))}
                <button type="button" onClick={addFeature} style={s.addFeatureBtn}>+ Add Feature</button>
              </FieldGroup>

              {saveMsg && !saveMsg.ok && <p style={{ ...s.errorText, marginTop: 0 }}>{saveMsg.text}</p>}

              <div style={s.modalActions}>
                <button type="button" onClick={() => setEditing(null)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ROOM CARD (with inline image uploader) ───────────────────────────────────

interface RoomCardProps {
  room: Room
  token: string
  onEdit: () => void
  onImageUpdated: (url: string | null) => void
}

function RoomCard({ room, token, onEdit, onImageUpdated }: RoomCardProps) {
  const [uploading, setUploading]     = useState(false)
  const [uploadErr, setUploadErr]     = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const [hovered, setHovered]         = useState(false)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(room.image_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // keep preview in sync when parent updates image_url
  useEffect(() => { setPreviewUrl(room.image_url) }, [room.image_url])

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadErr('Please select an image file.'); return }
    if (file.size > 8 * 1024 * 1024)    { setUploadErr('Image must be under 8 MB.'); return }

    setUploadErr('')
    setUploading(true)

    // Optimistic local preview
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    const form = new FormData()
    form.append('image', file)

    try {
      const res = await fetch(`${API}/admin/rooms/${room.id}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json() as { image_url?: string; error?: string }
      if (!res.ok) { setUploadErr(data.error ?? 'Upload failed'); setPreviewUrl(room.image_url); return }
      onImageUpdated(data.image_url ?? null)
    } catch {
      setUploadErr('Network error — please try again.')
      setPreviewUrl(room.image_url)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localUrl)
    }
  }

  async function removeImage() {
    if (!window.confirm('Remove this room image?')) return
    setUploading(true)
    setUploadErr('')
    try {
      const res = await fetch(`${API}/admin/rooms/${room.id}/image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { const d = await res.json() as { error?: string }; setUploadErr(d.error ?? 'Delete failed'); return }
      setPreviewUrl(null)
      onImageUpdated(null)
    } catch {
      setUploadErr('Network error — please try again.')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
    e.target.value = ''
  }

  return (
    <div style={s.roomCard}>
      {/* ── Image zone ── */}
      <div
        style={{
          ...s.imageZone,
          ...(dragOver ? s.imageZoneDrag : {}),
          ...(previewUrl ? s.imageZoneHasImg : {}),
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload room image"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={room.name} style={s.previewImg} />
            <div style={{
              ...s.imageOverlay,
              opacity: (hovered || uploading) ? 1 : 0,
              background: (hovered || uploading) ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
            }}>
              {uploading
                ? <span style={s.uploadingSpinner}>⏳ Uploading…</span>
                : <span style={s.changeImageLabel}>📷 Click or drag to replace</span>
              }
            </div>
          </>
        ) : (
          <div style={s.imagePlaceholder}>
            {uploading ? (
              <span style={s.uploadingText}>⏳ Uploading…</span>
            ) : (
              <>
                <span style={s.uploadIcon}>📷</span>
                <span style={s.uploadLabel}>{dragOver ? 'Drop image here' : 'Click or drag image here'}</span>
                <span style={s.uploadSub}>JPG, PNG, WEBP · max 8 MB</span>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFileChange}
          aria-label="Choose room image"
        />
      </div>

      {uploadErr && <p style={s.uploadErrText}>{uploadErr}</p>}

      {/* ── Room info ── */}
      <div style={s.roomCardHeader}>
        <span style={s.tagBadge}>{room.tag}</span>
        {previewUrl && (
          <button onClick={removeImage} disabled={uploading} style={s.removeImgBtn} aria-label="Remove image">
            🗑 Remove photo
          </button>
        )}
      </div>

      <h2 style={s.roomName}>{room.name}</h2>
      <p style={s.roomDesc}>{room.description}</p>

      <ul style={s.featureList}>
        {room.features.map((f) => <li key={f} style={s.featureItem}>✓ {f}</li>)}
      </ul>

      <div style={s.roomFooter}>
        <strong style={s.priceTag}>{room.price}</strong>
        <button onClick={onEdit} style={s.editBtn}>Edit Details</button>
      </div>
    </div>
  )
}

// ─── FIELD GROUP ─────────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0b1a0e', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#fff' },

  /* Topbar */
  topbar: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 2rem', height: 60,
    background: 'rgba(11,26,14,0.92)', borderBottom: '1px solid rgba(217,255,120,0.1)',
    backdropFilter: 'blur(10px)',
  },
  topbarBrand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandIcon: { fontSize: 20 },
  brandText: { color: '#d9ff78', fontWeight: 700, fontSize: 16 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  viewSiteBtn: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none',
    padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  },
  logoutBtn: {
    background: 'transparent', border: '1px solid rgba(217,255,120,0.3)',
    borderRadius: 8, color: '#d9ff78', fontSize: 13, fontWeight: 600, padding: '6px 14px', cursor: 'pointer',
  },

  /* Main */
  main: { maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' },
  pageTitle: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 },
  pageSub: { color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6, marginBottom: '2rem' },
  toast: { borderRadius: 10, padding: '0.8rem 1.1rem', fontSize: 14, marginBottom: '1.5rem' },
  toastOk: { background: 'rgba(100,255,130,0.12)', border: '1px solid rgba(100,255,130,0.3)', color: '#86efac' },
  toastErr: { background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: '#fca5a5' },
  dimText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  errorText: { color: '#fca5a5', fontSize: 14, marginTop: 8 },

  /* Grid */
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.5rem' },

  /* Room card */
  roomCard: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0,
  },

  /* Image zone */
  imageZone: {
    position: 'relative', width: '100%', height: 190,
    background: 'rgba(255,255,255,0.04)',
    border: '2px dashed rgba(255,255,255,0.12)',
    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  imageZoneDrag: {
    borderColor: '#d9ff78', background: 'rgba(217,255,120,0.07)',
  },
  imageZoneHasImg: { border: 'none' },

  previewImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },

  imageOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0, transition: 'opacity 0.2s, background 0.2s',
    // hover via JS not possible in inline styles — we handle via CSS class instead
    // Using a hack: the parent div's :hover will reveal via CSS in App.css — or we use onMouseEnter
  },
  changeImageLabel: {
    color: '#fff', fontWeight: 600, fontSize: 13,
    background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '6px 14px',
  },
  uploadingSpinner: { color: '#d9ff78', fontSize: 14, fontWeight: 600 },

  imagePlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '1.5rem' },
  uploadIcon: { fontSize: 32, lineHeight: 1 },
  uploadLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500 },
  uploadSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  uploadingText: { color: '#d9ff78', fontSize: 14, fontWeight: 600 },

  uploadErrText: { color: '#fca5a5', fontSize: 12, margin: '6px 1rem 0' },

  /* Card body */
  roomCardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.25rem 0',
  },
  tagBadge: {
    background: 'rgba(217,255,120,0.15)', color: '#d9ff78',
    borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '3px 12px',
  },
  removeImgBtn: {
    background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)',
    borderRadius: 8, color: '#fca5a5', fontSize: 11, fontWeight: 600,
    padding: '3px 10px', cursor: 'pointer',
  },
  roomName: { fontSize: 19, fontWeight: 700, margin: '0.5rem 1.25rem 0', letterSpacing: '-0.02em' },
  roomDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0.35rem 1.25rem 0', lineHeight: 1.5 },
  featureList: { listStyle: 'none', padding: '0.5rem 1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  featureItem: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  roomFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1.25rem 1.25rem',
  },
  priceTag: { color: '#d9ff78', fontSize: 16, fontWeight: 700 },
  editBtn: {
    background: '#d9ff78', color: '#0b1a0e', border: 'none',
    borderRadius: 8, fontWeight: 700, fontSize: 13, padding: '8px 18px', cursor: 'pointer',
  },

  /* Overlay / Modal */
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#0f2115', border: '1px solid rgba(217,255,120,0.15)',
    borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh',
    overflowY: 'auto', padding: '2rem', boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8,
    color: 'rgba(255,255,255,0.5)', fontSize: 16, width: 34, height: 34,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* Form */
  form: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#fff', fontSize: 14, padding: '0.65rem 0.9rem',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  textarea: { resize: 'vertical' as const, fontFamily: 'inherit' },
  featureRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 },
  removeBtn: {
    background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)',
    borderRadius: 8, color: '#fca5a5', fontSize: 13, width: 32, height: 32,
    cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addFeatureBtn: {
    background: 'transparent', border: '1px dashed rgba(217,255,120,0.3)',
    borderRadius: 8, color: '#d9ff78', fontSize: 13, padding: '6px 14px',
    cursor: 'pointer', marginTop: 4, alignSelf: 'flex-start',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.2rem' },
  cancelBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600,
    padding: '0.65rem 1.3rem', cursor: 'pointer',
  },
  saveBtn: {
    background: '#d9ff78', border: 'none', borderRadius: 10, color: '#0b1a0e',
    fontSize: 14, fontWeight: 700, padding: '0.65rem 1.6rem', cursor: 'pointer',
  },
  saveBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
}
