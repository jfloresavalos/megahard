"use client"

import { useState, useEffect } from "react"

interface Cliente {
  id: string
  nombre: string
  numeroDoc: string
  tipoDoc: string
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
  tipoDoc?: string
  onCambioTipoDoc?: (valor: string) => void
}

export default function BuscadorCliente({
  onClienteSeleccionado,
  clienteNombre,
  clienteDni,
  clienteCelular,
  onCambioNombre,
  onCambioDni,
  onCambioCelular,
  tipoDoc = 'DNI',
  onCambioTipoDoc
}: BuscadorClienteProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [busquedaDni, setBusquedaDni] = useState('')
  const [tipoDocBusqueda, setTipoDocBusqueda] = useState('DNI')
  const [buscando, setBuscando] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    tipoDoc: 'DNI',
    numeroDoc: '',
    nombre: '',
    telefono: '',
    razonSocial: '',
    direccion: '',
    email: ''
  })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const buscarCliente = async () => {
    if (!busquedaDni.trim()) {
      setMensaje('⚠️ Ingrese un número de documento')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    const numeroDoc = busquedaDni.trim()

    // Validar formato según tipo de documento
    if (tipoDocBusqueda === 'DNI') {
      if (!/^\d{8}$/.test(numeroDoc)) {
        setMensaje('⚠️ El DNI debe tener exactamente 8 dígitos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    } else if (tipoDocBusqueda === 'RUC') {
      if (!/^\d{11}$/.test(numeroDoc)) {
        setMensaje('⚠️ El RUC debe tener exactamente 11 dígitos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    } else if (tipoDocBusqueda === 'CE') {
      if (!/^\d{9}$/.test(numeroDoc)) {
        setMensaje('⚠️ El CE debe tener exactamente 9 dígitos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    } else if (tipoDocBusqueda === 'PASAPORTE') {
      if (!/^[A-Za-z0-9]{7,12}$/.test(numeroDoc)) {
        setMensaje('⚠️ El Pasaporte debe tener entre 7 y 12 caracteres alfanuméricos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    }

    setBuscando(true)
    setMensaje('')

    try {
      console.log('🔍 Buscando cliente:', { numeroDoc, tipoDoc: tipoDocBusqueda })

      const response = await fetch(`/api/clientes/buscar?numeroDoc=${encodeURIComponent(numeroDoc)}&tipoDoc=${tipoDocBusqueda}`)
      const data = await response.json()

      console.log('📦 Respuesta:', data)

      if (data.success && data.cliente) {
        const cliente = data.cliente

        // Llenar los datos
        onClienteSeleccionado(cliente)
        onCambioNombre(cliente.nombre)
        onCambioDni(cliente.numeroDoc)
        onCambioCelular(cliente.telefono || '')
        if (onCambioTipoDoc) {
          onCambioTipoDoc(cliente.tipoDoc)
        }

        setClienteEncontrado(true)
        setMensaje('✅ Cliente encontrado en el sistema')

        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('⚠️ Cliente no encontrado. Complete los datos manualmente para registrarlo.')
        setClienteEncontrado(false)
        onCambioDni(numeroDoc)
        if (onCambioTipoDoc) {
          onCambioTipoDoc(tipoDocBusqueda)
        }

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

  const validarDocumento = (valor: string, tipo: string) => {
    if (tipo === 'DNI') {
      const soloNumeros = valor.replace(/\D/g, '').slice(0, 8)
      onCambioDni(soloNumeros)
    } else if (tipo === 'RUC') {
      const soloNumeros = valor.replace(/\D/g, '').slice(0, 11)
      onCambioDni(soloNumeros)
    } else if (tipo === 'CE') {
      const soloNumeros = valor.replace(/\D/g, '').slice(0, 9)
      onCambioDni(soloNumeros)
    } else if (tipo === 'PASAPORTE') {
      const alfanumerico = valor.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)
      onCambioDni(alfanumerico)
    }
  }

  const validarCelular = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '').slice(0, 9)
    onCambioCelular(soloNumeros)
  }

  const getMaxLength = () => {
    if (tipoDocBusqueda === 'DNI') return 8
    if (tipoDocBusqueda === 'RUC') return 11
    if (tipoDocBusqueda === 'CE') return 9
    if (tipoDocBusqueda === 'PASAPORTE') return 12
    return 12
  }

  const getPlaceholder = () => {
    if (tipoDocBusqueda === 'DNI') return 'Ingrese DNI (8 dígitos)...'
    if (tipoDocBusqueda === 'RUC') return 'Ingrese RUC (11 dígitos)...'
    if (tipoDocBusqueda === 'CE') return 'Ingrese CE (9 dígitos)...'
    if (tipoDocBusqueda === 'PASAPORTE') return 'Ingrese Pasaporte (7-12 caracteres)...'
    return 'Ingrese número de documento...'
  }

  const handleChangeBusqueda = (valor: string) => {
    if (tipoDocBusqueda === 'PASAPORTE') {
      setBusquedaDni(valor.replace(/[^A-Za-z0-9]/g, '').slice(0, 12))
    } else {
      setBusquedaDni(valor.replace(/\D/g, '').slice(0, getMaxLength()))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarCliente()
    }
  }

  const handleAbrirModalCrear = () => {
    setNuevoCliente({
      tipoDoc: tipoDocBusqueda,
      numeroDoc: busquedaDni,
      nombre: '',
      telefono: '',
      razonSocial: '',
      direccion: '',
      email: ''
    })
    setMostrarModalCrear(true)
  }

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.numeroDoc.trim()) {
      setMensaje('⚠️ Nombre y documento son obligatorios')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    // Validar formato según tipo de documento
    const numeroDoc = nuevoCliente.numeroDoc.trim()

    if (nuevoCliente.tipoDoc === 'DNI') {
      if (!/^\d{8}$/.test(numeroDoc)) {
        setMensaje('⚠️ El DNI debe tener exactamente 8 dígitos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    } else if (nuevoCliente.tipoDoc === 'RUC') {
      if (!/^\d{11}$/.test(numeroDoc)) {
        setMensaje('⚠️ El RUC debe tener exactamente 11 dígitos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    } else if (nuevoCliente.tipoDoc === 'CE') {
      if (!/^\d{9}$/.test(numeroDoc)) {
        setMensaje('⚠️ El CE debe tener exactamente 9 dígitos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    } else if (nuevoCliente.tipoDoc === 'PASAPORTE') {
      if (!/^[A-Za-z0-9]{7,12}$/.test(numeroDoc)) {
        setMensaje('⚠️ El Pasaporte debe tener entre 7 y 12 caracteres alfanuméricos')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    }

    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente)
      })

      const data = await response.json()

      if (data.success) {
        // Llenar los datos del cliente creado
        onClienteSeleccionado(data.cliente)
        onCambioNombre(data.cliente.nombre)
        onCambioDni(data.cliente.numeroDoc)
        onCambioCelular(data.cliente.telefono || '')
        if (onCambioTipoDoc) {
          onCambioTipoDoc(data.cliente.tipoDoc)
        }

        setClienteEncontrado(true)
        setMensaje('✅ Cliente creado y seleccionado correctamente')
        setMostrarModalCrear(false)
        setBusquedaDni(data.cliente.numeroDoc)
        setTipoDocBusqueda(data.cliente.tipoDoc)

        setTimeout(() => setMensaje(''), 3000)
      } else {
        setMensaje('❌ Error: ' + (data.error || 'Error al crear cliente'))
        setTimeout(() => setMensaje(''), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al crear cliente')
      setTimeout(() => setMensaje(''), 3000)
    }
  }

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      padding: isMobile ? '0.75rem' : '1.5rem',
      borderRadius: isMobile ? '8px' : '12px',
      border: '2px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      {/* Buscador con botón */}
      <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: isMobile ? '0.75rem' : '1rem',
          paddingBottom: isMobile ? '0.5rem' : '0.75rem',
          borderBottom: '2px solid #cbd5e1'
        }}>
          <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>🔍</span>
          <label style={{
            fontWeight: '700',
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#1e293b',
            margin: 0
          }}>
            Buscar Cliente
          </label>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '90px 1fr' : '180px 1fr auto',
          gap: isMobile ? '0.5rem' : '0.75rem',
          marginBottom: '0.5rem',
          alignItems: 'stretch'
        }}>
          <div>
            <select
              value={tipoDocBusqueda}
              onChange={(e) => {
                setTipoDocBusqueda(e.target.value)
                setBusquedaDni('')
              }}
              disabled={clienteEncontrado}
              style={{
                width: '100%',
                height: '100%',
                padding: isMobile ? '0.625rem' : '1rem',
                border: '2px solid #3b82f6',
                borderRadius: isMobile ? '6px' : '8px',
                fontSize: isMobile ? '0.8rem' : '0.95rem',
                fontWeight: '600',
                backgroundColor: clienteEncontrado ? '#ecfdf5' : 'white',
                cursor: clienteEncontrado ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="DNI">DNI</option>
              <option value="RUC">RUC</option>
              <option value="CE">CE</option>
              <option value="PASAPORTE">{isMobile ? 'Pasap.' : 'Pasaporte'}</option>
            </select>
          </div>

          <div style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
            <input
              type="text"
              value={busquedaDni}
              onChange={(e) => handleChangeBusqueda(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? 'Nº documento...' : getPlaceholder()}
              disabled={clienteEncontrado}
              maxLength={getMaxLength()}
              style={{
                width: '100%',
                padding: isMobile ? '0.625rem 0.75rem' : '1rem 1.25rem',
                border: `2px solid ${clienteEncontrado ? '#10b981' : '#3b82f6'}`,
                borderRadius: isMobile ? '6px' : '8px',
                fontSize: isMobile ? '0.85rem' : '1rem',
                fontWeight: '500',
                backgroundColor: clienteEncontrado ? '#ecfdf5' : 'white',
                boxShadow: clienteEncontrado ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : '0 0 0 3px rgba(59, 130, 246, 0.1)',
                transition: 'all 0.2s'
              }}
            />
          </div>

          {!isMobile && (clienteEncontrado ? (
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
              disabled={buscando || !busquedaDni.trim()}
              style={{
                padding: '1rem 2rem',
                backgroundColor: buscando || !busquedaDni.trim() ? '#94a3b8' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: buscando || !busquedaDni.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                boxShadow: buscando || !busquedaDni.trim() ? 'none' : '0 4px 6px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s',
                opacity: buscando || !busquedaDni.trim() ? 0.6 : 1
              }}
            >
              {buscando ? '⏳ Buscando...' : '🔍 Buscar'}
            </button>
          ))}
        </div>

        {/* Botón móvil debajo */}
        {isMobile && (
          <div style={{ marginTop: '0.5rem' }}>
            {clienteEncontrado ? (
              <button
                type="button"
                onClick={limpiarCliente}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                  transition: 'all 0.2s'
                }}
              >
                🔄 Cambiar Cliente
              </button>
            ) : (
              <button
                type="button"
                onClick={buscarCliente}
                disabled={buscando || !busquedaDni.trim()}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  backgroundColor: buscando || !busquedaDni.trim() ? '#94a3b8' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: buscando || !busquedaDni.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  boxShadow: buscando || !busquedaDni.trim() ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s',
                  opacity: buscando || !busquedaDni.trim() ? 0.6 : 1
                }}
              >
                {buscando ? '⏳ Buscando...' : '🔍 Buscar Cliente'}
              </button>
            )}
          </div>
        )}

        <div style={{
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          color: '#6b7280',
          marginTop: '0.5rem',
          paddingLeft: isMobile ? '0' : '185px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          {tipoDocBusqueda === 'DNI' && 'DNI: 8 dígitos numéricos'}
          {tipoDocBusqueda === 'RUC' && 'RUC: 11 dígitos numéricos'}
          {tipoDocBusqueda === 'CE' && 'CE: 9 dígitos numéricos'}
          {tipoDocBusqueda === 'PASAPORTE' && 'Pasaporte: 7-12 caracteres alfanuméricos'}
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div style={{
            marginTop: isMobile ? '0.75rem' : '1rem',
            padding: isMobile ? '0.75rem' : '1rem 1.25rem',
            borderRadius: isMobile ? '6px' : '8px',
            fontSize: isMobile ? '0.8rem' : '0.95rem',
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

        {/* Información del cliente encontrado */}
        {clienteEncontrado && (
          <div style={{
            marginTop: isMobile ? '0.75rem' : '1rem',
            padding: isMobile ? '0.75rem' : '1.25rem',
            backgroundColor: '#ecfdf5',
            borderRadius: isMobile ? '6px' : '8px',
            border: '2px solid #10b981',
            boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: isMobile ? '0.5rem' : '0.75rem'
            }}>
              <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>✅</span>
              <span style={{
                fontSize: isMobile ? '0.85rem' : '1rem',
                fontWeight: '700',
                color: '#065f46'
              }}>
                Cliente Seleccionado
              </span>
            </div>
            <div style={{
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              {clienteNombre}
            </div>
            <div style={{
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              color: '#6b7280',
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <span>
                <strong>{tipoDoc || tipoDocBusqueda}:</strong> {clienteDni}
              </span>
              {clienteCelular && (
                <>
                  <span>•</span>
                  <span>
                    <strong>Celular:</strong> {clienteCelular}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Botón Crear Cliente - Solo mostrar si no hay cliente encontrado */}
        {!clienteEncontrado && (
          <div style={{ marginTop: isMobile ? '0.75rem' : '1rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleAbrirModalCrear}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '0.625rem' : '0.875rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: isMobile ? '6px' : '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                fontWeight: '700',
                boxShadow: isMobile ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 4px 6px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              ➕ Crear Nuevo Cliente
            </button>
          </div>
        )}
      </div>

      {/* Modal Crear Cliente */}
      {mostrarModalCrear && (
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                ➕ Crear Nuevo Cliente
              </h2>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Tipo y Número de Documento */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    Tipo de Documento *
                  </label>
                  <select
                    value={nuevoCliente.tipoDoc}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipoDoc: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    value={nuevoCliente.numeroDoc}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, numeroDoc: e.target.value })}
                    placeholder={
                      nuevoCliente.tipoDoc === 'DNI' ? '8 dígitos' :
                      nuevoCliente.tipoDoc === 'RUC' ? '11 dígitos' :
                      nuevoCliente.tipoDoc === 'CE' ? '9 dígitos' :
                      '7-12 caracteres alfanuméricos'
                    }
                    maxLength={
                      nuevoCliente.tipoDoc === 'DNI' ? 8 :
                      nuevoCliente.tipoDoc === 'RUC' ? 11 :
                      nuevoCliente.tipoDoc === 'CE' ? 9 :
                      12
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem'
                  }}>
                    {nuevoCliente.tipoDoc === 'DNI' && 'DNI: 8 dígitos numéricos'}
                    {nuevoCliente.tipoDoc === 'RUC' && 'RUC: 11 dígitos numéricos'}
                    {nuevoCliente.tipoDoc === 'CE' && 'CE: 9 dígitos numéricos'}
                    {nuevoCliente.tipoDoc === 'PASAPORTE' && 'Pasaporte: 7-12 caracteres alfanuméricos'}
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez García"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Razón Social - Solo para RUC */}
              {nuevoCliente.tipoDoc === 'RUC' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={nuevoCliente.razonSocial}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, razonSocial: e.target.value })}
                    placeholder="Ej: Empresa SAC"
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

              {/* Teléfono y Email */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="Ej: 987654321"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="Ej: cliente@email.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  Dirección
                </label>
                <textarea
                  value={nuevoCliente.direccion}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                  placeholder="Ej: Av. Principal 123, Lima"
                  rows={3}
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
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearCliente}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                ✅ Crear Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}