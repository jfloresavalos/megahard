"use client"

import { useState } from "react"

interface ModalRegistrarPagoProps {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    numeroServicio: string
    clienteNombre: string
    saldo: number
  }
}

export default function ModalRegistrarPago({
  isOpen,
  onClose,
  servicio
}: ModalRegistrarPagoProps) {
  const [montoPago, setMontoPago] = useState("")
  const [metodoPago, setMetodoPago] = useState("EFECTIVO")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const monto = Number(montoPago)
    const saldoActual = Number(servicio.saldo)

    // Validaciones
    if (!monto || monto <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }

    if (monto > saldoActual) {
      setError(`El monto no puede ser mayor al saldo pendiente (S/ ${saldoActual.toFixed(2)})`)
      return
    }

    if (!metodoPago) {
      setError("Selecciona un método de pago")
      return
    }

    const confirmar = confirm(
      `¿Confirmar pago de S/ ${monto.toFixed(2)}?\n` +
      `Método: ${metodoPago}\n` +
      `Saldo restante: S/ ${(saldoActual - monto).toFixed(2)}`
    )

    if (!confirmar) return

    try {
      setLoading(true)

      const response = await fetch(`/api/servicios/${servicio.id}/registrar-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoPago: monto,
          metodoPago
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Pago registrado correctamente\nNuevo saldo: S/ ${data.nuevoSaldo.toFixed(2)}`)
        setMontoPago("")
        setMetodoPago("EFECTIVO")
        onClose()
      } else {
        setError(data.error || "Error al registrar el pago")
      }
    } catch (error) {
      console.error("Error al registrar pago:", error)
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handlePagarTodo = () => {
    setMontoPago(servicio.saldo.toString())
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: 0
          }}>
            💰 Registrar Pago
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Info del servicio */}
        <div style={{
          backgroundColor: '#f0fdf4',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '2px solid #10b981'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
            Servicio: <strong>{servicio.numeroServicio}</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem' }}>
            Cliente: <strong>{servicio.clienteNombre}</strong>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626', marginTop: '0.75rem' }}>
            Saldo Pendiente: S/ {Number(servicio.saldo).toFixed(2)}
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Monto a Pagar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Monto a Pagar *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                step="0.01"
                min="0.01"
                max={servicio.saldo}
                placeholder="0.00"
                required
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
              <button
                type="button"
                onClick={handlePagarTodo}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                Pagar Todo
              </button>
            </div>
          </div>

          {/* Método de Pago */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Método de Pago *
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
              <option value="TARJETA">Tarjeta</option>
            </select>
          </div>

          {/* Resumen */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.95rem'
            }}>
              <span>Saldo actual:</span>
              <span style={{ fontWeight: '600' }}>S/ {Number(servicio.saldo).toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.95rem',
              color: '#10b981'
            }}>
              <span>Monto a pagar:</span>
              <span style={{ fontWeight: '600' }}>- S/ {Number(montoPago || 0).toFixed(2)}</span>
            </div>
            <div style={{
              borderTop: '2px solid #d1d5db',
              paddingTop: '0.5rem',
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.1rem'
            }}>
              <span style={{ fontWeight: '700' }}>Saldo restante:</span>
              <span style={{
                fontWeight: '700',
                color: Number(servicio.saldo) - Number(montoPago || 0) === 0 ? '#10b981' : '#dc2626'
              }}>
                S/ {(Number(servicio.saldo) - Number(montoPago || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !montoPago || Number(montoPago) <= 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading || !montoPago || Number(montoPago) <= 0 ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || !montoPago || Number(montoPago) <= 0 ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
