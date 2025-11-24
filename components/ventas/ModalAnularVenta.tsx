'use client'

import { useState } from 'react'

interface ModalAnularVentaProps {
  venta: {
    id: string
    numeroVenta: string
    total: number
  }
  onClose: () => void
  onSuccess: () => void
}

export default function ModalAnularVenta({
  venta,
  onClose,
  onSuccess,
}: ModalAnularVentaProps) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnular = async () => {
    if (!motivo.trim()) {
      setError('Debe ingresar un motivo')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/ventas/${venta.id}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoAnulacion: motivo }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al anular venta')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          padding: '2rem'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '0.5rem'
          }}>
            ⚠️ Anular Venta
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Esta acción restaurará el stock de los productos vendidos.
          </p>
        </div>

        {/* Info de la venta */}
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>
            <strong>Venta:</strong> {venta.numeroVenta}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
            <strong>Total:</strong> S/ {venta.total.toFixed(2)}
          </div>
        </div>

        {/* Campo de motivo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Motivo de anulación *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ingrese el motivo por el cual se anula la venta..."
            rows={4}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              opacity: loading ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAnular}
            disabled={loading || !motivo.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: loading || !motivo.trim() ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !motivo.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {loading ? 'Anulando...' : '✓ Confirmar Anulación'}
          </button>
        </div>
      </div>
    </div>
  )
}