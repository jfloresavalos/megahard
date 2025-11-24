"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface Traspaso {
  id: string
  tipo: string
  cantidad: number
  motivo: string | null
  referencia: string | null
  estadoTraspaso: string | null
  fechaEnvio: string | null
  fecha: string
  sedeId?: string
  sedeOrigenId?: string | null
  sedeDestinoId?: string | null
  producto: {
    id: string
    nombre: string
    codigo: string
  }
  sedeOrigen: {
    id: string
    nombre: string
  } | null
  sedeDestino: {
    id: string
    nombre: string
  } | null
  sede?: {
    id: string
    nombre: string
  }
  usuario: {
    id: string
    nombre: string
  }
  usuarioRecibe?: {
    id: string
    nombre: string
  }
  traspasoRelacionado?: {
    id: string
    fechaRecepcion: string
    sedeOrigenId: string | null
    sedeDestinoId: string | null
    sedeId?: string
    sedeOrigen?: {
      id: string
      nombre: string
    } | null
    sedeDestino?: {
      id: string
      nombre: string
    } | null
    sede?: {
      id: string
      nombre: string
    }
  }
}

interface LoteTraspaso {
  loteId: string
  fecha: string
  estado: string | null
  sedeOrigen: { id: string; nombre: string }
  sedeDestino: { id: string; nombre: string }
  usuario: { id: string; nombre: string }
  productos: Array<{
    codigo: string
    nombre: string
    cantidad: number
  }>
  traspasos: Traspaso[]
}

export default function TraspasosPage() {
  const router = useRouter()
  const { data: session } = useSession()

  // Obtener fecha actual en zona horaria de Perú
  const obtenerFechaHoyPeru = () => {
    const ahora = new Date()
    // Convertir a hora de Lima (UTC-5)
    const fechaLima = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }))
    const year = fechaLima.getFullYear()
    const month = String(fechaLima.getMonth() + 1).padStart(2, '0')
    const day = String(fechaLima.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const hoy = obtenerFechaHoyPeru()
  const [traspasos, setTraspasos] = useState<Traspaso[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [isMobile, setIsMobile] = useState(false)
  const [modalRecibir, setModalRecibir] = useState<string | null>(null)
  const [modalCancelar, setModalCancelar] = useState<string | null>(null)
  const [cantidadRecibida, setCantidadRecibida] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [lotesExpandidos, setLotesExpandidos] = useState<Set<string>>(new Set())

  // Información del usuario logueado
  const usuarioSedeId = (session?.user as any)?.sedeId || null
  const esAdmin = (session?.user as any)?.rol === 'ADMIN' || (session?.user as any)?.rol === 'admin'

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const cargarTraspasos = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroEstado) params.append('estadoTraspaso', filtroEstado)
      if (fechaDesde) params.append('fechaDesde', fechaDesde)
      if (fechaHasta) params.append('fechaHasta', fechaHasta)

      const response = await fetch(`/api/traspasos?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setTraspasos(data.traspasos)
      }
    } catch (error) {
      console.error('Error al cargar traspasos:', error)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, fechaDesde, fechaHasta])

  // No cargar automáticamente, esperar a que el usuario presione "Buscar"

  const obtenerColorEstado = (estado: string | null): string => {
    if (!estado) return '#6b7280'
    const colores: Record<string, string> = {
      'PENDIENTE': '#F59E0B',
      'EN_TRANSITO': '#3B82F6',
      'RECIBIDO': '#10B981',
      'RECHAZADO': '#EF4444',
      'CANCELADO': '#1F2937'
    }
    return colores[estado] || '#6b7280'
  }

  const obtenerIconoEstado = (estado: string | null): string => {
    if (!estado) return '⚪'
    const iconos: Record<string, string> = {
      'PENDIENTE': '🟡',
      'EN_TRANSITO': '🔵',
      'RECIBIDO': '🟢',
      'RECHAZADO': '🔴',
      'CANCELADO': '⚫'
    }
    return iconos[estado] || '⚪'
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const confirmarRecepcion = async () => {
    if (!modalRecibir) return

    try {
      setProcesando(true)
      console.log('🔄 Confirmando recepción de:', modalRecibir)

      const response = await fetch(`/api/traspasos/${modalRecibir}/recibir`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidadRecibida: cantidadRecibida ? parseInt(cantidadRecibida) : null,
          observaciones
        })
      })

      console.log('📡 Response status:', response.status)
      const data = await response.json()
      console.log('📦 Response data:', data)

      if (data.success) {
        alert('✅ Traspaso recibido correctamente')
        setModalRecibir(null)
        setCantidadRecibida('')
        setObservaciones('')
        cargarTraspasos()
      } else {
        alert(`❌ ${data.error || 'Error desconocido'}`)
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('❌ Error:', error)
      alert('❌ Error al confirmar recepción: ' + (error instanceof Error ? error.message : 'desconocido'))
    } finally {
      setProcesando(false)
    }
  }

  const cancelarTraspaso = async (accion: 'CANCELAR' | 'RECHAZAR') => {
    if (!modalCancelar || !motivoCancelacion) {
      alert('❌ Ingrese el motivo')
      return
    }

    try {
      setProcesando(true)

      const response = await fetch(`/api/traspasos/${modalCancelar}/cancelar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: motivoCancelacion,
          accion
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Traspaso ${accion.toLowerCase()} correctamente`)
        setModalCancelar(null)
        setMotivoCancelacion('')
        cargarTraspasos()
      } else {
        // Mensajes más claros según el tipo de error
        let mensajeError = data.error || 'Error desconocido'
        
        if (data.razon === 'RECIBIDO') {
          mensajeError = '❌ No se puede modificar: El traspaso ya fue recibido. Si hay problemas, comunícate con administración.'
        } else if (response.status === 403) {
          mensajeError = `❌ Permiso denegado: ${data.error}`
        }
        
        alert(mensajeError)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al procesar')
    } finally {
      setProcesando(false)
    }
  }

  const agruparTrasposPorLote = (): Record<string, LoteTraspaso> => {
    const lotes: Record<string, LoteTraspaso> = {}

    traspasos.forEach((traspaso) => {
      // Determinar sede origen y destino correctamente
      // Si es TRASPASO_SALIDA: sedeOrigen está en este registro, sedeDestino en relacionado
      // Si es TRASPASO_ENTRADA: sedeDestino está en este registro, sedeOrigen en relacionado
      let sedeOrigenData = traspaso.sedeOrigen
      let sedeDestinoData = traspaso.sedeDestino

      // Si faltan datos, obtenerlos del relacionado
      if (!sedeOrigenData && traspaso.traspasoRelacionado?.sedeOrigen) {
        sedeOrigenData = traspaso.traspasoRelacionado.sedeOrigen
      }
      if (!sedeDestinoData && traspaso.traspasoRelacionado?.sedeDestino) {
        sedeDestinoData = traspaso.traspasoRelacionado.sedeDestino
      }

      // Si aún falta origen, usar sedeId como fallback
      if (!sedeOrigenData && traspaso.sedeId && traspaso.sede) {
        sedeOrigenData = traspaso.sede
      }

      // Si aún falta destino, intentar obtenerlo del relacionado usando sedeId
      if (!sedeDestinoData && traspaso.traspasoRelacionado?.sedeId && traspaso.traspasoRelacionado?.sede) {
        sedeDestinoData = traspaso.traspasoRelacionado.sede
      }

      // Validar que el traspaso tenga los datos mínimos requeridos
      if (!sedeOrigenData || !sedeDestinoData || !traspaso.usuario) {
        console.warn('Traspaso sin datos completos:', traspaso)
        return
      }

      const loteId = traspaso.referencia || `LOTE-${traspaso.id}`

      if (!lotes[loteId]) {
        // Extraer productos únicos del lote
        const productosEnLote = traspasos
          .filter((t) => (t.referencia || `LOTE-${t.id}`) === loteId && t.tipo === 'TRASPASO_SALIDA')
          .map((t) => ({
            codigo: t.producto.codigo,
            nombre: t.producto.nombre,
            cantidad: t.cantidad
          }))

        lotes[loteId] = {
          loteId,
          fecha: traspaso.fecha,
          estado: (traspaso.estadoTraspaso && traspaso.estadoTraspaso.trim() !== '') ? traspaso.estadoTraspaso : 'PENDIENTE',
          sedeOrigen: {
            id: sedeOrigenData.id,
            nombre: sedeOrigenData.nombre
          },
          sedeDestino: {
            id: sedeDestinoData.id,
            nombre: sedeDestinoData.nombre
          },
          usuario: {
            id: traspaso.usuario.id,
            nombre: traspaso.usuario.nombre || 'Sistema'
          },
          productos: productosEnLote,
          traspasos: []
        }
      }

      lotes[loteId].traspasos.push(traspaso)
    })

    return lotes
  }

  const toggleLoteExpandido = (loteId: string) => {
    const nuevosExpandidos = new Set(lotesExpandidos)
    if (nuevosExpandidos.has(loteId)) {
      nuevosExpandidos.delete(loteId)
    } else {
      nuevosExpandidos.add(loteId)
    }
    setLotesExpandidos(nuevosExpandidos)
  }

  // Determina qué acciones puede realizar el usuario
  const obtenerAccionesPermitidas = (lote: LoteTraspaso) => {
    // Admin puede hacer todo
    if (esAdmin) {
      return {
        puedeConfirmar: true,
        puedeAnular: true,
        puedeRechazar: true,
        razonBloqueo: null
      }
    }

    // Usuario normal: solo según su sede
    const esSedeOrigen = usuarioSedeId === lote.sedeOrigen.id
    const esSedeDestino = usuarioSedeId === lote.sedeDestino.id

    // Sede origen: solo puede anular (rechazar es para destino)
    if (esSedeOrigen) {
      return {
        puedeConfirmar: false,
        puedeAnular: true,
        puedeRechazar: false,
        razonBloqueo: 'Solo la sede de destino puede confirmar la recepción'
      }
    }

    // Sede destino: solo puede confirmar
    if (esSedeDestino) {
      return {
        puedeConfirmar: true,
        puedeAnular: false,
        puedeRechazar: true,
        razonBloqueo: null
      }
    }

    // Usuario de otra sede
    return {
      puedeConfirmar: false,
      puedeAnular: false,
      puedeRechazar: false,
      razonBloqueo: 'No tienes permisos en este traspaso (no eres sede origen ni destino)'
    }
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: isMobile ? '0.5rem' : '1rem' 
    }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          🔄 Traspasos entre Sedes
        </h1>

        <button
          onClick={() => router.push('/dashboard/traspasos/nuevo')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          + Nuevo Traspaso
        </button>
      </div>

      {/* FILTROS */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontWeight: '500' }}>Estado:</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">🟡 Pendiente</option>
            <option value="EN_TRANSITO">🔵 En Tránsito</option>
            <option value="RECIBIDO">🟢 Recibido</option>
            <option value="RECHAZADO">🔴 Rechazado</option>
            <option value="CANCELADO">⚫ Cancelado</option>
          </select>

          <label style={{ fontWeight: '500', marginLeft: '1rem' }}>Desde:</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />

          <label style={{ fontWeight: '500' }}>Hasta:</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />

          <button
            onClick={cargarTraspasos}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            🔍 Buscar
          </button>

          <button
            onClick={() => {
              const hoy = obtenerFechaHoyPeru()
              setFiltroEstado('')
              setFechaDesde(hoy)
              setFechaHasta(hoy)
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* LISTA DE TRASPASOS AGRUPADOS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          ⏳ Cargando traspasos...
        </div>
      ) : traspasos.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No hay traspasos
          </div>
          <div style={{ color: '#6b7280' }}>
            Crea tu primer traspaso entre sedes
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {Object.entries(agruparTrasposPorLote()).map(([loteId, lote]) => {
            const estaExpandido = lotesExpandidos.has(loteId)
            const primerTraspaso = lote.traspasos[0]

            return (
              <div
                key={loteId}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `2px solid ${obtenerColorEstado(lote.estado)}20`,
                  overflow: 'hidden'
                }}
              >
                {/* HEADER DEL LOTE - Compacto */}
                <div
                  onClick={() => toggleLoteExpandido(loteId)}
                  style={{
                    padding: isMobile ? '1rem' : '1.25rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto auto auto auto',
                    gap: '1rem',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = 'white'
                  }}
                >
                  {/* Expandir/Contraer */}
                  <div style={{ fontSize: '1.25rem' }}>
                    {estaExpandido ? '▼' : '▶️'}
                  </div>

                  {/* Información principal */}
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      {loteId}
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                      📍 {lote.sedeOrigen.nombre} → {lote.sedeDestino.nombre}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {formatearFecha(lote.fecha)}
                    </div>
                  </div>

                  {/* Badge de productos */}
                  <div style={{
                    display: isMobile ? 'none' : 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    📦 {lote.productos.length} {lote.productos.length === 1 ? 'producto' : 'productos'}
                  </div>

                  {/* Badge de estado */}
                  <span style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: obtenerColorEstado(lote.estado) + '20',
                    color: obtenerColorEstado(lote.estado),
                    whiteSpace: 'nowrap'
                  }}>
                    {obtenerIconoEstado(lote.estado)} {lote.estado ? lote.estado.replace(/_/g, ' ') : 'SIN ESTADO'}
                  </span>
                </div>

                {/* DETALLES EXPANDIBLES */}
                {estaExpandido && (
                  <div style={{
                    padding: isMobile ? '1rem' : '1.25rem',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#fafbfc'
                  }}>
                    {/* Usuario que creó */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: '1rem',
                      marginBottom: '1.5rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          ORIGEN
                        </div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          📍 {lote.sedeOrigen.nombre}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          👤 {lote.usuario.nombre}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          DESTINO
                        </div>
                        <div style={{ fontWeight: '600' }}>
                          📍 {lote.sedeDestino.nombre}
                        </div>
                      </div>
                    </div>

                    {/* Tabla de productos */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                        📦 Productos ({lote.productos.length})
                      </div>
                      <div style={{
                        display: 'grid',
                        gap: '0.5rem'
                      }}>
                        {lote.productos.map((prod, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr auto' : '2fr 1fr',
                              gap: '1rem',
                              padding: '0.75rem',
                              backgroundColor: 'white',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                {prod.codigo} - {prod.nombre}
                              </div>
                            </div>
                            <div style={{
                              fontWeight: '700',
                              fontSize: '1.1rem',
                              color: '#8b5cf6',
                              textAlign: 'right'
                            }}>
                              {prod.cantidad} un.
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Acciones */}
                    {(!lote.estado || lote.estado === 'PENDIENTE' || lote.estado === null) && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        paddingTop: '1rem',
                        borderTop: '1px solid #e5e7eb',
                        flexDirection: 'column'
                      }}>
                        {(() => {
                          const acciones = obtenerAccionesPermitidas(lote)

                          return (
                            <>
                              {/* Aviso si no tiene permisos */}
                              {!acciones.puedeConfirmar && !acciones.puedeAnular && !acciones.puedeRechazar && (
                                <div style={{
                                  padding: '0.75rem',
                                  backgroundColor: '#fee2e2',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  color: '#991b1b',
                                  marginBottom: '1rem'
                                }}>
                                  🔒 {acciones.razonBloqueo}
                                </div>
                              )}

                              {/* Información de permisos por sede */}
                              <div style={{
                                padding: '0.75rem',
                                backgroundColor: '#eff6ff',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: '#1e40af',
                                marginBottom: '1rem'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>ℹ️ Permisos por sede:</div>
                                <div>📍 <strong>Sede Origen</strong> ({lote.sedeOrigen.nombre}): Puede anular el traspaso</div>
                                <div>📍 <strong>Sede Destino</strong> ({lote.sedeDestino.nombre}): Puede confirmar recepción o rechazar</div>
                                {esAdmin && <div>👑 <strong>Admin</strong>: Acceso completo a todas las acciones</div>}
                              </div>

                              {/* Botones según permisos */}
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {acciones.puedeConfirmar && (
                                  <button
                                    onClick={() => {
                                      const traspasoId = lote.traspasos.find((t) => t.tipo === 'TRASPASO_ENTRADA')?.id
                                      if (traspasoId) {
                                        setModalRecibir(traspasoId)
                                        setCantidadRecibida(
                                          lote.productos.reduce((sum, p) => sum + p.cantidad, 0).toString()
                                        )
                                      } else {
                                        alert('❌ No se encontró el traspaso de entrada')
                                      }
                                    }}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      backgroundColor: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.875rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    ✅ Confirmar Recepción
                                  </button>
                                )}

                                {acciones.puedeRechazar && (
                                  <button
                                    onClick={() => {
                                      const traspasoId = lote.traspasos[0]?.id
                                      if (traspasoId) setModalCancelar(traspasoId)
                                    }}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      backgroundColor: '#f59e0b',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.875rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    ⚠️ Rechazar (Error en envío)
                                  </button>
                                )}

                                {acciones.puedeAnular && (
                                  <button
                                    onClick={() => {
                                      const traspasoId = lote.traspasos[0]?.id
                                      if (traspasoId) setModalCancelar(traspasoId)
                                    }}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      backgroundColor: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.875rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    ❌ Anular Traspaso
                                  </button>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {lote.estado === 'RECIBIDO' && primerTraspaso?.traspasoRelacionado?.fechaRecepcion && (
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#d1fae5',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#065f46'
                      }}>
                        ✅ Recibido el {formatearFecha(primerTraspaso.traspasoRelacionado.fechaRecepcion)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL RECIBIR */}
      {modalRecibir && (
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
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3 style={{ marginTop: 0 }}>✅ Confirmar Recepción</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Cantidad Recibida
              </label>
              <input
                type="number"
                value={cantidadRecibida}
                onChange={(e) => setCantidadRecibida(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Todo OK, productos en buen estado..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setModalRecibir(null)
                  setCantidadRecibida('')
                  setObservaciones('')
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRecepcion}
                disabled={procesando}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: procesando ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: procesando ? 'not-allowed' : 'pointer'
                }}
              >
                {procesando ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANCELAR/RECHAZAR */}
      {modalCancelar && (
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
            maxWidth: '500px',
            width: '100%'
          }}>
            {(() => {
              const lotes = agruparTrasposPorLote()
              const lotePertinente = Object.values(lotes).find(l => 
                l.traspasos.some(t => t.id === modalCancelar)
              )
              const acciones = lotePertinente ? obtenerAccionesPermitidas(lotePertinente) : null
              
              const esRechazo = acciones?.puedeRechazar && !acciones?.puedeAnular
              const esAnulacion = acciones?.puedeAnular && !acciones?.puedeRechazar

              return (
                <>
                  <h3 style={{ marginTop: 0 }}>
                    {esRechazo ? '⚠️ Rechazar Traspaso' : '❌ Anular Traspaso'}
                  </h3>
                  
                  {esRechazo && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#fef3c7',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#92400e',
                      marginBottom: '1rem'
                    }}>
                      <strong>⚠️ Rechazo:</strong> Indica que hubo un error en el envío. Los productos volverán a la sede origen y se abrirá una re-solicitud.
                    </div>
                  )}

                  {esAnulacion && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#fee2e2',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#991b1b',
                      marginBottom: '1rem'
                    }}>
                      <strong>❌ Anulación:</strong> Cancela el traspaso completamente. Los productos no serán enviados.
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Motivo/Descripción *
                    </label>
                    <textarea
                      value={motivoCancelacion}
                      onChange={(e) => setMotivoCancelacion(e.target.value)}
                      rows={3}
                      placeholder={esRechazo ? 'Ej: Productos dañados, falta cantidad, error en factura...' : 'Ej: Solicitud cancelada, stock insuficiente...'}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setModalCancelar(null)
                        setMotivoCancelacion('')
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Volver
                    </button>
                    {esRechazo && (
                      <button
                        onClick={() => cancelarTraspaso('RECHAZAR')}
                        disabled={procesando}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: procesando ? '#9ca3af' : '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: procesando ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {procesando ? 'Procesando...' : 'Rechazar'}
                      </button>
                    )}
                    {esAnulacion && (
                      <button
                        onClick={() => cancelarTraspaso('CANCELAR')}
                        disabled={procesando}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: procesando ? '#9ca3af' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: procesando ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {procesando ? 'Procesando...' : 'Anular'}
                      </button>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}