"use client"

import { useState, useEffect } from "react"
import ModalBuscarProducto from "./ModalBuscarProducto"

interface Producto {
  id: string
  codigo: string
  nombre: string
  stock: number
  precioVenta: number
}

interface ProductoVendido {
  productoId: string
  codigo: string
  nombre: string
  cantidad: number
  precioUnit: number
}

interface MetodoPago {
  id: string
  nombre: string
  activo: boolean
}

interface ModalMarcarEntregadoProps {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    numeroServicio: string
    clienteNombre: string
    saldo: number
    metodoPago: string
    sedeId: string
  }
}

export default function ModalMarcarEntregado({ isOpen, onClose, servicio }: ModalMarcarEntregadoProps) {
  const [loading, setLoading] = useState(false)
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0])
  const [saldoPagado, setSaldoPagado] = useState(true)
  const [metodoPagoSaldo, setMetodoPagoSaldo] = useState(servicio.metodoPago || '')
  const [observaciones, setObservaciones] = useState('')

  // Campos adicionales
  const [recogioCliente, setRecogioCliente] = useState(true)
  const [quienRecibeNombre, setQuienRecibeNombre] = useState('')
  const [quienRecibeDni, setQuienRecibeDni] = useState('')

  // ✅ VENTA DE PRODUCTOS
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)
  const [productosVendidos, setProductosVendidos] = useState<ProductoVendido[]>([])

  // ✅ MÉTODOS DE PAGO DINÁMICOS
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])

  useEffect(() => {
    if (isOpen) {
      cargarMetodosPago()
    }
  }, [isOpen])

  const cargarMetodosPago = async () => {
    try {
      const response = await fetch('/api/metodos-pago')
      const data = await response.json()
      if (data.success) {
        setMetodosPago(data.metodosPago)
        // Si no hay método de pago del servicio, establecer el primero como predeterminado
        if (!servicio.metodoPago && data.metodosPago.length > 0) {
          setMetodoPagoSaldo(data.metodosPago[0].nombre)
        }
      }
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error)
    }
  }

  // Agregar producto desde el modal
  const agregarProducto = (producto: Producto, cantidad: number, precioFinal: number) => {
    const yaExiste = productosVendidos.find(p => p.productoId === producto.id)
    if (yaExiste) {
      alert('⚠️ El producto ya está en la lista')
      return
    }

    setProductosVendidos([...productosVendidos, {
      productoId: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      cantidad,
      precioUnit: precioFinal
    }])
  }

  const eliminarProducto = (productoId: string) => {
    setProductosVendidos(productosVendidos.filter(p => p.productoId !== productoId))
  }

  const calcularTotalProductos = () => {
    return productosVendidos.reduce((sum, p) => sum + (p.cantidad * p.precioUnit), 0)
  }

  const handleMarcarEntregado = async () => {
    if (!fechaEntrega) {
      alert('⚠️ La fecha de entrega es obligatoria')
      return
    }

    // Validar campos de quien recoge si no es el cliente
    if (!recogioCliente) {
      if (!quienRecibeNombre.trim()) {
        alert('⚠️ Ingrese el nombre de quien recoge el equipo')
        return
      }
      if (!quienRecibeDni.trim() || quienRecibeDni.length !== 8) {
        alert('⚠️ Ingrese un DNI válido (8 dígitos) de quien recoge')
        return
      }
    }

    if (Number(servicio.saldo) > 0 && !saldoPagado) {
      const confirmar = confirm(
        `⚠️ El cliente tiene un saldo pendiente de S/ ${Number(servicio.saldo).toFixed(2)}.\n\n¿Está seguro de marcar como entregado sin cobrar?`
      )
      if (!confirmar) return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/servicios/${servicio.id}/marcar-entregado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaEntrega,
          saldoPagado,
          metodoPagoSaldo: saldoPagado ? metodoPagoSaldo : null,
          observaciones: observaciones.trim() || null,
          quienRecibeNombre: recogioCliente ? null : quienRecibeNombre.trim(),
          quienRecibeDni: recogioCliente ? null : quienRecibeDni.trim(),
          productosVendidos // ✅ Enviar productos vendidos
        })
      })

      const data = await response.json()

      if (data.success) {
        const mensaje = productosVendidos.length > 0
          ? `✅ Servicio ${servicio.numeroServicio} marcado como ENTREGADO\n💰 Se vendieron ${productosVendidos.length} producto(s) adicional(es)`
          : `✅ Servicio ${servicio.numeroServicio} marcado como ENTREGADO`
        
        alert(mensaje)
        onClose()
      } else {
        alert('❌ Error: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al marcar como entregado')
    } finally {
      setLoading(false)
    }
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
      padding: '1rem',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#f0fdf4',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#065f46' }}>
            📦 Marcar como Entregado
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            {servicio.numeroServicio} - {servicio.clienteNombre}
          </p>
        </div>

        {/* Contenido */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Fecha de Entrega */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Fecha de Entrega *
            </label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* ¿Quién recoge? */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
              👤 ¿Quién recoge el equipo?
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
              <input type="radio" checked={recogioCliente} onChange={() => setRecogioCliente(true)} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem' }}>El cliente ({servicio.clienteNombre})</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="radio" checked={!recogioCliente} onChange={() => setRecogioCliente(false)} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.875rem' }}>Otra persona</span>
            </label>

            {!recogioCliente && (
              <div style={{ paddingLeft: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={quienRecibeNombre}
                    onChange={(e) => setQuienRecibeNombre(e.target.value)}
                    placeholder="Ej: María López"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
                    DNI *
                  </label>
                  <input
                    type="text"
                    value={quienRecibeDni}
                    onChange={(e) => setQuienRecibeDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="12345678"
                    maxLength={8}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Saldo Pendiente */}
          {Number(servicio.saldo) > 0 && (
            <>
              <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '1.5rem', border: '2px solid #fbbf24' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                  💰 Saldo Pendiente
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>
                  S/ {Number(servicio.saldo).toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', cursor: 'pointer', border: '2px solid ' + (saldoPagado ? '#10b981' : '#d1d5db') }}>
                  <input type="checkbox" checked={saldoPagado} onChange={(e) => setSaldoPagado(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>✅ El cliente pagó el saldo completo</span>
                </label>
              </div>

              {saldoPagado && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                    Método de Pago del Saldo
                  </label>
                  <select value={metodoPagoSaldo} onChange={(e) => setMetodoPagoSaldo(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: 'white' }}>
                    {metodosPago.map((metodo) => (
                      <option key={metodo.id} value={metodo.nombre}>
                        {metodo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* ✅ VENTA DE PRODUCTOS ADICIONALES */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', marginBottom: '1rem' }}>
              🛒 Vender Productos Adicionales (Opcional)
            </div>

            {/* INPUT CON LUPA PARA ABRIR MODAL */}
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder="Buscar producto para vender..."
                readOnly
                onClick={() => setModalBuscarOpen(true)}
                style={{
                  width: "100%",
                  padding: "0.75rem 3rem 0.75rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  backgroundColor: "white",
                }}
              />
              <button
                type="button"
                onClick={() => setModalBuscarOpen(true)}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "0.5rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  fontSize: "1.1rem",
                }}
                title="Buscar producto"
              >
                🔍
              </button>
            </div>

            {/* Lista de productos vendidos */}
            {productosVendidos.length > 0 && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                {productosVendidos.map((item, index) => (
                    <div key={item.productoId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: index < productosVendidos.length - 1 ? '1px solid #e5e7eb' : 'none', backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: '600' }}>{item.codigo} - {item.nombre}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>x{item.cantidad} @ S/ {item.precioUnit.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: '600', color: '#10b981', fontSize: '0.875rem' }}>S/ {(item.cantidad * item.precioUnit).toFixed(2)}</div>
                        <button type="button" onClick={() => eliminarProducto(item.productoId)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                      </div>
                    </div>
                  ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f0fdf4', fontWeight: '700', fontSize: '1rem' }}>
                  <span>TOTAL PRODUCTOS:</span>
                  <span style={{ color: '#10b981' }}>S/ {calcularTotalProductos().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              Observaciones de Entrega
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Ej: Cliente conforme con el trabajo..."
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical' }}
            />
          </div>

          {/* Advertencia si no pagó */}
          {Number(servicio.saldo) > 0 && !saldoPagado && (
            <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #ef4444', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#dc2626', marginBottom: '0.25rem' }}>
                ⚠️ Advertencia
              </div>
              <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                El servicio se marcará como entregado con saldo pendiente.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#f9fafb', position: 'sticky', bottom: 0 }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', opacity: loading ? 0.5 : 1 }}>
            Cancelar
          </button>
          <button onClick={handleMarcarEntregado} disabled={loading} style={{ padding: '0.75rem 2rem', backgroundColor: loading ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', fontWeight: '600' }}>
            {loading ? '⏳ Procesando...' : '📦 Marcar como Entregado'}
          </button>
        </div>
      </div>

      {/* MODAL BUSCAR PRODUCTO */}
      <ModalBuscarProducto
        isOpen={modalBuscarOpen}
        onClose={() => setModalBuscarOpen(false)}
        sedeId={servicio.sedeId}
        onSeleccionar={agregarProducto}
        tituloModal="Buscar Producto para Vender"
      />
    </div>
  )
}