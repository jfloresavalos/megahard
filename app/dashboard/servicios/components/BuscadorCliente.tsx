"use client"

import { useState } from "react"

interface Cliente {
  id: string
  nombre: string
  numeroDoc: string
  telefono: string | null
}

interface BuscadorClienteProps {
  onClienteSeleccionado: (cliente: Cliente | null) => void
  clienteNombre: string
  clienteDni: string
  clienteCelular: string
  onCambioNombre: (valor: string) => void
  onCambioDni: (valor: string) => void
  onCambioCelular: (valor: string) => void
}

export default function BuscadorCliente({
  onClienteSeleccionado,
  clienteNombre,
  clienteDni,
  clienteCelular,
  onCambioNombre,
  onCambioDni,
  onCambioCelular
}: BuscadorClienteProps) {
  const [busquedaDni, setBusquedaDni] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const buscarCliente = async () => {
    if (busquedaDni.length < 8) {
      setMensaje('⚠️ El DNI debe tener 8 dígitos')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setBuscando(true)
    setMensaje('')

    try {
      console.log('🔍 Buscando cliente por DNI:', busquedaDni)
      
      // ✅ CORREGIDO: Usar endpoint específico de búsqueda por DNI
      const response = await fetch(`/api/clientes/buscar?numeroDoc=${encodeURIComponent(busquedaDni)}`)
      const data = await response.json()
      
      console.log('📦 Respuesta:', data)
      
      // ✅ CORREGIDO: Ahora verifica data.cliente (singular) en vez de data.clientes (plural)
      if (data.success && data.cliente) {
        const cliente = data.cliente
        
        // Llenar los datos
        onClienteSeleccionado(cliente)
        onCambioNombre(cliente.nombre)
        onCambioDni(cliente.numeroDoc)
        onCambioCelular(cliente.telefono || '')
        
        setClienteEncontrado(true)
        setMensaje('✅ Cliente encontrado en el sistema')
        
        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('⚠️ Cliente no encontrado. Complete los datos manualmente para registrarlo.')
        setClienteEncontrado(false)
        onCambioDni(busquedaDni)
        
        setTimeout(() => setMensaje(''), 5000)
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error)
      setMensaje('❌ Error al buscar cliente')
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setBuscando(false)
    }
  }

  const limpiarCliente = () => {
    onClienteSeleccionado(null)
    onCambioNombre('')
    onCambioDni('')
    onCambioCelular('')
    setBusquedaDni('')
    setClienteEncontrado(false)
    setMensaje('')
  }

  const validarDni = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '').slice(0, 8)
    onCambioDni(soloNumeros)
  }

  const validarCelular = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '').slice(0, 9)
    onCambioCelular(soloNumeros)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarCliente()
    }
  }

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      {/* Buscador con botón */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '2px solid #cbd5e1'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔍</span>
          <label style={{
            fontWeight: '700',
            fontSize: '1.1rem',
            color: '#1e293b',
            margin: 0
          }}>
            Buscar Cliente por DNI
          </label>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'stretch'
        }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <input
              type="text"
              value={busquedaDni}
              onChange={(e) => setBusquedaDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={handleKeyDown}
              placeholder="Ingrese DNI (8 dígitos)..."
              disabled={clienteEncontrado}
              maxLength={8}
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                border: `2px solid ${clienteEncontrado ? '#10b981' : '#3b82f6'}`,
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                backgroundColor: clienteEncontrado ? '#ecfdf5' : 'white',
                boxShadow: clienteEncontrado ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)',
                transition: 'all 0.2s'
              }}
            />
          </div>

          {clienteEncontrado ? (
            <button
              type="button"
              onClick={limpiarCliente}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              🔄 Cambiar Cliente
            </button>
          ) : (
            <button
              type="button"
              onClick={buscarCliente}
              disabled={buscando || busquedaDni.length < 8}
              style={{
                padding: '1rem 2rem',
                backgroundColor: buscando || busquedaDni.length < 8 ? '#94a3b8' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: buscando || busquedaDni.length < 8 ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                boxShadow: buscando || busquedaDni.length < 8 ? 'none' : '0 4px 6px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s',
                opacity: buscando || busquedaDni.length < 8 ? 0.6 : 1
              }}
            >
              {buscando ? '⏳ Buscando...' : '🔍 Buscar'}
            </button>
          )}
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            textAlign: 'center',
            backgroundColor: mensaje.includes('✅') ? '#d1fae5' :
                           mensaje.includes('❌') ? '#fee2e2' : '#fef3c7',
            color: mensaje.includes('✅') ? '#065f46' :
                   mensaje.includes('❌') ? '#991b1b' : '#92400e',
            border: `2px solid ${mensaje.includes('✅') ? '#10b981' :
                                mensaje.includes('❌') ? '#ef4444' : '#f59e0b'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {mensaje}
          </div>
        )}
      </div>

      {/* Datos del cliente */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '2px solid #cbd5e1'
        }}>
          <span style={{ fontSize: '1.5rem' }}>👤</span>
          <h3 style={{
            fontWeight: '700',
            fontSize: '1.1rem',
            color: '#1e293b',
            margin: 0
          }}>
            Datos del Cliente
          </h3>
        </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        padding: '1.5rem',
        backgroundColor: clienteEncontrado ? '#ecfdf5' : 'white',
        borderRadius: '10px',
        border: clienteEncontrado ? '2px solid #10b981' : '2px solid #e2e8f0',
        boxShadow: clienteEncontrado ? '0 0 0 4px rgba(16, 185, 129, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.6rem',
            fontWeight: '600',
            fontSize: '0.9rem',
            color: '#475569'
          }}>
            Nombre Completo *
          </label>
          <input
            type="text"
            value={clienteNombre}
            onChange={(e) => onCambioNombre(e.target.value)}
            required
            disabled={clienteEncontrado}
            placeholder="Nombre completo del cliente"
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem',
              backgroundColor: clienteEncontrado ? '#d1fae5' : 'white',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.6rem',
            fontWeight: '600',
            fontSize: '0.9rem',
            color: '#475569'
          }}>
            DNI * <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '400' }}>(8 dígitos)</span>
          </label>
          <input
            type="text"
            value={clienteDni}
            onChange={(e) => validarDni(e.target.value)}
            required
            maxLength={8}
            disabled={clienteEncontrado}
            placeholder="12345678"
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              border: `2px solid ${clienteDni.length === 8 ? '#10b981' : '#cbd5e1'}`,
              borderRadius: '8px',
              fontSize: '0.95rem',
              backgroundColor: clienteEncontrado ? '#d1fae5' : 'white',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.6rem',
            fontWeight: '600',
            fontSize: '0.9rem',
            color: '#475569'
          }}>
            Celular * <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '400' }}>(9 dígitos)</span>
          </label>
          <input
            type="text"
            value={clienteCelular}
            onChange={(e) => validarCelular(e.target.value)}
            required
            maxLength={9}
            disabled={clienteEncontrado}
            placeholder="987654321"
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              border: `2px solid ${clienteCelular.length === 9 ? '#10b981' : '#cbd5e1'}`,
              borderRadius: '8px',
              fontSize: '0.95rem',
              backgroundColor: clienteEncontrado ? '#d1fae5' : 'white',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          />
        </div>
      </div>
      </div>
    </div>
  )
}