"use client"

import { useState } from "react"

interface ModalAnularServicioProps {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    numeroServicio: string
    clienteNombre: string
    aCuenta: number
    estado: string
    items?: any[]
  }
}

export default function ModalAnularServicio({ isOpen, onClose, servicio }: ModalAnularServicioProps) {
  const [loading, setLoading] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [otroMotivo, setOtroMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [devolverAdelanto, setDevolverAdelanto] = useState(false)
  const [montoDevolucion, setMontoDevolucion] = useState(servicio.aCuenta)
  const [metodoDevolucion, setMetodoDevolucion] = useState('EFECTIVO')

  const motivosComunes = [
    'Cliente desiste',
    'No tiene reparación',
    'Cliente no vuelve a recoger',
    'Error en registro',
    'Cliente no autoriza reparación',
    'Equipo sin solución técnica',
    'Otro'
  ]

  const handleAnular = async () => {
    // Validaciones
    const motivoFinal = motivo === 'Otro' ? otroMotivo : motivo

    if (!motivoFinal.trim()) {
      alert('⚠️ Debe seleccionar o especificar un motivo de anulación')
      return
    }

    if (devolverAdelanto) {
      if (montoDevolucion <= 0) {
        alert('⚠️ El monto de devolución debe ser mayor a 0')
        return
      }

      if (montoDevolucion > servicio.aCuenta) {
        alert(`⚠️ El monto a devolver no puede ser mayor al adelanto (S/ ${servicio.aCuenta.toFixed(2)})`)
        return
      }

      if (!metodoDevolucion) {
        alert('⚠️ Seleccione el método de devolución')
        return
      }
    }

    // Confirmación final
    const mensajeConfirmacion = [
      `¿Está SEGURO de ANULAR el servicio ${servicio.numeroServicio}?`,
      '',
      '⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER',
      '',
      `Cliente: ${servicio.clienteNombre}`,
      `Motivo: ${motivoFinal}`,
      '',
      devolverAdelanto 
        ? `✅ Se devolverá S/ ${montoDevolucion.toFixed(2)} vía ${metodoDevolucion}`
        : '❌ No se devolverá dinero',
      '',
      servicio.estado === 'REPARADO' && servicio.items && servicio.items.length > 0
        ? `📦 Se devolverán ${servicio.items.length} repuesto(s) al stock`
        : ''
    ].filter(Boolean).join('\n')

    const confirmar = confirm(mensajeConfirmacion)
    if (!confirmar) return

    setLoading(true)

    try {
      const response = await fetch(`/api/servicios/${servicio.id}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: motivoFinal,
          observaciones: observaciones.trim() || null,
          devolverAdelanto,
          montoDevolucion: devolverAdelanto ? montoDevolucion : 0,
          metodoDevolucion: devolverAdelanto ? metodoDevolucion : null
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Servicio ${servicio.numeroServicio} anulado correctamente`)
        onClose()
      } else {
        alert('❌ Error: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al anular servicio')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const tieneRepuestos = servicio.estado === 'REPARADO' && servicio.items && servicio.items.length > 0

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
      padding: '1rem',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#fee2e2',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#dc2626' }}>
            🚫 Anular Servicio
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            {servicio.numeroServicio} - {servicio.clienteNombre}
          </p>
        </div>

        {/* Contenido */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Advertencia */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '2px solid #f59e0b'
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
              ⚠️ Advertencia
            </div>
            <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
              Esta acción NO se puede deshacer. El servicio quedará marcado como CANCELADO permanentemente.
            </div>
          </div>

          {/* Motivo de Anulación */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600', 
              fontSize: '0.875rem' 
            }}>
              Motivo de Anulación *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="">-- Seleccione un motivo --</option>
              {motivosComunes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Otro Motivo */}
          {motivo === 'Otro' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '600', 
                fontSize: '0.875rem' 
              }}>
                Especifique el motivo *
              </label>
              <input
                type="text"
                value={otroMotivo}
                onChange={(e) => setOtroMotivo(e.target.value)}
                placeholder="Ej: Cliente encontró otro técnico"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          )}

          {/* Observaciones */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600', 
              fontSize: '0.875rem' 
            }}>
              Observaciones Adicionales
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales sobre la anulación..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Información del Adelanto */}
          {servicio.aCuenta > 0 && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #3b82f6'
            }}>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#1e40af',
                marginBottom: '0.5rem'
              }}>
                💰 Adelanto Pagado
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e40af' }}>
                S/ {servicio.aCuenta.toFixed(2)}
              </div>
            </div>
          )}

          {/* ¿Devolver Adelanto? */}
          {servicio.aCuenta > 0 && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '2px solid ' + (devolverAdelanto ? '#10b981' : '#d1d5db')
                }}>
                  <input
                    type="checkbox"
                    checked={devolverAdelanto}
                    onChange={(e) => setDevolverAdelanto(e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                    ✅ Devolver adelanto al cliente
                  </span>
                </label>
              </div>

              {devolverAdelanto && (
                <>
                  {/* Monto a Devolver */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: '600', 
                      fontSize: '0.875rem' 
                    }}>
                      Monto a Devolver *
                    </label>
                    <input
                      type="number"
                      value={montoDevolucion}
                      onChange={(e) => setMontoDevolucion(parseFloat(e.target.value) || 0)}
                      min="0"
                      max={servicio.aCuenta}
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Máximo: S/ {servicio.aCuenta.toFixed(2)}
                    </div>
                  </div>

                  {/* Método de Devolución */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem', 
                      fontWeight: '600', 
                      fontSize: '0.875rem' 
                    }}>
                      Método de Devolución *
                    </label>
                    <select
                      value={metodoDevolucion}
                      onChange={(e) => setMetodoDevolucion(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="YAPE_PERSONAL">Yape Personal</option>
                      <option value="YAPE_EMPRESA">Yape Empresa</option>
                      <option value="DEPOSITO">Depósito</option>
                      <option value="INTERBANCARIO">Interbancario</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {/* Info sobre Repuestos */}
          {tieneRepuestos && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #10b981',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#065f46',
                marginBottom: '0.25rem'
              }}>
                📦 Repuestos Utilizados
              </div>
              <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                Se devolverán automáticamente {servicio.items?.length} repuesto(s) al stock
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          backgroundColor: '#f9fafb',
          position: 'sticky',
          bottom: 0
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              opacity: loading ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAnular}
            disabled={loading}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: loading ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600'
            }}
          >
            {loading ? '⏳ Anulando...' : '🚫 Anular Servicio'}
          </button>
        </div>
      </div>
    </div>
  )
}