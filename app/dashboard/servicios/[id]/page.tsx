"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import ModalMarcarReparado from "../components/ModalMarcarReparado"
import ModalEditarReparacion from "./components/ModalEditarReparacion"
import ModalMarcarEntregado from "./components/ModalMarcarEntregado"
import ModalAnularServicio from "./components/ModalAnularServicio"
import ModalRegistrarPago from "./components/ModalRegistrarPago"
import { generarComprobantePDF } from "./components/ComprobanteEntrega"

interface Servicio {
  id: string
  numeroServicio: string
  clienteNombre: string
  clienteDni: string
  clienteCelular: string
  tipoEquipo: string
  tipoServicioTipo: string // ✅ "TALLER" o "DOMICILIO"
  direccionServicio: string | null // ✅ Para servicios a domicilio
  marcaModelo: string
  descripcionEquipo: string
  dejoSinCargador: boolean
  dejoAccesorios: boolean
  esCotizacion: boolean
  problemasReportados: string[]
  otrosProblemas: string
  descripcionProblema: string
  faltaPernos: boolean
  tieneAranaduras: boolean
  otrosDetalles: string
  costoServicio: number
  costoRepuestos: number
  total: number
  aCuenta: number
  saldo: number
  serviciosAdicionales: any[]
  metodoPago: string
  fechaRecepcion: string
  fechaEntregaEstimada: string
  fechaReparacion: string | null
  fechaEntregaReal: string
  fechaUltimoPago: string | null
  estado: string
  prioridad: string
  garantiaDias: number
  fotosEquipo: string[]
  fotosDespues: string[]
  diagnostico: string | null
  solucion: string | null
  quienRecibeNombre: string | null
  quienRecibeDni: string | null
  metodoPagoSaldo: string | null
  productosVendidos: any[]
  createdAt: string
  updatedAt: string
  cliente: any
  usuario: any
  sede: any
  tipoServicio: any
  sedeId: string
  items: Array<{
    id: string
    cantidad: number
    precioUnit: number
    subtotal: number
    producto: {
      id: string
      codigo: string
      nombre: string
      descripcion: string | null
    }
  }>
  motivoCancelacion: string | null
  observacionCancelacion: string | null
  fechaCancelacion: string | null
  adelantoDevuelto: number | null
  metodoDevolucion: string | null
  usuarioCancelacionId: string | null

}

export default function DetalleServicioPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const servicioId = params.id as string

const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 768)
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])

  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [loading, setLoading] = useState(true)
  const [problemasNombres, setProblemasNombres] = useState<{[key: string]: string}>({})
  const [activeTab, setActiveTab] = useState('recepcion')
  
  // Modales
  const [isModalReparadoOpen, setIsModalReparadoOpen] = useState(false)
  const [isModalEditarReparacionOpen, setIsModalEditarReparacionOpen] = useState(false)
  const [isModalEntregadoOpen, setIsModalEntregadoOpen] = useState(false)
  const [isModalAnularOpen, setIsModalAnularOpen] = useState(false)
  const [isModalRegistrarPagoOpen, setIsModalRegistrarPagoOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const cargarServicio = useCallback(async () => {
    try {
      console.log('🔄 [DETALLE] Cargando servicio:', servicioId)
      setLoading(true)

      console.log('🌐 [DETALLE] Haciendo fetch a:', `/api/servicios/${servicioId}`)
      const response = await fetch(`/api/servicios/${servicioId}`)

      console.log('📡 [DETALLE] Response status:', response.status)
      const data = await response.json()
      console.log('📦 [DETALLE] Data recibida:', {
        success: data.success,
        hasServicio: !!data.servicio,
        error: data.error
      })

      if (data.success) {
        console.log('✅ [DETALLE] Servicio cargado correctamente')
        setServicio(data.servicio)

        if (data.servicio.problemasReportados && data.servicio.problemasReportados.length > 0) {
          console.log('🔍 [DETALLE] Cargando problemas comunes...')
          const responseProblemas = await fetch('/api/problemas-comunes')
          const dataProblemas = await responseProblemas.json()

          if (dataProblemas.success) {
            const nombresMap: {[key: string]: string} = {}
            data.servicio.problemasReportados.forEach((id: string) => {
              const problema = dataProblemas.problemas.find((p: any) => p.id === id)
              if (problema) {
                nombresMap[id] = problema.nombre
              }
            })
            setProblemasNombres(nombresMap)
            console.log('✅ [DETALLE] Problemas comunes cargados')
          }
        }
      } else {
        console.error('❌ [DETALLE] Error en data:', data.error)
        alert('❌ ' + data.error)
        router.push('/dashboard/servicios')
      }
    } catch (error) {
      console.error('❌ [DETALLE] Error al cargar servicio:', error)
      console.error('❌ [DETALLE] Stack trace:', error instanceof Error ? error.stack : 'No stack')
      alert('❌ Error al cargar servicio. Revisa la consola para más detalles.')
      router.push('/dashboard/servicios')
    } finally {
      console.log('🏁 [DETALLE] setLoading(false)')
      setLoading(false)
    }
  }, [servicioId, router])

  useEffect(() => {
    if (servicioId) {
      cargarServicio()
    }
  }, [servicioId, cargarServicio])

  const handleModalClose = () => {
    setIsModalReparadoOpen(false)
    cargarServicio()
  }

  const handleEditarReparacionClose = () => {
    setIsModalEditarReparacionOpen(false)
    cargarServicio()
  }

  const handleModalEntregadoClose = () => {
    setIsModalEntregadoOpen(false)
    cargarServicio()
  }

  const handleModalAnularClose = () => {
    setIsModalAnularOpen(false)
    cargarServicio()
  }

  const handleModalRegistrarPagoClose = () => {
    setIsModalRegistrarPagoOpen(false)
    cargarServicio()
  }

  const cambiarEstadoServicio = async (nuevoEstado: string) => {
    const confirmar = confirm(`¿Estás seguro de cambiar el estado a "${nuevoEstado.replace(/_/g, ' ')}"?`)
    if (!confirmar) return

    try {
      setLoading(true)
      const response = await fetch(`/api/servicios/${servicioId}/cambiar-estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoEstado }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Estado cambiado a ${nuevoEstado}`)
        cargarServicio()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      alert("❌ Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const descargarPDF = async () => {
    try {
      const response = await fetch(`/api/servicios/${servicioId}/pdf`)
      if (!response.ok) throw new Error('Error al generar PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Guia-${servicio?.numeroServicio}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar PDF:', error)
      alert('❌ Error al generar PDF')
    }
  }

  const obtenerColorEstado = (estado: string) => {
    const colores: any = {
      'RECEPCIONADO': '#3b82f6',
      'EN_DIAGNOSTICO': '#f59e0b',
      'EN_REPARACION': '#8b5cf6',
      'EN_DOMICILIO': '#10b981',
      'ESPERANDO_REPUESTOS': '#ef4444',
      'REPARADO': '#10b981',
      'ENTREGADO': '#6b7280',
      'CANCELADO': '#dc2626'
    }
    return colores[estado] || '#6b7280'
  }

  const obtenerColorPrioridad = (prioridad: string) => {
    const colores: any = {
      'BAJA': '#6b7280',
      'NORMAL': '#3b82f6',
      'ALTA': '#f59e0b',
      'URGENTE': '#ef4444'
    }
    return colores[prioridad] || '#3b82f6'
  }

  const formatearFecha = (fecha: string) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatearFechaConHora = (fecha: string) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        ⏳ Cargando servicio...
      </div>
    )
  }

  if (!servicio) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.25rem',
        color: '#ef4444'
      }}>
        ❌ Servicio no encontrado
      </div>
    )
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
  alignItems: 'flex-start',
  marginBottom: '1.5rem',
  flexDirection: isMobile ? 'column' : 'row',
  gap: '1rem',
  width: '100%'
}}>
        <div>
          <button
            onClick={() => router.push('/dashboard/servicios')}
            style={{
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                width: isMobile ? '100%' : 'auto'
            }}
          >
            ← Volver a Servicios
          </button>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', margin: 0 }}>
            📋 {servicio.numeroServicio}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            backgroundColor: obtenerColorEstado(servicio.estado) + '20',
            color: obtenerColorEstado(servicio.estado)
          }}>
            {servicio.estado.replace(/_/g, ' ')}
          </div>

          <div style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            backgroundColor: obtenerColorPrioridad(servicio.prioridad) + '20',
            color: obtenerColorPrioridad(servicio.prioridad)
          }}>
            {servicio.prioridad}
          </div>

          {/* Badge: Pendiente de Pago (si está ENTREGADO y tiene saldo) */}
          {servicio.estado === 'ENTREGADO' && Number(servicio.saldo) > 0 && (
            <div style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '600',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              border: '2px solid #f59e0b'
            }}>
              💳 Pendiente de Pago
            </div>
          )}

          <button
            onClick={descargarPDF}
            style={{
              padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '0.95rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto'
            }}
          >
            📄 PDF
          </button>

          {/* BOTÓN: Descargar Comprobante de Entrega (Solo si está ENTREGADO) */}
          {servicio.estado === 'ENTREGADO' && (
            <button
              onClick={() => generarComprobantePDF(servicio)}
              style={{
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              📄 Comprobante PDF
            </button>
          )}

          {/* BOTÓN: Registrar Pago (Solo si está ENTREGADO y tiene saldo pendiente) */}
          {servicio.estado === 'ENTREGADO' && Number(servicio.saldo) > 0 && (
            <button
              onClick={() => setIsModalRegistrarPagoOpen(true)}
              style={{
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              💰 Registrar Pago
            </button>
          )}

          {/* BOTONES DE CAMBIO DE ESTADO */}

{/* BOTÓN: Anular Servicio (Solo Admin, NO si está ENTREGADO) */}
        {session?.user?.rol === 'admin' && servicio.estado !== 'ENTREGADO' && servicio.estado !== 'CANCELADO' && (
          <button
            onClick={() => setIsModalAnularOpen(true)}
            style={{
              padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: isMobile ? '0.875rem' : '0.95rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            🚫 Anular
          </button>
        )}

         {/* BOTONES PARA SERVICIOS DE TALLER */}
          {servicio.tipoServicioTipo === 'TALLER' && servicio.estado === 'RECEPCIONADO' && (
            <button
              onClick={() => cambiarEstadoServicio('EN_REPARACION')}
              disabled={loading}
              style={{
                  padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '0.95rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto'
              }}
            >
              Iniciar Reparación
            </button>
          )}

          {servicio.tipoServicioTipo === 'TALLER' && servicio.estado === 'EN_REPARACION' && (
            <button
              onClick={() => setIsModalReparadoOpen(true)}
              style={{
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              ✅ Marcar Reparado
            </button>
          )}

          {/* BOTONES PARA SERVICIOS A DOMICILIO */}
          {servicio.tipoServicioTipo === 'DOMICILIO' && servicio.estado === 'EN_DOMICILIO' && (
            <button
              onClick={() => setIsModalReparadoOpen(true)}
              style={{
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              ✅ Marcar Reparado
            </button>
          )}

          {servicio.estado === 'REPARADO' && (
            <>
              <button
                onClick={() => setIsModalEditarReparacionOpen(true)}
                style={{
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.875rem' : '0.95rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      width: isMobile ? '100%' : 'auto'
                }}
              >
                ✏️ Editar Reparación
              </button>
              <button
                onClick={() => setIsModalEntregadoOpen(true)}
                style={{
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.875rem' : '0.95rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      width: isMobile ? '100%' : 'auto'
                }}
              >
                📦 Marcar Entregado
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABS */}
<div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        position: 'relative',
        // Mostrar scrollbar en móvil
        paddingBottom: '0.5rem'
      }}>
{[
          { id: 'recepcion', label: isMobile ? '📝' : '📝 Recepción' },
          { id: 'reparacion', label: isMobile ? '🔧' : '🔧 Reparación' },
          { id: 'entrega', label: isMobile ? '📦' : '📦 Entrega' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: isMobile ? '1rem' : '1rem 1.5rem',
              fontSize: isMobile ? '1.5rem' : '1rem',
              fontWeight: '600',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flex: isMobile ? '1' : 'initial',  // En móvil ocupan el mismo espacio
              minWidth: isMobile ? '0' : 'auto'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'recepcion' && (
        <div>
          {/* Botón Editar para este tab */}
{/* Botón Editar para este tab - CON PERMISOS */}
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
  {/* Badge de servicio cerrado */}
  {(servicio.estado === 'ENTREGADO' || servicio.estado === 'CANCELADO') && (
    <div style={{
      padding: '0.75rem 1.5rem',
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      border: '2px solid #dc2626'
    }}>
      🔒 {servicio.estado === 'CANCELADO' ? 'Servicio Anulado' : 'Servicio Cerrado'}
    </div>
  )}

  {/* Botón Editar - Solo si NO está ENTREGADO ni CANCELADO */}
  {servicio.estado !== 'ENTREGADO' && servicio.estado !== 'CANCELADO' && (
    <>
      {/* Si está RECEPCIONADO: todos pueden editar */}
      {servicio.estado === 'RECEPCIONADO' && (
        <button
          onClick={() => router.push(`/dashboard/servicios/${servicioId}/editar`)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          ✏️ Editar Recepción
        </button>
      )}

      {/* Si está EN_REPARACION: solo admin puede editar */}
      {servicio.estado === 'EN_REPARACION' && session?.user?.rol === 'admin' && (
        <button
          onClick={() => router.push(`/dashboard/servicios/${servicioId}/editar`)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          ✏️ Editar Recepción (Admin)
        </button>
      )}
    </>
  )}
</div>
          {/* INFORMACIÓN DEL CLIENTE */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              👤 INFORMACIÓN DEL CLIENTE
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Nombre</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.clienteNombre}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>DNI</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.clienteDni}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Celular</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.clienteCelular}</div>
              </div>
            </div>
          </div>

          {/* INFORMACIÓN DEL EQUIPO */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              💻 INFORMACIÓN DEL EQUIPO
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Tipo</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.tipoEquipo}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Marca/Modelo</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.marcaModelo || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Descripción</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.descripcionEquipo || 'N/A'}</div>
              </div>
            </div>

            {/* ✅ DIRECCIÓN (solo para servicios a domicilio) */}
            {servicio.tipoServicioTipo === 'DOMICILIO' && servicio.direccionServicio && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
                border: '2px solid #10b981'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.5rem', fontWeight: '600' }}>
                  📍 Dirección del servicio a domicilio:
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#047857'
                }}>
                  {servicio.direccionServicio}
                </div>
              </div>
            )}

            {/* ✅ BADGES DE RECEPCIÓN (solo para servicios de TALLER) */}
            {servicio.tipoServicioTipo === 'TALLER' && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                marginTop: '1rem'
              }}>
              {servicio.dejoSinCargador && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  ⚠️ Sin cargador
                </span>
              )}
              {servicio.dejoAccesorios && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  ✓ Con accesorios
                </span>
              )}
              {servicio.faltaPernos && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  🔩 Falta pernos
                </span>
              )}
              {servicio.tieneAranaduras && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  ⚠️ Tiene arañaduras
                </span>
              )}
              </div>
            )}

            {servicio.otrosDetalles && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Otros detalles:
                </div>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}>
                  {servicio.otrosDetalles}
                </div>
              </div>
            )}
          </div>

          {/* FOTOS INICIALES */}
          {servicio.fotosEquipo && servicio.fotosEquipo.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.5rem'
              }}>
                📸 FOTOS INICIALES ({servicio.fotosEquipo.length})
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {servicio.fotosEquipo.map((foto, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      paddingTop: '100%',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(foto, '_blank')}
                  >
                    <Image
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      fill
                      style={{
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.5rem',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      Foto #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROBLEMAS REPORTADOS */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              🔧 PROBLEMAS REPORTADOS
            </h2>
            {servicio.problemasReportados && servicio.problemasReportados.length > 0 && (
              <div style={{ marginBottom: servicio.otrosProblemas ? '1.5rem' : 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  Problemas identificados:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {servicio.problemasReportados.map((problemaId: string, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dbeafe',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1e40af',
                        border: '1px solid #93c5fd'
                      }}
                    >
                      ✓ {problemasNombres[problemaId] || `Problema #${index + 1}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {servicio.otrosProblemas && (
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  Descripción adicional:
                </div>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fbbf24'
                }}>
                  <p style={{
                    fontSize: '1rem',
                    color: '#78350f',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {servicio.otrosProblemas}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* COSTOS INICIALES */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              💰 COSTOS DEL SERVICIO
            </h2>
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '2px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                fontSize: '1rem'
              }}>
                <span style={{ fontWeight: '500' }}>Costo del Servicio:</span>
                <span style={{ fontWeight: '600' }}>S/ {Number(servicio.costoServicio || 0).toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                fontSize: '1rem'
              }}>
                <span style={{ fontWeight: '500' }}>A Cuenta Inicial:</span>
                <span style={{ fontWeight: '600', color: '#3b82f6' }}>S/ {Number(servicio.aCuenta || 0).toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem'
              }}>
                <span style={{ fontWeight: '500' }}>Método de Pago:</span>
                <span style={{ fontWeight: '600' }}>{servicio.metodoPago || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* INFORMACIÓN ADICIONAL */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '1rem' : '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              📋 INFORMACIÓN ADICIONAL
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Técnico Asignado</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.usuario?.nombre || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Sede</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.sede?.nombre || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Fecha de Recepción</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatearFechaConHora(servicio.fechaRecepcion)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Fecha Estimada</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatearFecha(servicio.fechaEntregaEstimada)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Garantía</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{servicio.garantiaDias} días</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reparacion' && (
        <div>
          {/* Botón Editar para este tab */}
 {/* Botón Editar para este tab - CON PERMISOS */}
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
  {/* Badge si está cerrado */}
  {(servicio.estado === 'ENTREGADO' || servicio.estado === 'CANCELADO') && (
    <div style={{
      padding: '0.75rem 1.5rem',
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      border: '2px solid #dc2626'
    }}>
      🔒 No Editable
    </div>
  )}

  {/* Solo editable si está REPARADO */}
  {servicio.estado === 'REPARADO' && (
    <button
      onClick={() => setIsModalEditarReparacionOpen(true)}
      style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600'
      }}
    >
      ✏️ Editar Reparación
    </button>
  )}
</div>

          {/* DIAGNÓSTICO Y SOLUCIÓN */}
          {(servicio.diagnostico || servicio.solucion) && (
            <div style={{
              backgroundColor: '#f0fdf4',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem',
              border: '1px solid #10b981'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #a7f3d0',
                paddingBottom: '0.5rem',
                color: '#065f46'
              }}>
                🩺 DIAGNÓSTICO Y SOLUCIÓN
              </h2>
              {servicio.fechaReparacion && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#d1fae5',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#065f46',
                  fontWeight: '600'
                }}>
                  📅 Fecha de Reparación: {new Date(servicio.fechaReparacion).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {servicio.diagnostico && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#047857', marginBottom: '0.5rem' }}>
                    Diagnóstico Técnico:
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{servicio.diagnostico}</p>
                </div>
              )}
              {servicio.solucion && (
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#047857', marginBottom: '0.5rem' }}>
                    Solución Aplicada:
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{servicio.solucion}</p>
                </div>
              )}
            </div>
          )}

         {/* REPUESTOS UTILIZADOS */}
          {servicio.items && servicio.items.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem',
              border: '2px solid #10b981'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.5rem',
                color: '#10b981'
              }}>
                🔩 REPUESTOS UTILIZADOS ({servicio.items.length})
              </h2>

              {isMobile ? (
                // VISTA MÓVIL - CARDS
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {servicio.items.map((item: any, index: number) => (
                    <div
                      key={item.id || index}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        {item.producto?.codigo || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: '#374151' }}>
                        {item.producto?.nombre || 'Producto'}
                      </div>
                      {item.producto?.descripcion && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                          {item.producto.descripcion}
                        </div>
                      )}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Cantidad:</span>
                          <div style={{ fontWeight: '700', fontSize: '1rem', marginTop: '0.25rem' }}>
                            {item.cantidad}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#6b7280' }}>P. Unit:</span>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                            S/ {Number(item.precioUnit || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Subtotal:</span>
                        <span style={{ fontWeight: '700', color: '#10b981', fontSize: '1.1rem' }}>
                          S/ {Number(item.subtotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* TOTAL */}
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    border: '2px solid #10b981',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>TOTAL REPUESTOS:</span>
                      <span style={{ fontWeight: '700', fontSize: '1.5rem', color: '#10b981' }}>
                        S/ {Number(servicio.costoRepuestos || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // VISTA DESKTOP - TABLA
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          Producto
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb',
                          width: '120px'
                        }}>
                          Cantidad
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb',
                          width: '150px'
                        }}>
                          Precio Unit.
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: '#374151',
                          borderBottom: '1px solid #e5e7eb',
                          width: '150px'
                        }}>
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicio.items.map((item: any, index: number) => (
                        <tr
                          key={item.id || index}
                          style={{
                            backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                            borderBottom: index < servicio.items.length - 1 ? '1px solid #e5e7eb' : 'none'
                          }}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                              {item.producto?.codigo || 'N/A'} - {item.producto?.nombre || 'Producto'}
                            </div>
                            {item.producto?.descripcion && (
                              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                {item.producto.descripcion}
                              </div>
                            )}
                          </td>
                          <td style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontWeight: '600',
                            fontSize: '1rem'
                          }}>
                            {item.cantidad}
                          </td>
                          <td style={{
                            padding: '1rem',
                            textAlign: 'right',
                            fontWeight: '500',
                            fontSize: '0.95rem'
                          }}>
                            S/ {Number(item.precioUnit || 0).toFixed(2)}
                          </td>
                          <td style={{
                            padding: '1rem',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '1rem',
                            color: '#10b981'
                          }}>
                            S/ {Number(item.subtotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #10b981' }}>
                        <td colSpan={3} style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontSize: '1.1rem'
                        }}>
                          TOTAL REPUESTOS:
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontSize: '1.1rem',
                          color: '#10b981'
                        }}>
                          S/ {Number(servicio.costoRepuestos || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* FOTOS DEL RESULTADO */}
          {servicio.fotosDespues && servicio.fotosDespues.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #10b981'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.5rem',
                color: '#065f46'
              }}>
                ✨ FOTOS DEL RESULTADO ({servicio.fotosDespues.length})
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {servicio.fotosDespues.map((foto, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      paddingTop: '100%',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(foto, '_blank')}
                  >
                    <Image
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      fill
                      style={{
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.5rem',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      Foto #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si no hay info de reparación */}
          {!servicio.diagnostico && !servicio.solucion && (!servicio.items || servicio.items.length === 0) && (!servicio.fotosDespues || servicio.fotosDespues.length === 0) && (
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Sin información de reparación
              </div>
              <div style={{ fontSize: '0.95rem' }}>
                Esta sección se llenará cuando el servicio sea marcado como reparado
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'entrega' && (
        <div>
          {/* INFORMACIÓN DE ENTREGA */}
          {servicio.estado === 'ENTREGADO' ? (
            <>
              <div style={{
                backgroundColor: 'white',
                padding: isMobile ? '1rem' : '2rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '1.5rem'
              }}>
                <h2 style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  borderBottom: '2px solid #e5e7eb',
                  paddingBottom: '0.5rem'
                }}>
                  📦 INFORMACIÓN DE ENTREGA
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Fecha de Entrega</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatearFechaConHora(servicio.fechaEntregaReal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Recogido por</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                      {servicio.quienRecibeNombre || servicio.clienteNombre}
                    </div>
                    {servicio.quienRecibeDni && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        DNI: {servicio.quienRecibeDni}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PRODUCTOS VENDIDOS EN LA ENTREGA */}
              {servicio.productosVendidos && servicio.productosVendidos.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: isMobile ? '1rem' : '2rem',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  marginBottom: '1.5rem',
                  border: '2px solid #3b82f6'
                }}>
                  <h2 style={{
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    fontWeight: '600',
                    marginBottom: '1.5rem',
                    borderBottom: '2px solid #e5e7eb',
                    paddingBottom: '0.5rem',
                    color: '#3b82f6'
                  }}>
                    🛒 PRODUCTOS VENDIDOS EN LA ENTREGA ({servicio.productosVendidos.length})
                  </h2>
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Producto</th>
                          <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '120px' }}>Cantidad</th>
                          <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '150px' }}>Precio Unit.</th>
                          <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #e5e7eb', width: '150px' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servicio.productosVendidos.map((item: any, index: number) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb', borderBottom: index < servicio.productosVendidos.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                {item.codigo || 'N/A'} - {item.nombre || `Producto #${index + 1}`}
                              </div>
                              {item.descripcion && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  {item.descripcion}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '1rem' }}>{item.cantidad}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500', fontSize: '0.95rem' }}>S/ {Number(item.precioUnit || 0).toFixed(2)}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '1rem', color: '#3b82f6' }}>S/ {Number(item.subtotal || (item.cantidad * item.precioUnit) || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ backgroundColor: '#eff6ff', borderTop: '2px solid #3b82f6' }}>
                          <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>TOTAL PRODUCTOS:</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem', color: '#3b82f6' }}>
                            S/ {servicio.productosVendidos.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || (item.cantidad * item.precioUnit) || 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* RESUMEN FINAL DE PAGOS */}
              <div style={{
                backgroundColor: 'white',
                padding: isMobile ? '1rem' : '2rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  borderBottom: '2px solid #e5e7eb',
                  paddingBottom: '0.5rem'
                }}>
                  💰 RESUMEN FINAL DE PAGOS
                </h2>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                    <span style={{ fontWeight: '500' }}>Costo del Servicio:</span>
                    <span style={{ fontWeight: '600' }}>S/ {Number(servicio.costoServicio || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                    <span style={{ fontWeight: '500' }}>Repuestos:</span>
                    <span style={{ fontWeight: '600' }}>S/ {Number(servicio.costoRepuestos || 0).toFixed(2)}</span>
                  </div>
                  {servicio.productosVendidos && servicio.productosVendidos.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                      <span style={{ fontWeight: '500', color: '#3b82f6' }}>Productos Adicionales:</span>
                      <span style={{ fontWeight: '600', color: '#3b82f6' }}>
                        S/ {servicio.productosVendidos.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || (item.cantidad * item.precioUnit) || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div style={{ borderTop: '2px solid #d1d5db', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1.25rem' }}>
                      <span style={{ fontWeight: '700' }}>TOTAL:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>S/ {Number(servicio.total || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1rem' }}>
                      <span style={{ fontWeight: '600' }}>Pagado:</span>
                      <span style={{ fontWeight: '600', color: '#3b82f6' }}>S/ {Number(servicio.aCuenta || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #d1d5db' }}>
                      <span style={{ fontWeight: '700' }}>SALDO:</span>
                      <span style={{ fontWeight: '700', color: Number(servicio.saldo) > 0 ? '#ef4444' : '#10b981' }}>
                        S/ {Number(servicio.saldo || 0).toFixed(2)}
                      </span>
                    </div>
                    {servicio.metodoPagoSaldo && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>Método de pago del saldo:</span>
                        <span style={{ fontWeight: '600' }}>{servicio.metodoPagoSaldo}</span>
                      </div>
                    )}
                    {servicio.fechaUltimoPago && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>Último pago registrado:</span>
                        <span style={{ fontWeight: '600' }}>
                          {new Date(servicio.fechaUltimoPago).toLocaleDateString('es-PE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Servicio no entregado
              </div>
              <div style={{ fontSize: '0.95rem' }}>
                Esta sección se llenará cuando el servicio sea marcado como entregado
              </div>
            </div>
          )}
        </div>
      )}

{/* SECCIÓN ESPECIAL: SERVICIO CANCELADO */}
{servicio.estado === 'CANCELADO' && (
  <div style={{
    backgroundColor: '#fee2e2',
    padding: isMobile ? '1rem' : '2rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginTop: '2rem',
    border: '2px solid #dc2626'
  }}>
    <h2 style={{
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '600',
      marginBottom: '1.5rem',
      color: '#dc2626'
    }}>
      🚫 SERVICIO ANULADO
    </h2>

    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      <div>
        <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>Motivo</div>
        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
          {servicio.motivoCancelacion || 'N/A'}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>Fecha de Cancelación</div>
        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
         {servicio.fechaCancelacion ? formatearFecha(servicio.fechaCancelacion) : 'N/A'}
        </div>
      </div>
      {servicio.adelantoDevuelto && Number(servicio.adelantoDevuelto) > 0 && (
        <>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>Adelanto Devuelto</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
              S/ {Number(servicio.adelantoDevuelto).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>Método de Devolución</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626' }}>
              {servicio.metodoDevolucion || 'N/A'}
            </div>
          </div>
        </>
      )}
    </div>

    {servicio.observacionCancelacion && (
      <div>
        <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.5rem', fontWeight: '600' }}>
          Observaciones:
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          fontSize: '0.95rem',
          color: '#374151',
          border: '1px solid #fca5a5'
        }}>
          {servicio.observacionCancelacion}
        </div>
      </div>
    )}

    <div style={{
      marginTop: '1.5rem',
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #fca5a5'
    }}>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic' }}>
        ℹ️ Los servicios anulados no se pueden reactivar. Si es necesario, crear un nuevo servicio.
      </div>
    </div>
  </div>
)}
      {/* MODALES */}
      {servicio && (
        <>
          <ModalMarcarReparado
            isOpen={isModalReparadoOpen}
            onClose={handleModalClose}
            servicio={servicio}
          />
          <ModalEditarReparacion
            isOpen={isModalEditarReparacionOpen}
            onClose={handleEditarReparacionClose}
            servicio={servicio}
          />
          <ModalMarcarEntregado
            isOpen={isModalEntregadoOpen}
            onClose={handleModalEntregadoClose}
            servicio={servicio}
          />
          {/* ✅ NUEVO: Modal Anular */}
          <ModalAnularServicio
            isOpen={isModalAnularOpen}
            onClose={handleModalAnularClose}
            servicio={servicio}
          />
          {/* ✅ NUEVO: Modal Registrar Pago */}
          <ModalRegistrarPago
            isOpen={isModalRegistrarPagoOpen}
            onClose={handleModalRegistrarPagoClose}
            servicio={servicio}
          />
        </>
      )}
    </div>
  )
}