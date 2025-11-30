"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import BuscadorCliente from "../components/BuscadorCliente"
import ModalAgregarProblema from "../components/ModalAgregarProblema"
import ModalAgregarServicio from "../components/ModalAgregarServicio"
import Modal from "../components/Modal"

interface Sede {
  id: string
  nombre: string
}

interface Usuario {
  id: string
  nombre: string
}

interface ProblemaComun {
  id: string
  nombre: string
  descripcion: string | null
}

interface ServicioAdicional {
  id: string
  nombre: string
  descripcion: string | null
  precioSugerido: number
}

interface ProblemaSeleccionado {
  id: string
  nombre: string
}

interface ServicioSeleccionado {
  id: string
  nombre: string
  precio: number
}

interface MetodoPago {
  id: string
  nombre: string
  activo: boolean
}

interface Equipo {
  id: string // ID temporal para el formulario (ej: "equipo-1", "equipo-2")
  tipoEquipo: string
  marcaModelo: string
  descripcionEquipo: string
  dejoSinCargador: boolean
  dejoAccesorios: boolean
  esCotizacion: boolean
  problemasSeleccionados: ProblemaSeleccionado[]
  otrosProblemas: string
  faltaPernos: boolean
  tieneAranaduras: boolean
  otrosDetalles: string
  costoServicio: number
  fotos: string[] // URLs de fotos ya subidas
}

export default function NuevoServicioPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const esAdmin = session?.user?.rol === 'admin'

  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [tecnicos, setTecnicos] = useState<Usuario[]>([])
  const [problemasDisponibles, setProblemasDisponibles] = useState<ProblemaComun[]>([])
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioAdicional[]>([])
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])

  // Modales
  const [modalNuevoProblema, setModalNuevoProblema] = useState(false)
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false)
  const [modalAgregarProblema, setModalAgregarProblema] = useState(false)
  const [modalAgregarServicio, setModalAgregarServicio] = useState(false)

  // Nuevo problema/servicio
  const [nuevoProblema, setNuevoProblema] = useState('')
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState('')
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState('0')

  // ✅ Tipo de servicio
  const [tipoServicioForm, setTipoServicioForm] = useState<'TALLER' | 'DOMICILIO'>('TALLER')

  // Datos del cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDni, setClienteDni] = useState('')
  const [clienteTipoDoc, setClienteTipoDoc] = useState('DNI')
  const [clienteCelular, setClienteCelular] = useState('')

  // Datos del servicio
  const [sedeId, setSedeId] = useState(session?.user?.sedeId || '')
  const [tecnicoId, setTecnicoId] = useState(session?.user?.id || '')
  const [tipoEquipo, setTipoEquipo] = useState('LAPTOP')
  const [marcaEquipo, setMarcaEquipo] = useState('')
  const [descripcionEquipo, setDescripcionEquipo] = useState('')
  const [direccionServicio, setDireccionServicio] = useState('') // ✅ Para servicios a domicilio

  // Recepción
  const [dejoSinCargador, setDejoSinCargador] = useState(false)
  const [dejoAccesorios, setDejoAccesorios] = useState(false)
  const [esCotizacion, setEsCotizacion] = useState(false)

  // Problemas
  const [problemasSeleccionados, setProblemasSeleccionados] = useState<ProblemaSeleccionado[]>([])
  const [descripcionProblema, setDescripcionProblema] = useState('')

  // Detalles del equipo
  const [faltaPernos, setFaltaPernos] = useState(false)
  const [tieneAranaduras, setTieneAranaduras] = useState(false)
  const [otrosDetalles, setOtrosDetalles] = useState('')

  // Costos
  const [costoServicio, setCostoServicio] = useState('0')
  const [serviciosAdicionales, setServiciosAdicionales] = useState<ServicioSeleccionado[]>([])
  const [metodoPago, setMetodoPago] = useState('')
  const [aCuenta, setACuenta] = useState('0')

  // Otros
  const [fechaEstimada, setFechaEstimada] = useState(() => {
    // Por defecto: hoy (mismo día que se registra el servicio) - usando fecha local
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [garantiaDias, setGarantiaDias] = useState('30')

  // Fotos
  const [fotos, setFotos] = useState<File[]>([])
  const [previsualizaciones, setPrevisualizaciones] = useState<string[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)

  // ✅ MÚLTIPLES EQUIPOS
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [equipoIndex, setEquipoIndex] = useState<number | null>(null) // null = nuevo equipo, número = editando
  const [modalEquipoAbierto, setModalEquipoAbierto] = useState(false) // Control del modal

  // Función para resetear formulario de equipo
  const resetearFormularioEquipo = () => {
    setTipoEquipo('LAPTOP')
    setMarcaEquipo('')
    setDescripcionEquipo('')
    setDejoSinCargador(false)
    setDejoAccesorios(false)
    setEsCotizacion(false)
    setProblemasSeleccionados([])
    setDescripcionProblema('')
    setFaltaPernos(false)
    setTieneAranaduras(false)
    setOtrosDetalles('')
    setCostoServicio('0')
    setFotos([])
    setPrevisualizaciones([])
    setEquipoIndex(null)
  }

  // Función para agregar/actualizar equipo
  const agregarEquipo = () => {
    // Validaciones del equipo actual
    if (!tipoEquipo) {
      alert('Por favor seleccione el tipo de equipo')
      return
    }

    if (problemasSeleccionados.length === 0 && !descripcionProblema) {
      alert('Por favor seleccione al menos un problema o describa el problema')
      return
    }

    if (parseFloat(costoServicio) <= 0) {
      alert('El costo del servicio debe ser mayor a 0')
      return
    }

    const nuevoEquipo: Equipo = {
      id: equipoIndex !== null ? equipos[equipoIndex].id : `equipo-${Date.now()}`,
      tipoEquipo,
      marcaModelo: marcaEquipo,
      descripcionEquipo,
      dejoSinCargador,
      dejoAccesorios,
      esCotizacion,
      problemasSeleccionados,
      otrosProblemas: descripcionProblema,
      faltaPernos,
      tieneAranaduras,
      otrosDetalles,
      costoServicio: parseFloat(costoServicio),
      fotos: previsualizaciones // URLs ya subidas
    }

    if (equipoIndex !== null) {
      // Editar equipo existente
      const nuevosEquipos = [...equipos]
      nuevosEquipos[equipoIndex] = nuevoEquipo
      setEquipos(nuevosEquipos)
    } else {
      // Agregar nuevo equipo
      setEquipos([...equipos, nuevoEquipo])
    }

    resetearFormularioEquipo()
    alert('Equipo agregado correctamente')
  }

  // Función para editar equipo
  const editarEquipo = (index: number) => {
    const equipo = equipos[index]
    setTipoEquipo(equipo.tipoEquipo)
    setMarcaEquipo(equipo.marcaModelo)
    setDescripcionEquipo(equipo.descripcionEquipo)
    setDejoSinCargador(equipo.dejoSinCargador)
    setDejoAccesorios(equipo.dejoAccesorios)
    setEsCotizacion(equipo.esCotizacion)
    setProblemasSeleccionados(equipo.problemasSeleccionados)
    setDescripcionProblema(equipo.otrosProblemas)
    setFaltaPernos(equipo.faltaPernos)
    setTieneAranaduras(equipo.tieneAranaduras)
    setOtrosDetalles(equipo.otrosDetalles)
    setCostoServicio(equipo.costoServicio.toString())
    setPrevisualizaciones(equipo.fotos)
    setEquipoIndex(index)
    setModalEquipoAbierto(true) // ✅ Abrir modal
  }

  // Función para eliminar equipo
  const eliminarEquipo = (index: number) => {
    if (confirm('¿Está seguro que desea eliminar este equipo?')) {
      setEquipos(equipos.filter((_, i) => i !== index))
      if (equipoIndex === index) {
        resetearFormularioEquipo()
      }
    }
  }

  // Calcular costo total de todos los equipos
  const costoTotalEquipos = equipos.reduce((sum, equipo) => sum + equipo.costoServicio, 0)
  const saldoTotal = costoTotalEquipos - parseFloat(aCuenta)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarDatos()

    // Si no es admin, asignar automáticamente sede y técnico (solo para TALLER)
    if (!esAdmin && session?.user) {
      if (session.user.sedeId) {
        setSedeId(session.user.sedeId)
      }
      if (session.user.id && tipoServicioForm === 'TALLER') {
        setTecnicoId(session.user.id)
      }
    }
  }, [esAdmin, session, tipoServicioForm])

  // Limpiar técnico cuando cambia a DOMICILIO (para que el usuario elija)
  useEffect(() => {
    if (!esAdmin && tipoServicioForm === 'DOMICILIO') {
      setTecnicoId('') // Limpiar para forzar selección
    } else if (!esAdmin && tipoServicioForm === 'TALLER' && session?.user?.id) {
      setTecnicoId(session.user.id) // Auto-asignar en TALLER
    }
  }, [tipoServicioForm, esAdmin, session])

  const cargarDatos = async () => {
    try {
      const [resSedes, resUsuarios, resProblemas, resServicios, resMetodosPago] = await Promise.all([
        fetch('/api/sedes'),
        fetch('/api/usuarios'),
        fetch('/api/problemas-comunes'),
        fetch('/api/servicios-adicionales'),
        fetch('/api/metodos-pago')
      ])

      const [dataSedes, dataUsuarios, dataProblemas, dataServicios, dataMetodosPago] = await Promise.all([
        resSedes.json(),
        resUsuarios.json(),
        resProblemas.json(),
        resServicios.json(),
        resMetodosPago.json()
      ])

      if (dataSedes.success) setSedes(dataSedes.sedes)
      if (dataUsuarios.success) setTecnicos(dataUsuarios.usuarios.filter((u: any) => u.activo))
      if (dataProblemas.success) setProblemasDisponibles(dataProblemas.problemas)
      if (dataMetodosPago.success) {
        setMetodosPago(dataMetodosPago.metodosPago)
        // Establecer el primer método de pago como predeterminado
        if (dataMetodosPago.metodosPago.length > 0) {
          setMetodoPago(dataMetodosPago.metodosPago[0].nombre)
        }
      }
      if (dataServicios.success) setServiciosDisponibles(dataServicios.servicios)
    } catch (error) {
      console.error('Error al cargar datos:', error)
    }
  }

  const agregarProblema = (problema: any) => {
    if (!problemasSeleccionados.find(p => p.id === problema.id)) {
      setProblemasSeleccionados([...problemasSeleccionados, {
        id: problema.id,
        nombre: problema.nombre
      }])
    }
    setModalAgregarProblema(false)
  }

  const eliminarProblema = (problemaId: string) => {
    setProblemasSeleccionados(problemasSeleccionados.filter(p => p.id !== problemaId))
  }

  const crearNuevoProblema = async () => {
    if (!nuevoProblema.trim()) {
      alert('Ingrese el nombre del problema')
      return
    }

    try {
      const response = await fetch('/api/problemas-comunes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoProblema })
      })

      const data = await response.json()

      if (data.success) {
        setProblemasDisponibles([...problemasDisponibles, data.problema])
        agregarProblema(data.problema)
        setNuevoProblema('')
        setModalNuevoProblema(false)
        alert('✅ Problema agregado al catálogo')
      } else {
        alert('❌ ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear problema')
    }
  }

  const agregarServicioAdicional = (servicio: any) => {
    setServiciosAdicionales([...serviciosAdicionales, {
      id: servicio.id,
      nombre: servicio.nombre,
      precio: Number(servicio.precioSugerido || 0)
    }])
    setModalAgregarServicio(false)
  }

  const crearNuevoServicioAdicional = async () => {
    if (!nuevoServicioNombre.trim()) {
      alert('Ingrese el nombre del servicio')
      return
    }

    try {
      const response = await fetch('/api/servicios-adicionales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoServicioNombre,
          precioSugerido: parseFloat(nuevoServicioPrecio) || 0
        })
      })

      const data = await response.json()

      if (data.success) {
        setServiciosDisponibles([...serviciosDisponibles, data.servicio])
        agregarServicioAdicional(data.servicio)
        setNuevoServicioNombre('')
        setNuevoServicioPrecio('0')
        setModalNuevoServicio(false)
        alert('✅ Servicio agregado al catálogo')
      } else {
        alert('❌ ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear servicio')
    }
  }

  const eliminarServicioAdicional = (index: number) => {
    setServiciosAdicionales(serviciosAdicionales.filter((_, i) => i !== index))
  }

  const actualizarPrecioServicio = (index: number, precio: string) => {
    const nuevos = [...serviciosAdicionales]
    nuevos[index].precio = parseFloat(precio) || 0
    setServiciosAdicionales(nuevos)
  }

  const handleSeleccionarFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || [])
    
    // Validar máximo 5 fotos
    if (fotos.length + archivos.length > 5) {
      alert('⚠️ Máximo 5 fotos permitidas')
      return
    }

    // Validar tamaño (máximo 5MB por foto)
    const archivosValidos = archivos.filter(archivo => {
      if (archivo.size > 5 * 1024 * 1024) {
        alert(`⚠️ La foto ${archivo.name} es muy grande. Máximo 5MB por foto.`)
        return false
      }
      return true
    })

    setFotos([...fotos, ...archivosValidos])

    // Crear previsualizaciones
    archivosValidos.forEach(archivo => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPrevisualizaciones(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(archivo)
    })
  }

  const eliminarFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index))
    setPrevisualizaciones(previsualizaciones.filter((_, i) => i !== index))
  }

  const subirFotos = async (): Promise<string[]> => {
    if (fotos.length === 0) return []

    setSubiendoFotos(true)
    const urlsFotos: string[] = []

    try {
      for (const foto of fotos) {
        const formData = new FormData()
        formData.append('file', foto)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (data.success) {
          urlsFotos.push(data.url)
        }
      }

      return urlsFotos
    } catch (error) {
      console.error('Error al subir fotos:', error)
      return []
    } finally {
      setSubiendoFotos(false)
    }
  }

  const calcularTotal = () => {
    const costoServ = parseFloat(costoServicio) || 0
    const costoAdicionales = serviciosAdicionales.reduce((sum, s) => sum + s.precio, 0)
    return costoServ + costoAdicionales
  }

  const calcularSaldo = () => {
    return calcularTotal() - (parseFloat(aCuenta) || 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones del cliente
    if (!clienteNombre || !clienteDni || !clienteCelular) {
      alert('Por favor complete los datos del cliente')
      return
    }

    // Validar formato según tipo de documento
    if (clienteTipoDoc === 'DNI') {
      if (!/^\d{8}$/.test(clienteDni)) {
        alert('El DNI debe tener exactamente 8 dígitos')
        return
      }
    } else if (clienteTipoDoc === 'RUC') {
      if (!/^\d{11}$/.test(clienteDni)) {
        alert('El RUC debe tener exactamente 11 dígitos')
        return
      }
    } else if (clienteTipoDoc === 'CE') {
      if (!/^\d{9}$/.test(clienteDni)) {
        alert('El CE debe tener exactamente 9 dígitos')
        return
      }
    } else if (clienteTipoDoc === 'PASAPORTE') {
      if (!/^[A-Za-z0-9]{7,12}$/.test(clienteDni)) {
        alert('El Pasaporte debe tener entre 7 y 12 caracteres alfanuméricos')
        return
      }
    }

    if (clienteCelular.length !== 9) {
      alert('El celular debe tener 9 dígitos')
      return
    }

    // ✅ Validaciones de equipos
    if (equipos.length === 0) {
      alert('Por favor agregue al menos un equipo')
      return
    }

    if (!sedeId || !tecnicoId) {
      alert('Por favor seleccione sede y técnico')
      return
    }

    setLoading(true)

    try {
      // Subir fotos de los equipos que las tienen
      const equiposConFotos = await Promise.all(
        equipos.map(async (equipo) => {
          return {
            ...equipo,
            fotos: equipo.fotos // Ya están subidas, solo pasar las URLs
          }
        })
      )

      const response = await fetch('/api/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre,
          clienteDni,
          clienteTipoDoc,
          clienteCelular,
          tecnicoId,
          sedeId,
          // ✅ ENVIAR ARRAY DE EQUIPOS
          equipos: equiposConFotos,
          // Datos generales del servicio
          tipoServicioForm,
          direccionServicio: tipoServicioForm === 'DOMICILIO' ? direccionServicio : null,
          serviciosAdicionales,
          metodoPago,
          fechaEstimada: fechaEstimada ? new Date(fechaEstimada + 'T00:00:00-05:00').toISOString() : null,
          garantiaDias: parseInt(garantiaDias),
          aCuenta: parseFloat(aCuenta) || 0
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Servicio registrado: ${data.servicio.numeroServicio}`)
        router.push('/dashboard/servicios')
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al registrar servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '0.5rem' : '1rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        flexWrap: 'wrap',
        gap: isMobile ? '0.75rem' : '1rem'
      }}>
        <h1 style={{
          fontSize: isMobile ? '1.25rem' : 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 'bold',
          margin: 0
        }}>
          🔧 Nuevo Servicio Técnico
        </h1>
        <button
          onClick={() => router.push('/dashboard/servicios')}
          style={{
            padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          ← Volver
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ✅ SELECTOR DE TIPO DE SERVICIO */}
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '0.75rem' : '1.5rem',
          borderRadius: '8px',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            fontWeight: '600',
            marginBottom: isMobile ? '0.5rem' : '0.75rem',
            color: '#374151'
          }}>
            📋 Tipo de Servicio
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '0.75rem'
          }}>
            <button
              type="button"
              onClick={() => setTipoServicioForm('TALLER')}
              style={{
                padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1.25rem',
                backgroundColor: tipoServicioForm === 'TALLER' ? '#3b82f6' : 'white',
                color: tipoServicioForm === 'TALLER' ? 'white' : '#374151',
                border: `2px solid ${tipoServicioForm === 'TALLER' ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>🔧</span>
              <span>Servicio en Taller</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoServicioForm('DOMICILIO')}
              style={{
                padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1.25rem',
                backgroundColor: tipoServicioForm === 'DOMICILIO' ? '#10b981' : 'white',
                color: tipoServicioForm === 'DOMICILIO' ? 'white' : '#374151',
                border: `2px solid ${tipoServicioForm === 'DOMICILIO' ? '#10b981' : '#d1d5db'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>🏠</span>
              <span>Servicio a Domicilio</span>
            </button>
          </div>
          <p style={{
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: '#6b7280',
            marginTop: '0.5rem',
            marginBottom: 0
          }}>
            {tipoServicioForm === 'TALLER'
              ? 'El cliente deja el equipo en el local'
              : 'El técnico va a la ubicación del cliente'}
          </p>
        </div>

        {/* DATOS DEL CLIENTE CON BUSCADOR */}
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '0.75rem' : '1.5rem',
          borderRadius: '8px',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: isMobile ? '0.95rem' : '1.25rem',
            fontWeight: '600',
            marginBottom: isMobile ? '0.75rem' : '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: isMobile ? '0.35rem' : '0.5rem'
          }}>
            👤 DATOS DEL CLIENTE
          </h2>

          <BuscadorCliente
            onClienteSeleccionado={setClienteSeleccionado}
            clienteNombre={clienteNombre}
            clienteDni={clienteDni}
            clienteCelular={clienteCelular}
            tipoDoc={clienteTipoDoc}
            onCambioNombre={setClienteNombre}
            onCambioDni={setClienteDni}
            onCambioCelular={setClienteCelular}
            onCambioTipoDoc={setClienteTipoDoc}
          />
        </div>

        {/* TÉCNICO Y SEDE */}
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '0.75rem' : '1.5rem',
          borderRadius: '8px',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: isMobile ? '0.95rem' : '1.25rem',
            fontWeight: '600',
            marginBottom: isMobile ? '0.75rem' : '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: isMobile ? '0.35rem' : '0.5rem'
          }}>
            🏢 TÉCNICO Y SEDE
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                Sede *
              </label>
              {esAdmin ? (
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.5rem' : '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Seleccione sede</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: isMobile ? '0.5rem' : '0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #10b981',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  fontWeight: '600',
                  color: '#065f46'
                }}>
                  {sedes.find(s => s.id === sedeId)?.nombre || session?.user?.sedeName || 'Sede asignada'}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                Técnico Encargado *
                {tipoServicioForm === 'DOMICILIO' && !esAdmin && (
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                    (Quien va al domicilio)
                  </span>
                )}
              </label>
              {/* Para admin o servicios a domicilio: siempre seleccionable */}
              {(esAdmin || tipoServicioForm === 'DOMICILIO') ? (
                <select
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.5rem' : '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Seleccione técnico</option>
                  {tecnicos.map(tecnico => (
                    <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: isMobile ? '0.5rem' : '0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #10b981',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  fontWeight: '600',
                  color: '#065f46'
                }}>
                  {tecnicos.find(t => t.id === tecnicoId)?.nombre || session?.user?.nombre || 'Tú'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EQUIPOS AGREGADOS - RESUMEN */}
        {equipos.length > 0 && (
          <div style={{
            backgroundColor: '#f0fdf4',
            padding: isMobile ? '0.75rem' : '1.5rem',
            borderRadius: '8px',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '2px solid #10b981'
          }}>
            <h2 style={{
              fontSize: isMobile ? '0.95rem' : '1.25rem',
              fontWeight: '600',
              marginBottom: isMobile ? '0.75rem' : '1.5rem',
              color: '#065f46'
            }}>
              ✅ EQUIPOS AGREGADOS ({equipos.length})
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {equipos.map((equipo, index) => (
                <div
                  key={equipo.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    position: 'relative'
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>📱 {equipo.tipoEquipo}</strong>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                      {equipo.marcaModelo}
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                      <strong>Problema:</strong> {equipo.otrosProblemas}
                    </p>
                    {equipo.problemasSeleccionados.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {equipo.problemasSeleccionados.map(p => (
                          <span
                            key={p.id}
                            style={{
                              fontSize: '0.7rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '3px'
                            }}
                          >
                            {p.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    backgroundColor: '#fef3c7',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    marginBottom: '0.75rem',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#92400e'
                  }}>
                    S/ {equipo.costoServicio.toFixed(2)}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => editarEquipo(index)}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarEquipo(index)}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '2px solid #d1d5db',
              textAlign: 'right',
              fontSize: '1rem',
              fontWeight: '700',
              color: '#065f46'
            }}>
              COSTO TOTAL: S/ {costoTotalEquipos.toFixed(2)}
            </div>
          </div>
        )}

        {/* BOTÓN AGREGAR NUEVO EQUIPO - ABRE MODAL */}
        {modalEquipoAbierto === false && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: isMobile ? '1rem' : '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => {
                resetearFormularioEquipo()
                setModalEquipoAbierto(true)
              }}
              style={{
                padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.95rem' : '1.1rem',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              ➕ Agregar Nuevo Equipo
            </button>
          </div>
        )}

        {/* SERVICIOS ADICIONALES */}
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '0.75rem' : '1.5rem',
          borderRadius: '8px',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: isMobile ? '0.95rem' : '1.25rem',
            fontWeight: '600',
            marginBottom: isMobile ? '0.75rem' : '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: isMobile ? '0.35rem' : '0.5rem'
          }}>
            🛠️ SERVICIOS ADICIONALES (Opcional)
          </h2>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isMobile ? '0.75rem' : '1rem',
            flexWrap: 'wrap',
            gap: isMobile ? '0.5rem' : '1rem'
          }}>
            <span></span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setModalAgregarServicio(true)}
                style={{
                  padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                + Agregar
              </button>
              <button
                type="button"
                onClick={() => setModalNuevoServicio(true)}
                style={{
                  padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                + Nuevo
              </button>
            </div>
          </div>

          {serviciosAdicionales.length > 0 && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              {serviciosAdicionales.map((servicio, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderBottom: index < serviciosAdicionales.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                  }}
                >
                  <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                    {servicio.nombre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>S/</span>
                    <input
                      type="number"
                      value={servicio.precio}
                      onChange={(e) => actualizarPrecioServicio(index, e.target.value)}
                      min="0"
                      step="0.01"
                      style={{
                        width: '100px',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarServicioAdicional(index)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MÉTODO DE PAGO Y TOTALES */}
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '0.75rem' : '1.5rem',
          borderRadius: '8px',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: isMobile ? '0.95rem' : '1.25rem',
            fontWeight: '600',
            marginBottom: isMobile ? '0.75rem' : '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: isMobile ? '0.35rem' : '0.5rem'
          }}>
            💰 COSTOS Y ADELANTO
          </h2>

          {/* ADELANTO DEL CLIENTE - OPCIONAL */}
          <div style={{
            backgroundColor: '#eff6ff',
            padding: isMobile ? '0.75rem' : '1.25rem',
            borderRadius: '8px',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            border: '2px solid #3b82f6'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              marginBottom: isMobile ? '0.75rem' : '1rem',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600',
              color: '#1e40af'
            }}>
              <input
                type="checkbox"
                checked={parseFloat(aCuenta) > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setACuenta('0')
                  } else {
                    setACuenta('0')
                  }
                }}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span>💳 ¿Recibir Adelanto del Cliente?</span>
            </label>

            {parseFloat(aCuenta) > 0 || metodoPago ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                    Método de Pago del Adelanto (Opcional)
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.5rem' : '0.75rem',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: isMobile ? '0.8rem' : '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {metodosPago.map((metodo) => (
                      <option key={metodo.id} value={metodo.nombre}>
                        {metodo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                    Monto del Adelanto (Opcional)
                  </label>
                  <input
                    type="number"
                    value={aCuenta}
                    onChange={(e) => setACuenta(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.5rem' : '0.75rem',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: isMobile ? '0.8rem' : '0.875rem'
                    }}
                  />
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                ✓ No se registrará adelanto por el momento
              </p>
            )}
          </div>

          {/* FECHA ESTIMADA Y GARANTÍA */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                📅 Fecha Estimada de Entrega
              </label>
              <input
                type="date"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.625rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.85rem' : '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                🛡️ Garantía (días)
              </label>
              <input
                type="number"
                value={garantiaDias}
                onChange={(e) => setGarantiaDias(e.target.value)}
                min="0"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.625rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.85rem' : '0.875rem'
                }}
              />
            </div>
          </div>

          {/* RESUMEN DE TOTALES */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '0.75rem' : '1.5rem',
            borderRadius: '8px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #d1d5db'
            }}>
              <span style={{ fontWeight: '600' }}>📱 Equipos Agregados:</span>
              <span style={{ fontWeight: '600', color: '#065f46' }}>{equipos.length}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}>
              <span style={{ fontWeight: '500' }}>Costo Equipos:</span>
              <span style={{ fontWeight: '600' }}>S/ {costoTotalEquipos.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}>
              <span style={{ fontWeight: '500' }}>Servicios Adicionales:</span>
              <span style={{ fontWeight: '600' }}>
                S/ {serviciosAdicionales.reduce((sum, s) => sum + s.precio, 0).toFixed(2)}
              </span>
            </div>

            <div style={{
              borderTop: '2px solid #d1d5db',
              paddingTop: '0.75rem',
              marginTop: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                fontSize: 'clamp(1rem, 3vw, 1.25rem)'
              }}>
                <span style={{ fontWeight: '700' }}>TOTAL:</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>
                  S/ {(costoTotalEquipos + serviciosAdicionales.reduce((sum, s) => sum + s.precio, 0)).toFixed(2)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)'
              }}>
                <span style={{ fontWeight: '600' }}>A Cuenta:</span>
                <span style={{ fontWeight: '600', color: '#3b82f6' }}>
                  S/ {parseFloat(aCuenta || '0').toFixed(2)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                paddingTop: '0.75rem',
                borderTop: '1px solid #d1d5db'
              }}>
                <span style={{ fontWeight: '700' }}>SALDO:</span>
                <span style={{ fontWeight: '700', color: '#ef4444' }}>
                  S/ {(costoTotalEquipos + serviciosAdicionales.reduce((sum, s) => sum + s.precio, 0) - parseFloat(aCuenta || '0')).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={{
          display: isMobile ? 'grid' : 'flex',
          gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
          gap: isMobile ? '0.75rem' : '1rem',
          justifyContent: isMobile ? undefined : 'flex-end',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard/servicios')}
            disabled={loading || subiendoFotos}
            style={{
              padding: isMobile ? '0.75rem' : '1rem 2rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || subiendoFotos ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? '0.85rem' : '1rem',
              whiteSpace: 'nowrap'
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading || subiendoFotos}
            style={{
              padding: isMobile ? '0.75rem' : '1rem 3rem',
              backgroundColor: loading || subiendoFotos ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || subiendoFotos ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? '0.85rem' : '1rem',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            {subiendoFotos ? '📸 Subiendo fotos...' : loading ? '⏳ Guardando...' : '💾 Registrar Servicio'}
          </button>
        </div>
      </form>

      {/* MODAL: EDITAR/AGREGAR EQUIPO */}
<Modal
  isOpen={modalEquipoAbierto}
  onClose={() => {
    setModalEquipoAbierto(false)
    resetearFormularioEquipo()
  }}
  title={equipoIndex !== null ? '✏️ Editar Equipo' : '➕ Agregar Nuevo Equipo'}
>
  <div style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: '1rem' }}>
    {/* CONTENIDO DEL MODAL - FORMULARIO DE EQUIPO */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
          Tipo de Equipo *
        </label>
        <select
          value={tipoEquipo}
          onChange={(e) => setTipoEquipo(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        >
          <option value="">Seleccionar...</option>
          <option value="LAPTOP">Laptop</option>
          <option value="PC">PC / Computadora</option>
          <option value="CELULAR">Celular</option>
          <option value="TABLET">Tablet</option>
          <option value="IMPRESORA">Impresora</option>
          <option value="OTROS">Otros</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
          Marca
        </label>
        <input
          type="text"
          value={marcaEquipo}
          onChange={(e) => setMarcaEquipo(e.target.value)}
          placeholder="Ej: HP, Lenovo"
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
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
          Modelo/Detalles
        </label>
        <input
          type="text"
          value={descripcionEquipo}
          onChange={(e) => setDescripcionEquipo(e.target.value)}
          placeholder="Ej: Pavilion 15"
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

    {/* CHECKBOXES DE RECEPCIÓN */}
    {tipoServicioForm === 'TALLER' && (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        marginBottom: '1rem'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={dejoSinCargador}
            onChange={(e) => setDejoSinCargador(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Sin cargador</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={dejoAccesorios}
            onChange={(e) => setDejoAccesorios(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Dejó accesorios</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={esCotizacion}
            onChange={(e) => setEsCotizacion(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Es cotización</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={faltaPernos}
            onChange={(e) => setFaltaPernos(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Falta de pernos</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={tieneAranaduras}
            onChange={(e) => setTieneAranaduras(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>Tiene arañaduras</span>
        </label>
      </div>
    )}

    {/* OTROS DETALLES */}
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
        Otros detalles
      </label>
      <textarea
        value={otrosDetalles}
        onChange={(e) => setOtrosDetalles(e.target.value)}
        rows={2}
        placeholder="Otros detalles del equipo..."
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

    {/* PROBLEMAS */}
    <div style={{
      padding: '1rem',
      backgroundColor: '#f0fdf4',
      borderRadius: '6px',
      marginBottom: '1rem',
      border: '1px solid #d1d5db'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <strong style={{ fontSize: '0.9rem' }}>🔧 Problemas</strong>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={() => setModalAgregarProblema(true)}
            style={{
              padding: '0.3rem 0.6rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            + Agregar
          </button>
          <button
            type="button"
            onClick={() => setModalNuevoProblema(true)}
            style={{
              padding: '0.3rem 0.6rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            + Nuevo
          </button>
        </div>
      </div>

      {problemasSeleccionados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
          {problemasSeleccionados.map(p => (
            <span
              key={p.id}
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              {p.nombre}
              <button
                type="button"
                onClick={() => eliminarProblema(p.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1e40af',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.75rem'
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.75rem' }}>
          Descripción adicional
        </label>
        <textarea
          value={descripcionProblema}
          onChange={(e) => setDescripcionProblema(e.target.value)}
          rows={2}
          placeholder="Detalles adicionales..."
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.75rem',
            resize: 'vertical'
          }}
        />
      </div>
    </div>

    {/* COSTO */}
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
        Costo del Servicio *
      </label>
      <input
        type="number"
        value={costoServicio}
        onChange={(e) => setCostoServicio(e.target.value)}
        required
        min="0"
        step="0.01"
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}
      />
    </div>

    {/* BOTONES */}
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
      <button
        type="button"
        onClick={() => {
          setModalEquipoAbierto(false)
          resetearFormularioEquipo()
        }}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={() => {
          agregarEquipo()
          setModalEquipoAbierto(false)
        }}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        {equipoIndex !== null ? '✏️ Actualizar' : '➕ Agregar'}
      </button>
    </div>

    {/* MODALES DENTRO DEL MODAL DE EQUIPO */}
    
    {/* MODAL: AGREGAR PROBLEMA */}
    <ModalAgregarProblema
      isOpen={modalAgregarProblema}
      onClose={() => setModalAgregarProblema(false)}
      problemas={problemasDisponibles}
      onSeleccionar={agregarProblema}
      onCrearNuevo={() => {
        setModalAgregarProblema(false)
        setModalNuevoProblema(true)
      }}
    />

    {/* MODAL: NUEVO PROBLEMA */}
    <Modal
      isOpen={modalNuevoProblema}
      onClose={() => setModalNuevoProblema(false)}
      title="Crear Nuevo Problema"
    >
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Nombre del problema *
        </label>
        <input
          type="text"
          value={nuevoProblema}
          onChange={(e) => setNuevoProblema(e.target.value)}
          placeholder="Ej: Problema de batería"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setModalNuevoProblema(false)}
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
            type="button"
            onClick={crearNuevoProblema}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Crear y Agregar
          </button>
        </div>
      </div>
    </Modal>
  </div>
</Modal>

      {/* MODAL: AGREGAR SERVICIO - FUERA DEL MODAL DE EQUIPO */}
      <ModalAgregarServicio
        isOpen={modalAgregarServicio}
        onClose={() => setModalAgregarServicio(false)}
        servicios={serviciosDisponibles}
        onSeleccionar={agregarServicioAdicional}
        onCrearNuevo={() => {
          setModalAgregarServicio(false)
          setModalNuevoServicio(true)
        }}
      />

      {/* MODAL: NUEVO SERVICIO - FUERA DEL MODAL DE EQUIPO */}
      <Modal
        isOpen={modalNuevoServicio}
        onClose={() => setModalNuevoServicio(false)}
        title="Crear Nuevo Servicio Adicional"
      >
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Nombre del servicio *
            </label>
            <input
              type="text"
              value={nuevoServicioNombre}
              onChange={(e) => setNuevoServicioNombre(e.target.value)}
              placeholder="Ej: Cambio de batería"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Precio sugerido *
            </label>
            <input
              type="number"
              value={nuevoServicioPrecio}
              onChange={(e) => setNuevoServicioPrecio(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
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
              type="button"
              onClick={() => setModalNuevoServicio(false)}
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
              type="button"
              onClick={crearNuevoServicioAdicional}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Crear y Agregar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}