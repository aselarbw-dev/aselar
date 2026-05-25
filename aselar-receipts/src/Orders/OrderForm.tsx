import { useState, useId, useEffect } from 'react'
import styles from './OrderForm.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string
  name: string
  quantity: string
  unit: string
  estimatedPrice: string
  notes: string
}

interface SellerInfo {
  shopName: string
  ownerName: string
  phone: string
  location: string
  shopType: string
}

type FormStatus = 'editing' | 'confirmed' | 'submitting' | 'success' | 'error'

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'aselar_order_draft'

const UNITS = ['units', 'kg', 'g', 'litre', 'ml', 'packs', 'boxes', 'bags', 'crates', 'dozen', 'pieces']

const SHOP_TYPES = [
  'Tuck Shop',
  'Auto Repair / Spares',
  'General Dealer',
  'Supermarket / Grocery',
  'Butchery',
  'Salon / Barbershop',
  'Hardware Store',
  'Other',
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function emptyItem(): OrderItem {
  return { id: generateId(), name: '', quantity: '', unit: 'units', estimatedPrice: '', notes: '' }
}

function lineTotal(item: OrderItem): number {
  const price = parseFloat(item.estimatedPrice) || 0
  const qty = parseFloat(item.quantity) || 0
  return price * qty
}

function fmt(n: number): string {
  return n.toFixed(2)
}

// ── Load saved draft ──────────────────────────────────────────────────────────
function loadDraft(): { seller: SellerInfo; items: OrderItem[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.seller && Array.isArray(parsed?.items) && parsed.items.length > 0) return parsed
    return null
  } catch {
    return null
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
const OrderForm = () => {
  const formId = useId()

  const draft = loadDraft()
  const firstItem = emptyItem()

  const [seller, setSeller] = useState<SellerInfo>(
    draft?.seller ?? { shopName: '', ownerName: '', phone: '', location: '', shopType: '' }
  )
  const [items, setItems] = useState<OrderItem[]>(draft?.items ?? [firstItem])
  const [editingId, setEditingId] = useState<string | null>(draft ? null : firstItem.id)
  const [status, setStatus] = useState<FormStatus>('editing')
  const [errorMsg, setErrorMsg] = useState('')
  const [draftRestored, setDraftRestored] = useState(!!draft)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ seller, items }))
    } catch { /* storage unavailable */ }
  }, [seller, items])

  useEffect(() => {
    if (!draftRestored) return
    const t = setTimeout(() => setDraftRestored(false), 4000)
    return () => clearTimeout(t)
  }, [draftRestored])

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  const handleSeller = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSeller(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (status === 'confirmed') setStatus('editing')
  }

  const updateItem = (id: string, field: keyof OrderItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    if (status === 'confirmed') setStatus('editing')
  }

  const addItem = () => {
    const newItem = emptyItem()
    setItems(prev => [...prev, newItem])
    setEditingId(newItem.id)
    if (status === 'confirmed') setStatus('editing')
  }

  const deleteItem = (id: string) => {
    if (items.length === 1) return
    setItems(prev => prev.filter(item => item.id !== id))
    if (status === 'confirmed') setStatus('editing')
  }

  const duplicateItem = (item: OrderItem) => {
    const copy = { ...item, id: generateId() }
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id)
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setEditingId(copy.id)
    if (status === 'confirmed') setStatus('editing')
  }

  const sellerValid = !!(seller.shopName && seller.ownerName && seller.phone && seller.shopType)
  const itemsValid = items.length > 0 && items.every(i => i.name.trim() && i.quantity.trim())
  const canConfirm = sellerValid && itemsValid
  const grandTotal = items.reduce((sum, i) => sum + lineTotal(i), 0)
  const pricedCount = items.filter(i => lineTotal(i) > 0).length

  const handleConfirm = () => {
    if (!canConfirm) return
    setEditingId(null)
    setStatus('confirmed')
  }

  const handleSubmit = async () => {
    if (status !== 'confirmed') return
    setStatus('submitting')
    setErrorMsg('')

    const itemsText = items.map((item, i) => {
      const lt = lineTotal(item)
      const priceStr = item.estimatedPrice ? `@ P${item.estimatedPrice}/unit = P${fmt(lt)}` : '(no price)'
      return `${i + 1}. ${item.name} — ${item.quantity} ${item.unit} ${priceStr}${item.notes ? ` [${item.notes}]` : ''}`
    }).join('\n')

    const totalLine = grandTotal > 0 ? `\n\nESTIMATED TOTAL: P${fmt(grandTotal)}` : ''

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORM_ORDER_FORM_API_KEY,
          subject: `Aselar Order — ${seller.shopName} (${items.length} items${grandTotal > 0 ? `, P${fmt(grandTotal)}` : ''})`,
          from_name: seller.ownerName,
          shop_name: seller.shopName,
          shop_type: seller.shopType,
          phone: seller.phone,
          location: seller.location,
          order_items: itemsText + totalLine,
          total_items: items.length,
          estimated_total: grandTotal > 0 ? `P${fmt(grandTotal)}` : 'Not specified',
        }),
      })
  
      const data = await res.json()
      if (data.success) {
        clearDraft()
        setStatus('success')
      } else {
        throw new Error(data.message || 'Submission failed')
      }
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const handleReset = () => {
    clearDraft()
    setSeller({ shopName: '', ownerName: '', phone: '', location: '', shopType: '' })
    const first = emptyItem()
    setItems([first])
    setEditingId(first.id)
    setStatus('editing')
    setErrorMsg('')
    setDraftRestored(false)
  }

  if (status === 'success') {
    return (
      <div className={styles.successScreen}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2>Order Submitted! 🎉</h2>
          <p>
            Thank you <strong>{seller.ownerName}</strong>! Your order from{' '}
            <strong>{seller.shopName}</strong> has been received. The Aselar team
            will review your list and get back to you on WhatsApp shortly.
          </p>
          <div className={styles.successSummary}>
            <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            {grandTotal > 0 && <span>Est. Total: P{fmt(grandTotal)}</span>}
          </div>
          <button className={styles.resetBtn} onClick={handleReset}>
            Place Another Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>

        {draftRestored && (
          <div className={styles.draftBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Your previous order draft has been restored.
            <button className={styles.draftDismiss} onClick={() => setDraftRestored(false)}>✕</button>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.brand}>Aselar</span>
          </div>
          <h1 className={styles.title}>Place a Stock Order</h1>
          <p className={styles.subtitle}>Add the items you need. We buy and deliver to your shop.</p>
          <div className={styles.steps}>
            <div className={`${styles.step} ${styles.stepActive}`}>
              <span>1</span> Fill Details
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${status === 'confirmed' || status === 'submitting' ? styles.stepActive : ''}`}>
              <span>2</span> Confirm List
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${status === 'submitting' ? styles.stepActive : ''}`}>
              <span>3</span> Submit
            </div>
          </div>
        </div>

        {/* ── Seller Info ─────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Shop Information
          </h2>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor={`${formId}-shopName`}>Shop Name <span>*</span></label>
              <input id={`${formId}-shopName`} name="shopName" type="text"
                placeholder="e.g. Kgosi's Tuck Shop" value={seller.shopName}
                onChange={handleSeller} disabled={status === 'confirmed'} />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${formId}-ownerName`}>Your Name <span>*</span></label>
              <input id={`${formId}-ownerName`} name="ownerName" type="text"
                placeholder="e.g. Kgosi Tsheko" value={seller.ownerName}
                onChange={handleSeller} disabled={status === 'confirmed'} />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${formId}-phone`}>WhatsApp Number <span>*</span></label>
              <input id={`${formId}-phone`} name="phone" type="tel"
                placeholder="+267 71 234 567" value={seller.phone}
                onChange={handleSeller} disabled={status === 'confirmed'} />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${formId}-shopType`}>Shop Type <span>*</span></label>
              <select id={`${formId}-shopType`} name="shopType" value={seller.shopType}
                onChange={handleSeller} disabled={status === 'confirmed'}>
                <option value="" disabled>Select shop type</option>
                {SHOP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label htmlFor={`${formId}-location`}>Shop Location / Area</label>
              <input id={`${formId}-location`} name="location" type="text"
                placeholder="e.g. Gaborone West, Plot 1234" value={seller.location}
                onChange={handleSeller} disabled={status === 'confirmed'} />
            </div>
          </div>
        </div>

        {/* ── Order Items ──────────────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Order Items
              <span className={styles.itemCount}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </h2>
          </div>

          <div className={styles.itemsHeader}>
            <span>Item / Description</span>
            <span>Qty & Unit</span>
            <span>Price/Unit (P)</span>
            <span className={styles.colLineTotal}>Line Total</span>
            <span></span>
          </div>

          <div className={styles.itemsList}>
            {items.map((item, index) => {
              const lt = lineTotal(item)
              const hasLineTotal = lt > 0

              return (
                <div key={item.id} className={`${styles.itemRow} ${editingId === item.id ? styles.itemRowActive : ''} ${status === 'confirmed' ? styles.itemRowConfirmed : ''}`}>
                  {status === 'confirmed' || editingId !== item.id ? (
                    <div className={styles.itemCollapsed}>
                      <div className={styles.itemNumber}>{index + 1}</div>
                      <div className={styles.itemSummary}>
                        <span className={styles.itemName}>{item.name || <em>Unnamed item</em>}</span>
                        <span className={styles.itemMeta}>
                          {item.quantity} {item.unit}
                          {item.estimatedPrice && ` · P${item.estimatedPrice}/unit`}
                          {item.notes && ` · ${item.notes}`}
                        </span>
                      </div>
                      <div className={styles.itemLineTotal}>
                        {hasLineTotal ? (
                          <>
                            <span className={styles.lineTotalValue}>P{fmt(lt)}</span>
                            <span className={styles.lineTotalBreakdown}>{item.quantity} × P{item.estimatedPrice}</span>
                          </>
                        ) : (
                          <span className={styles.lineTotalEmpty}>—</span>
                        )}
                      </div>
                      {status !== 'confirmed' && (
                        <div className={styles.itemActions}>
                          <button className={styles.actionBtn} onClick={() => setEditingId(item.id)} title="Edit">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className={styles.actionBtn} onClick={() => duplicateItem(item)} title="Duplicate">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                          <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                            onClick={() => deleteItem(item.id)} title="Delete" disabled={items.length === 1}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.itemExpanded}>
                      <div className={styles.itemExpandedHeader}>
                        <span className={styles.itemExpandedNum}>Item {index + 1}</span>
                        {hasLineTotal && (
                          <div className={styles.editingLineTotal}>
                            <span className={styles.editingLineTotalLabel}>Line Total</span>
                            <span className={styles.editingLineTotalValue}>P{fmt(lt)}</span>
                          </div>
                        )}
                        <button className={styles.doneBtn} onClick={() => setEditingId(null)}>
                          Done
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      </div>
                      <div className={styles.itemFields}>
                        <div className={`${styles.field} ${styles.itemFieldName}`}>
                          <label>Item Name / Description <span>*</span></label>
                          <input type="text" placeholder="e.g. Colgate Toothpaste 50ml"
                            value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} autoFocus />
                        </div>
                        <div className={styles.field}>
                          <label>Quantity <span>*</span></label>
                          <input type="number" min="1" step="1" placeholder="e.g. 100"
                            value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                        </div>
                        <div className={styles.field}>
                          <label>Unit</label>
                          <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className={styles.field}>
                          <label>Price per Unit (P) <span>*</span></label>
                          <input type="number" min="0" step="0.01" placeholder="e.g. 22.00"
                            value={item.estimatedPrice} onChange={e => updateItem(item.id, 'estimatedPrice', e.target.value)} />
                        </div>
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                          <label>Notes / Brand Specification</label>
                          <input type="text" placeholder="e.g. Red & white pack only, not the blue one"
                            value={item.notes} onChange={e => updateItem(item.id, 'notes', e.target.value)} />
                        </div>
                      </div>
                      <div className={styles.itemExpandedFooter}>
                        <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                          onClick={() => deleteItem(item.id)} disabled={items.length === 1}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                          Remove Item
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {status !== 'confirmed' && (
            <button className={styles.addItemBtn} onClick={addItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Another Item
            </button>
          )}

          {grandTotal > 0 && (
            <div className={styles.orderSummary}>
              <div className={styles.summaryTitle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                Order Summary
              </div>
              <div className={styles.summaryRows}>
                {items.filter(i => lineTotal(i) > 0).map(item => (
                  <div key={item.id} className={styles.summaryRow}>
                    <span className={styles.summaryRowNum}>{items.indexOf(item) + 1}</span>
                    <span className={styles.summaryRowName}>{item.name}</span>
                    <span className={styles.summaryRowCalc}>{item.quantity} {item.unit} × P{item.estimatedPrice}</span>
                    <span className={styles.summaryRowTotal}>P{fmt(lineTotal(item))}</span>
                  </div>
                ))}
              </div>
              <div className={styles.grandTotalRow}>
                <span>
                  Estimated Order Total
                  {pricedCount < items.length && (
                    <em className={styles.partialNote}> · {pricedCount}/{items.length} items priced</em>
                  )}
                </span>
                <span className={styles.grandTotalValue}>P{fmt(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {status === 'confirmed' && (
          <div className={styles.confirmedBanner}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              List confirmed — {items.length} item{items.length !== 1 ? 's' : ''}
              {grandTotal > 0 && <>, Est. <strong>P{fmt(grandTotal)}</strong></>}. Ready to submit.
            </span>
            <button className={styles.editAgainBtn} onClick={() => setStatus('editing')}>Edit</button>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMsg}
          </div>
        )}

        {!canConfirm && status === 'editing' && (
          <p className={styles.hint}>Fill in your shop details and at least one item (name + quantity) to confirm.</p>
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.confirmBtn} ${!canConfirm || status === 'confirmed' ? styles.btnDisabled : ''}`}
            onClick={handleConfirm}
            disabled={!canConfirm || status === 'confirmed'}
          >
            {status === 'confirmed' ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> List Confirmed</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> Confirm List</>
            )}
          </button>

          <button
            className={`${styles.submitBtn} ${status !== 'confirmed' ? styles.btnDisabled : ''}`}
            onClick={handleSubmit}
            disabled={status !== 'confirmed'}
          >
            {status === 'submitting' ? (
              <><span className={styles.spinner} /> Sending Order...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg> Submit Order</>
            )}
          </button>
        </div>

        <p className={styles.privacy}>
          Your order goes directly to the Aselar team. We will contact you on WhatsApp to confirm delivery details.
        </p>

      </div>
    </div>
  )
}

export default OrderForm