"use client"

import { useState } from "react"

interface ModalIngresoStockProps {
  producto: {
    id: string
    codigo: string
    nombre: string
    stock: number
    precioCompra: number
    precioVenta: number
  }
  sedeId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ModalIngresoStock({
  producto,
  sedeId,
  onClose,
  onSuccess
}: ModalIngresoStockProps) {
  const [cantidad, setCantidad] = useState('')
  const [precioCompra, setPrecioCompra] = useState(producto.precioCompra.toString())
  const [precioVenta, setPrecioVenta] = useState(producto.precioVenta.toString())
  const [referencia, setReferencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardarIngreso = async () => {
    if (!cantidad || parseInt(cantidad) <= 0) {
      alert('❌ La cantidad debe ser mayor a 0')
      return
    }

    if (!precioCompra) {
      alert('❌ El precio de compra es requerido')
      return
    }

    try {
      setGuardando(true)

      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: producto.id,
          sedeId: sedeId,
          tipo: 'INGRESO',
          cantidad: parseInt(cantidad),
          precioCompra: parseFloat(precioCompra),
          precioVenta: precioVenta ? parseFloat(precioVenta) : null,
          motivo: 'Ingreso de mercadería',
          referencia: referencia || null,
          observaciones: observaciones || null
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Ingreso registrado. Stock actualizado: ${data.movimiento.stockNuevo} unidades`)
        onSuccess()
        onClose()
      } else {
        alert(`❌ ${data.error}`)
      }

    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al registrar ingreso')
    } finally {
      setGuardando(false)
    }
  }

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
        padding: '2rem',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
            📥 Ingresar Stock
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Información del producto */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e40af' }}>
            {producto.codigo} - {producto.nombre}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#1e40af', marginTop: '0.5rem' }}>
            Stock actual: <strong>{producto.stock}</strong> unidades
          </div>
        </div>

        {/* Formulario */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Cantidad */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Cantidad a Ingresar *
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="1"
              placeholder="0"
              style={{
                width: '100%',
                padding: '1rem',
                border: '2px solid #10b981',
                borderRadius: '8px',
                fontSize: '1.5rem',
                textAlign: 'center',
                fontWeight: '700'
              }}
            />
            {cantidad && parseInt(cantidad) > 0 && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#d1fae5',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '0.95rem',
                color: '#065f46',
                fontWeight: '600'
              }}>
                Nuevo stock: {producto.stock + parseInt(cantidad)} unidades
              </div>
            )}
          </div>

          {/* Precios */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Precio Compra * (S/)
              </label>
              <input
                type="number"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(e.target.value)}
                step="0.01"
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Precio Venta (S/)
              </label>
              <input
                type="number"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                step="0.01"
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {/* Margen */}
          {precioCompra && precioVenta && parseFloat(precioVenta) > parseFloat(precioCompra) && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: '#92400e'
            }}>
              📊 Margen: S/ {(parseFloat(precioVenta) - parseFloat(precioCompra)).toFixed(2)} 
              ({((parseFloat(precioVenta) - parseFloat(precioCompra)) / parseFloat(precioCompra) * 100).toFixed(1)}%)
            </div>
          )}

          {/* Referencia */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Referencia (Factura/Orden de Compra)
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: FAC-001-2024"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem'
              }}
            />
          </div>

          {/* Observaciones */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas adicionales..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '2px solid #e5e7eb'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            Cancelar
          </button>

          <button
            onClick={guardarIngreso}
            disabled={guardando}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: guardando ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: guardando ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            {guardando ? '⏳ Guardando...' : '📥 Registrar Ingreso'}
          </button>
        </div>
      </div>
    </div>
  )
}