"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import BuscadorCliente from "../../components/BuscadorCliente"
import ModalAgregarProblema from "../../components/ModalAgregarProblema"
import ModalAgregarServicio from "../../components/ModalAgregarServicio"
import Modal from "../../components/Modal"




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

interface Servicio {
  id: string
  numeroServicio: string
  clienteNombre: string
  clienteDni: string
  clienteCelular: string
  tipoEquipo: string
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
  fechaEntregaReal: string
  estado: string
  prioridad: string
  garantiaDias: number
  fotosEquipo: string[]
  fotosDespues: string[]
  diagnostico: string | null
  solucion: string | null
  createdAt: string
  updatedAt: string
  cliente: any
  usuario: any
  sede: any
  tipoServicio: any
  sedeId: string
  usuarioId: string
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
}


export default function EditarServicioPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const servicioId = params.id as string
  const esAdmin = session?.user?.rol === 'admin'

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [tecnicos, setTecnicos] = useState<Usuario[]>([])
  const [problemasDisponibles, setProblemasDisponibles] = useState<ProblemaComun[]>([])
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioAdicional[]>([])
  
  // Estado del servicio
  const [estadoServicio, setEstadoServicio] = useState('')
  const [numeroServicio, setNumeroServicio] = useState('')

  // Modales
  const [modalNuevoProblema, setModalNuevoProblema] = useState(false)
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false)
  const [modalAgregarProblema, setModalAgregarProblema] = useState(false)
  const [modalAgregarServicio, setModalAgregarServicio] = useState(false)

  // Nuevo problema/servicio
  const [nuevoProblema, setNuevoProblema] = useState('')
  const [nuevoProblemaDescripcion, setNuevoProblemaDescripcion] = useState('')
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState('')
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState('0')

  // Datos del cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDni, setClienteDni] = useState('')
  const [clienteCelular, setClienteCelular] = useState('')

  // Datos del servicio
  const [sedeId, setSedeId] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [tipoEquipo, setTipoEquipo] = useState('LAPTOP')
  const [marcaEquipo, setMarcaEquipo] = useState('')
  const [descripcionEquipo, setDescripcionEquipo] = useState('')

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
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [aCuenta, setACuenta] = useState('0')
  const [dejaAdelanto, setDejaAdelanto] = useState(false)

  // ✅ MÚLTIPLES EQUIPOS
  const [equipos, setEquipos] = useState<any[]>([])
  const [equipoIndex, setEquipoIndex] = useState<number | null>(null)
  const [modalEquipoAbierto, setModalEquipoAbierto] = useState(false)
  const [conCargador, setConCargador] = useState(false)

  // Otros
  const [fechaEstimada, setFechaEstimada] = useState('')
  const [garantiaDias, setGarantiaDias] = useState('30')
  const [prioridad, setPrioridad] = useState('NORMAL')

  // ✅ FOTOS - Gestión separada
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([])
  const [previsualizacionesNuevas, setPrevisualizacionesNuevas] = useState<string[]>([])
  const [fotosAEliminar, setFotosAEliminar] = useState<string[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)

 const [servicioCompleto, setServicioCompleto] = useState<Servicio | null>(null)

  // ✅ 1. Cargar catálogos primero
  useEffect(() => {
    console.log('🔄 [EDITAR] Iniciando carga de datos (sedes, usuarios, catálogos)')
    cargarDatos()
  }, [])

  // ✅ 2. Cargar servicio cuando los catálogos básicos estén listos
  useEffect(() => {
    console.log('🔍 [EDITAR] Verificando condiciones para cargar servicio:', {
      servicioId,
      sedesLength: sedes.length,
      problemasDisponibles: problemasDisponibles.length,
      serviciosDisponibles: serviciosDisponibles.length
    })

    // ✅ Solo requerimos servicioId y sedes. Los catálogos de problemas/servicios son opcionales
    if (servicioId && sedes.length > 0) {
      console.log('✅ [EDITAR] Condiciones cumplidas (servicioId + sedes), cargando servicio...')
      cargarServicio()
    } else {
      console.warn('⚠️ [EDITAR] No se puede cargar servicio aún:', {
        tieneServicioId: !!servicioId,
        sedesLength: sedes.length
      })
    }
  }, [servicioId, sedes])

  const cargarDatos = async () => {
    try {
      console.log('🌐 [EDITAR] Haciendo fetch a APIs de catálogos...')

      const [resSedes, resUsuarios, resProblemas, resServicios] = await Promise.all([
        fetch('/api/sedes'),
        fetch('/api/usuarios'),
        fetch('/api/problemas-comunes'),
        fetch('/api/servicios-adicionales')
      ])

      console.log('📡 [EDITAR] Respuestas recibidas:', {
        sedes: resSedes.status,
        usuarios: resUsuarios.status,
        problemas: resProblemas.status,
        servicios: resServicios.status
      })

      const [dataSedes, dataUsuarios, dataProblemas, dataServicios] = await Promise.all([
        resSedes.json(),
        resUsuarios.json(),
        resProblemas.json(),
        resServicios.json()
      ])

      console.log('📦 [EDITAR] Datos parseados:', {
        sedesSuccess: dataSedes.success,
        sedesCount: dataSedes.sedes?.length || 0,
        usuariosSuccess: dataUsuarios.success,
        usuariosCount: dataUsuarios.usuarios?.length || 0,
        problemasSuccess: dataProblemas.success,
        problemasCount: dataProblemas.problemas?.length || 0,
        serviciosSuccess: dataServicios.success,
        serviciosCount: dataServicios.servicios?.length || 0
      })

      if (dataSedes.success) {
        setSedes(dataSedes.sedes)
        console.log('✅ [EDITAR] Sedes cargadas:', dataSedes.sedes.length)
      } else {
        console.error('❌ [EDITAR] Error al cargar sedes:', dataSedes.error)
      }

      if (dataUsuarios.success) {
        const usuariosActivos = dataUsuarios.usuarios.filter((u: any) => u.activo)
        setTecnicos(usuariosActivos)
        console.log('✅ [EDITAR] Técnicos activos cargados:', usuariosActivos.length)
      } else {
        console.error('❌ [EDITAR] Error al cargar usuarios:', dataUsuarios.error)
      }

      if (dataProblemas.success) {
        console.log('✅ [EDITAR] Catálogo de problemas cargado:', dataProblemas.problemas.length)
        setProblemasDisponibles(dataProblemas.problemas)
      } else {
        console.error('❌ [EDITAR] Error al cargar problemas:', dataProblemas.error)
        setProblemasDisponibles([]) // ✅ Asegurar que sea array vacío
      }

      if (dataServicios.success) {
        console.log('✅ [EDITAR] Catálogo de servicios cargado:', dataServicios.servicios.length)
        setServiciosDisponibles(dataServicios.servicios)
      } else {
        console.error('❌ [EDITAR] Error al cargar servicios adicionales:', dataServicios.error)
        setServiciosDisponibles([]) // ✅ Asegurar que sea array vacío
      }

      console.log('🏁 [EDITAR] Carga de catálogos completada')
    } catch (error) {
      console.error('❌ [EDITAR] Error al cargar datos:', error)
      console.error('❌ [EDITAR] Stack trace:', error instanceof Error ? error.stack : 'No stack')
    }
  }

 const cargarServicio = async () => {
  try {
    setLoadingData(true)
    console.log('🔍 [EDITAR] Cargando servicio para editar:', servicioId)

    console.log('🌐 [EDITAR] Haciendo fetch a:', `/api/servicios/${servicioId}`)
    const response = await fetch(`/api/servicios/${servicioId}`)
    console.log('📡 [EDITAR] Response status:', response.status)

    const data = await response.json()
    console.log('📦 [EDITAR] Data recibida:', {
      success: data.success,
      hasServicio: !!data.servicio,
      error: data.error
    })

    if (data.success) {
      const s = data.servicio
      console.log('✅ [EDITAR] Servicio cargado correctamente:', s.numeroServicio)
      console.log('📋 [EDITAR] Objeto servicio completo:', s)

      // Datos básicos
      setNumeroServicio(s.numeroServicio)
      setEstadoServicio(s.estado)

      // Datos del cliente
      console.log('👤 [EDITAR] Datos del cliente recibidos:', {
        nombre: s.clienteNombre,
        dni: s.clienteDni,
        celular: s.clienteCelular
      })
      setClienteNombre(s.clienteNombre || '')
      setClienteDni(s.clienteDni || '')
      setClienteCelular(s.clienteCelular || '')

      // Servicio
      setSedeId(s.sedeId || '')
      setTecnicoId(s.usuarioId || s.usuario?.id || '')
      
      // ✅ NO cargar datos del primer equipo aquí - solo usamos el modal para editar equipos
      // Los equipos vienen desde serviciosAdicionales JSON
      resetearFormularioEquipo()

      // Recepción - MANTENER VACÍO para equipos múltiples
      setDejoSinCargador(false)
      setDejoAccesorios(false)
      setEsCotizacion(s.esCotizacion || false)
      setFaltaPernos(false)
      setTieneAranaduras(false)
      setOtrosDetalles('')

      // PROBLEMAS
      if (s.problemasReportados && Array.isArray(s.problemasReportados) && s.problemasReportados.length > 0) {
        console.log('📝 [EDITAR] IDs de problemas guardados:', s.problemasReportados)
        console.log('📚 [EDITAR] Problemas disponibles para buscar:', problemasDisponibles.length)

        if (problemasDisponibles.length > 0) {
          const problemasObj = s.problemasReportados
            .map((id: string) => {
              const problema = problemasDisponibles.find(p => p.id === id)
              if (problema) {
                console.log('✅ [EDITAR] Problema encontrado:', problema.nombre)
                return { id: problema.id, nombre: problema.nombre }
              } else {
                console.log('⚠️ [EDITAR] Problema no encontrado con ID:', id)
              }
              return null
            })
            .filter((p: any) => p !== null)

          console.log('✅ [EDITAR] Total problemas cargados:', problemasObj.length)
          setProblemasSeleccionados(problemasObj)
        } else {
          console.warn('⚠️ [EDITAR] Catálogo de problemas vacío, no se pueden cargar nombres de problemas')
          setProblemasSeleccionados([])
        }
      } else {
        console.log('ℹ️ [EDITAR] No hay problemas reportados en el servicio')
        setProblemasSeleccionados([])
      }
      
      setDescripcionProblema(s.otrosProblemas || '')

      // Costos
      setCostoServicio(String(s.costoServicio || 0))
      
      // SERVICIOS ADICIONALES Y EQUIPOS
      if (s.serviciosAdicionales) {
        try {
          let serviciosData: any = s.serviciosAdicionales
          
          // Si es string, parsear JSON
          if (typeof serviciosData === 'string') {
            serviciosData = JSON.parse(serviciosData)
          }
          
          // Extraer equipos
          if (serviciosData.equipos && Array.isArray(serviciosData.equipos)) {
            console.log('✅ [EDITAR] Equipos cargados:', serviciosData.equipos.length)
            console.log('📋 [EDITAR] Detalle de equipos:', serviciosData.equipos)
            setEquipos(serviciosData.equipos)
          }
          
          // Extraer servicios adicionales
          if (serviciosData.servicios && Array.isArray(serviciosData.servicios)) {
            const serviciosValidos = serviciosData.servicios.filter((srv: any) => 
              srv && typeof srv === 'object' && srv.nombre && srv.precio !== undefined
            )
            setServiciosAdicionales(serviciosValidos)
          } else {
            setServiciosAdicionales([])
          }
        } catch (error) {
          console.error('Error al parsear serviciosAdicionales:', error)
          setEquipos([])
          setServiciosAdicionales([])
        }
      } else {
        setEquipos([])
        setServiciosAdicionales([])
      }
      
      setMetodoPago(s.metodoPago || 'EFECTIVO')
      setACuenta(String(s.aCuenta || 0))
      setDejaAdelanto((s.aCuenta || 0) > 0) // Marcar checkbox si hay adelanto

      // Otros
      if (s.fechaEntregaEstimada) {
        // Convertir a fecha local de Perú (UTC-5) para evitar cambios de día
        const fecha = new Date(s.fechaEntregaEstimada)
        const year = fecha.getFullYear()
        const month = String(fecha.getMonth() + 1).padStart(2, '0')
        const day = String(fecha.getDate()).padStart(2, '0')
        setFechaEstimada(`${year}-${month}-${day}`)
      }
      setGarantiaDias(String(s.garantiaDias || 30))
      setPrioridad(s.prioridad || 'NORMAL')

      // FOTOS EXISTENTES
      if (s.fotosEquipo && Array.isArray(s.fotosEquipo)) {
        setFotosExistentes(s.fotosEquipo)
        console.log('📸 Fotos cargadas:', s.fotosEquipo.length)
      } else {
        setFotosExistentes([])
      }

      // ✅✅✅ GUARDAR EL SERVICIO COMPLETO
      setServicioCompleto(s)
      console.log('✅ [EDITAR] Servicio completo guardado para mostrar info de reparación')
      console.log('✅ [EDITAR] Carga de servicio completada exitosamente')

    } else {
      console.error('❌ [EDITAR] Error en response:', data.error)
      alert('❌ Error: ' + data.error)
      router.push('/dashboard/servicios')
    }
  } catch (error) {
    console.error('❌ [EDITAR] Error al cargar servicio:', error)
    console.error('❌ [EDITAR] Stack trace:', error instanceof Error ? error.stack : 'No stack')
    alert('❌ Error al cargar servicio. Revisa la consola.')
    router.push('/dashboard/servicios')
  } finally {
    console.log('🏁 [EDITAR] setLoadingData(false)')
    setLoadingData(false)
  }
}



  // ✅ ELIMINAR FOTO EXISTENTE
  const eliminarFotoExistente = async (url: string) => {
    if (!confirm('¿Eliminar esta foto del servicio?')) return

    try {
      // Eliminar del servidor
      const response = await fetch('/api/upload/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await response.json()
      
      if (data.success) {
        setFotosAEliminar([...fotosAEliminar, url])
        setFotosExistentes(fotosExistentes.filter(f => f !== url))
        console.log('✅ Foto eliminada del servidor')
      }
    } catch (error) {
      console.error('Error al eliminar foto:', error)
      alert('Error al eliminar foto')
    }
  }

  // ✅ AGREGAR NUEVAS FOTOS
  const handleSeleccionarFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || [])
    
    const totalFotos = fotosExistentes.length + fotosNuevas.length
    
    if (totalFotos + archivos.length > 5) {
      alert('⚠️ Máximo 5 fotos en total')
      return
    }

    const archivosValidos = archivos.filter(archivo => {
      if (archivo.size > 5 * 1024 * 1024) {
        alert(`⚠️ La foto ${archivo.name} es muy grande. Máximo 5MB.`)
        return false
      }
      return true
    })

    setFotosNuevas([...fotosNuevas, ...archivosValidos])

    archivosValidos.forEach(archivo => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPrevisualizacionesNuevas(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(archivo)
    })
  }

  const eliminarFotoNueva = (index: number) => {
    setFotosNuevas(fotosNuevas.filter((_, i) => i !== index))
    setPrevisualizacionesNuevas(previsualizacionesNuevas.filter((_, i) => i !== index))
  }

  const subirFotosNuevas = async (): Promise<string[]> => {
    if (fotosNuevas.length === 0) return []

    setSubiendoFotos(true)
    const urlsFotos: string[] = []

    try {
      for (const foto of fotosNuevas) {
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

// 1. FUNCIÓN agregarProblema (con debug):
const agregarProblema = (problema: any) => {
  console.log('🔧 Intentando agregar problema:', problema.nombre)
  console.log('📋 Problemas actuales:', problemasSeleccionados.map(p => p.nombre))
  
  // Verificar si ya existe
  const yaExiste = problemasSeleccionados.find(p => p.id === problema.id)
  
  if (!yaExiste) {
    const nuevosProblemas = [...problemasSeleccionados, {
      id: problema.id,
      nombre: problema.nombre
    }]
    console.log('✅ Nuevos problemas después de agregar:', nuevosProblemas.map(p => p.nombre))
    setProblemasSeleccionados(nuevosProblemas)
  } else {
    console.log('⚠️ Problema ya existe en la lista')
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
        body: JSON.stringify({
          nombre: nuevoProblema,
          descripcion: nuevoProblemaDescripcion || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setProblemasDisponibles([...problemasDisponibles, data.problema])
        agregarProblema(data.problema)
        setNuevoProblema('')
        setNuevoProblemaDescripcion('')
        setModalNuevoProblema(false)
        alert('✅ Problema agregado')
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
        alert('✅ Servicio agregado')
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

  // ✅ EQUIPOS - Funciones para editar/eliminar
  const editarEquipo = (index: number) => {
    const equipo = equipos[index]
    console.log('🔧 [EDITAR EQUIPO] Datos del equipo:', equipo)

    setTipoEquipo(equipo.tipoEquipo || 'LAPTOP')

    // Separar marca y modelo del campo marcaModelo
    const partes = (equipo.marcaModelo || '').split(' ')
    setMarcaEquipo(partes[0] || '')
    setDescripcionEquipo(partes.slice(1).join(' ') || equipo.descripcionEquipo || '')

    // ✅ Cargar valores exactos como fueron guardados
    setDejoSinCargador(Boolean(equipo.dejoSinCargador))
    setConCargador(Boolean(equipo.conCargador))

    setDejoAccesorios(Boolean(equipo.dejoAccesorios))
    setEsCotizacion(Boolean(equipo.esCotizacion))
    setProblemasSeleccionados(equipo.problemasSeleccionados || [])
    setDescripcionProblema(equipo.otrosProblemas || '')
    setFaltaPernos(Boolean(equipo.faltaPernos))
    setTieneAranaduras(Boolean(equipo.tieneAranaduras))
    setOtrosDetalles(equipo.otrosDetalles || '')
    setCostoServicio(String(equipo.costoServicio || 0))
    setEquipoIndex(index)
    setModalEquipoAbierto(true)
  }

  const eliminarEquipo = (index: number) => {
    if (confirm('¿Eliminar este equipo?')) {
      setEquipos(equipos.filter((_, i) => i !== index))
    }
  }

  const guardarEquipo = () => {
    if (!tipoEquipo) {
      alert('Seleccione tipo de equipo')
      return
    }

    if (problemasSeleccionados.length === 0 && !descripcionProblema) {
      alert('Debe seleccionar al menos un problema o agregar una descripción')
      return
    }

    if (!costoServicio || parseFloat(costoServicio) <= 0) {
      alert('El costo del servicio debe ser mayor a 0')
      return
    }

    const equipoActualizado = {
      id: equipoIndex !== null ? equipos[equipoIndex].id : `equipo-${Date.now()}`,
      tipoEquipo,
      marcaModelo: `${marcaEquipo} ${descripcionEquipo}`.trim(),
      descripcionEquipo,
      dejoSinCargador,
      conCargador,
      dejoAccesorios,
      esCotizacion,
      problemasSeleccionados,
      otrosProblemas: descripcionProblema,
      faltaPernos,
      tieneAranaduras,
      otrosDetalles,
      costoServicio: parseFloat(costoServicio) || 0,
      fotos: [] // Las fotos son a nivel de servicio
    }

    console.log('💾 [GUARDAR EQUIPO] Datos a guardar:', equipoActualizado)

    if (equipoIndex !== null) {
      // Editar equipo existente
      const nuevosEquipos = [...equipos]
      nuevosEquipos[equipoIndex] = equipoActualizado
      setEquipos(nuevosEquipos)
    } else {
      // Agregar nuevo equipo
      setEquipos([...equipos, equipoActualizado])
    }

    setEquipoIndex(null)
    setModalEquipoAbierto(false)
    resetearFormularioEquipo()
    alert('Equipo guardado correctamente')
  }

  const resetearFormularioEquipo = () => {
    setTipoEquipo('LAPTOP')
    setMarcaEquipo('')
    setDescripcionEquipo('')
    setDejoSinCargador(false)
    setConCargador(false)
    setDejoAccesorios(false)
    setEsCotizacion(false)
    setProblemasSeleccionados([])
    setDescripcionProblema('')
    setFaltaPernos(false)
    setTieneAranaduras(false)
    setOtrosDetalles('')
    setCostoServicio('0')
  }

  const calcularTotal = () => {
    // Sumar costos de todos los equipos
    const costoEquipos = equipos.reduce((sum, eq) => sum + (eq.costoServicio || 0), 0)
    const costoAdicionales = serviciosAdicionales.reduce((sum, s) => sum + s.precio, 0)
    return costoEquipos + costoAdicionales
  }

  const calcularSaldo = () => {
    return calcularTotal() - (parseFloat(aCuenta) || 0)
  }

  // ✅ VALIDAR SI PUEDE EDITAR COSTOS
  const puedeEditarCostos = !['ENTREGADO', 'CANCELADO'].includes(estadoServicio)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteNombre || !clienteDni || !clienteCelular) {
      alert('Complete los datos del cliente')
      return
    }

    if (clienteDni.length !== 8) {
      alert('El DNI debe tener 8 dígitos')
      return
    }

    if (clienteCelular.length !== 9) {
      alert('El celular debe tener 9 dígitos')
      return
    }

    if (!sedeId || !tecnicoId) {
      alert('Seleccione sede y técnico')
      return
    }

    if (equipos.length === 0) {
      alert('Debe agregar al menos un equipo')
      return
    }

    setLoading(true)

    try {
      // ✅ Subir fotos nuevas
      let urlsFotosNuevas: string[] = []
      if (fotosNuevas.length > 0) {
        console.log('📸 Subiendo fotos nuevas...')
        urlsFotosNuevas = await subirFotosNuevas()
        console.log('✅ Fotos nuevas subidas:', urlsFotosNuevas)
      }

      // ✅ Combinar fotos existentes + nuevas
      const todasLasFotos = [...fotosExistentes, ...urlsFotosNuevas]

      console.log('🔄 Enviando solicitud de actualización al servidor...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout

      const response = await fetch(`/api/servicios/${servicioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          clienteNombre,
          clienteDni,
          clienteCelular,
          tecnicoId,
          sedeId,
          // ✅ Enviar array de equipos actualizado
          equipos: equipos,
          problemasReportados: problemasSeleccionados.map(p => p.id),
          otrosProblemas: descripcionProblema,
          serviciosAdicionales,
          metodoPago: dejaAdelanto ? metodoPago : null,
          fechaEstimada: fechaEstimada ? new Date(fechaEstimada + 'T00:00:00-05:00').toISOString() : null,
          garantiaDias: parseInt(garantiaDias),
          aCuenta: dejaAdelanto ? parseFloat(aCuenta) : 0,
          prioridad,
          fotosEquipo: todasLasFotos
        })
      })

      clearTimeout(timeoutId)
      
      console.log('✅ Respuesta recibida del servidor:', response.status)

      const data = await response.json()
      
      console.log('📦 Datos de respuesta:', data)

      if (data.success) {
        alert(`✅ Servicio actualizado: ${numeroServicio}`)
        router.push(`/dashboard/servicios/${servicioId}`)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error)
      
      if (error.name === 'AbortError') {
        alert('⏱️ La solicitud tardó demasiado. Intente nuevamente.')
      } else {
        alert('❌ Error al actualizar servicio: ' + (error.message || 'Error desconocido'))
      }
    } finally {
      setLoading(false)
    }
  }

  const obtenerColorEstado = (estado: string) => {
    const colores: any = {
      'RECEPCIONADO': '#3b82f6',
      'EN_DIAGNOSTICO': '#f59e0b',
      'EN_REPARACION': '#8b5cf6',
      'ESPERANDO_REPUESTOS': '#ef4444',
      'REPARADO': '#10b981',
      'ENTREGADO': '#6b7280',
      'CANCELADO': '#dc2626'
    }
    return colores[estado] || '#6b7280'
  }

  if (loadingData) {
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
 

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto',
      padding: '1rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <button
            onClick={() => router.push(`/dashboard/servicios/${servicioId}`)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}
          >
            ← Volver
          </button>
          <h1 style={{ 
            fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
            fontWeight: 'bold', 
            margin: 0 
          }}>
            ✏️ Editar Servicio: {numeroServicio}
          </h1>
        </div>
        
        <div style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontSize: '0.95rem',
          fontWeight: '600',
          backgroundColor: obtenerColorEstado(estadoServicio) + '20',
          color: obtenerColorEstado(estadoServicio)
        }}>
          {estadoServicio.replace(/_/g, ' ')}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* DATOS DEL CLIENTE */}
        <div style={{
          backgroundColor: 'white',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            👤 DATOS DEL CLIENTE
          </h2>

          <BuscadorCliente
            onClienteSeleccionado={(cliente) => {
              setClienteSeleccionado(cliente)
              if (cliente) {
                setClienteNombre(cliente.nombre)
                setClienteDni(cliente.numeroDoc)
                setClienteCelular(cliente.telefono || '')
              }
            }}
            clienteNombre={clienteNombre}
            clienteDni={clienteDni}
            clienteCelular={clienteCelular}
            onCambioNombre={setClienteNombre}
            onCambioDni={setClienteDni}
            onCambioCelular={setClienteCelular}
          />
        </div>

        {/* TÉCNICO Y SEDE */}
        <div style={{
          backgroundColor: 'white',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            🏢 TÉCNICO Y SEDE
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                Sede (No editable)
              </label>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f3f4f6',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280'
              }}>
                {sedes.find(s => s.id === sedeId)?.nombre || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                Técnico Encargado *
              </label>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Seleccione técnico</option>
                {tecnicos.map(tecnico => (
                  <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        {/* ✅ EQUIPOS MÚLTIPLES */}
        <div style={{
          backgroundColor: 'white',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              📱 EQUIPOS ({equipos.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                resetearFormularioEquipo()
                setEquipoIndex(null)
                setModalEquipoAbierto(true)
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              ➕ Agregar Equipo
            </button>
          </div>

          {equipos.length > 0 ? (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              {equipos.map((equipo, idx) => (
                <div key={idx} style={{
                  padding: '1rem',
                  borderBottom: idx < equipos.length - 1 ? '1px solid #e5e7eb' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {equipo.tipoEquipo} - {equipo.marcaModelo}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Descripción: {equipo.descripcionEquipo}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.25rem', fontWeight: '600' }}>
                      Costo: S/ {equipo.costoServicio || 0}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => editarEquipo(idx)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarEquipo(idx)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              borderRadius: '6px'
            }}>
              <p>No hay equipos agregados</p>
            </div>
          )}
        </div>



        {/* ✅ FOTOS DEL EQUIPO - GESTIÓN COMPLETA */}
        <div style={{
          backgroundColor: 'white',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            📸 FOTOS DEL EQUIPO ({fotosExistentes.length + fotosNuevas.length}/5)
          </h2>

          {/* FOTOS EXISTENTES */}
          {fotosExistentes.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.75rem'
              }}>
                Fotos actuales:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                {fotosExistentes.map((foto, index) => (
                  <div
                    key={`existente-${index}`}
                    style={{
                      position: 'relative',
                      paddingTop: '100%',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid #10b981'
                    }}
                  >
                    <img
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => eliminarFotoExistente(foto)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      ✕
                    </button>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.25rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.9)',
                      color: 'white',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      ORIGINAL
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOTOS NUEVAS */}
          {fotosNuevas.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.75rem'
              }}>
                Fotos nuevas a agregar:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                {previsualizacionesNuevas.map((preview, index) => (
                  <div
                    key={`nueva-${index}`}
                    style={{
                      position: 'relative',
                      paddingTop: '100%',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid #3b82f6'
                    }}
                  >
                    <img
                      src={preview}
                      alt={`Nueva foto ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => eliminarFotoNueva(index)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      ✕
                    </button>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.25rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.9)',
                      color: 'white',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      NUEVA
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTÓN AGREGAR FOTOS */}
          <div>
            <label style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: (fotosExistentes.length + fotosNuevas.length) >= 5 ? '#9ca3af' : '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              cursor: (fotosExistentes.length + fotosNuevas.length) >= 5 ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600'
            }}>
              📷 Agregar más fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleSeleccionarFotos}
                disabled={(fotosExistentes.length + fotosNuevas.length) >= 5}
                style={{ display: 'none' }}
              />
            </label>
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Máximo 5 fotos • Máximo 5MB por foto
            </div>
          </div>
        </div>

        {/* PROBLEMAS (igual que nuevo) */}

{/* ✅ SECCIÓN: INFORMACIÓN DE REPARACIÓN (SOLO LECTURA) */}
{servicioCompleto && (servicioCompleto.diagnostico || servicioCompleto.solucion || 
  (servicioCompleto.items && servicioCompleto.items.length > 0) || 
  (servicioCompleto.fotosDespues && servicioCompleto.fotosDespues.length > 0)) && (
  <div style={{
    backgroundColor: '#f0fdf4',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
    border: '2px solid #10b981'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        margin: 0,
        color: '#065f46'
      }}>
        🩺 Información de Reparación
      </h2>
      <div style={{
        backgroundColor: '#fef3c7',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#92400e',
        border: '1px solid #fbbf24'
      }}>
        ℹ️ Solo lectura - Usa "Editar Reparación" en el detalle
      </div>
    </div>

    {/* Diagnóstico */}
    {servicioCompleto.diagnostico && (
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#065f46',
          marginBottom: '0.5rem'
        }}>
          Diagnóstico Técnico:
        </label>
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #10b981',
          whiteSpace: 'pre-wrap'
        }}>
          {servicioCompleto.diagnostico}
        </div>
      </div>
    )}

    {/* Solución */}
    {servicioCompleto.solucion && (
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#065f46',
          marginBottom: '0.5rem'
        }}>
          Solución Aplicada:
        </label>
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #10b981',
          whiteSpace: 'pre-wrap'
        }}>
          {servicioCompleto.solucion}
        </div>
      </div>
    )}

    {/* Repuestos Utilizados */}
    {servicioCompleto.items && servicioCompleto.items.length > 0 && (
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#065f46',
          marginBottom: '0.5rem'
        }}>
          Repuestos Utilizados ({servicioCompleto.items.length}):
        </label>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #10b981',
          overflow: 'hidden'
        }}>
          {servicioCompleto.items.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: index < servicioCompleto.items.length - 1 ? '1px solid #d1fae5' : 'none',
                backgroundColor: index % 2 === 0 ? 'white' : '#f0fdf4'
              }}
            >
              <div>
                <span style={{ fontWeight: '600' }}>
                  {item.producto?.codigo} - {item.producto?.nombre}
                </span>
                <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                  x{item.cantidad}
                </span>
              </div>
              <span style={{ fontWeight: '600', color: '#10b981' }}>
                S/ {Number(item.subtotal || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Fotos del Resultado */}
    {servicioCompleto.fotosDespues && servicioCompleto.fotosDespues.length > 0 && (
      <div>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#065f46',
          marginBottom: '0.5rem'
        }}>
          Fotos del Resultado ({servicioCompleto.fotosDespues.length}):
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '0.5rem'
        }}>
          {servicioCompleto.fotosDespues.map((foto, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                paddingTop: '100%',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '2px solid #10b981',
                cursor: 'pointer'
              }}
              onClick={() => window.open(foto, '_blank')}
            >
              <img
                src={foto}
                alt={`Resultado ${index + 1}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
       {/* COSTOS */}
        <div style={{
          backgroundColor: 'white',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>🛠️ SERVICIOS ADICIONALES</h2>
            {puedeEditarCostos && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setModalAgregarServicio(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>+ Agregar</button>
                <button type="button" onClick={() => setModalNuevoServicio(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>+ Nuevo</button>
              </div>
            )}
          </div>

          {serviciosAdicionales.length > 0 && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
              {serviciosAdicionales.map((servicio, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: index < serviciosAdicionales.length - 1 ? '1px solid #e5e7eb' : 'none', backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{servicio.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>S/</span>
                    <input
                      type="number"
                      value={servicio.precio}
                      onChange={(e) => actualizarPrecioServicio(index, e.target.value)}
                      disabled={!puedeEditarCostos}
                      min="0"
                      step="0.01"
                      style={{
                        width: '100px',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        opacity: puedeEditarCostos ? 1 : 0.5,
                        cursor: puedeEditarCostos ? 'text' : 'not-allowed'
                      }}
                    />
                  </div>
                  {puedeEditarCostos && (
                    <button type="button" onClick={() => eliminarServicioAdicional(index)} style={{ padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MÉTODO DE PAGO Y TOTALES */}
        <div style={{
          backgroundColor: 'white',
          padding: 'clamp(1rem, 3vw, 2rem)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            💳 MÉTODO DE PAGO Y TOTALES
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              marginBottom: '1rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1e40af'
            }}>
              <input
                type="checkbox"
                checked={dejaAdelanto}
                onChange={(e) => {
                  setDejaAdelanto(e.target.checked)
                  if (!e.target.checked) {
                    setACuenta('0')
                    setMetodoPago('EFECTIVO')
                  }
                }}
                disabled={!puedeEditarCostos}
                style={{ width: '20px', height: '20px', cursor: puedeEditarCostos ? 'pointer' : 'not-allowed' }}
              />
              <span>💳 ¿Recibir Adelanto del Cliente?</span>
            </label>

            {dejaAdelanto ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Método de Pago del Adelanto</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} disabled={!puedeEditarCostos} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', opacity: puedeEditarCostos ? 1 : 0.5, cursor: puedeEditarCostos ? 'pointer' : 'not-allowed' }}>
                    <option value="">-- Seleccionar --</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="YAPE_PERSONAL">Yape Personal</option>
                    <option value="YAPE_EMPRESA">Yape Empresa</option>
                    <option value="DEPOSITO">Depósito</option>
                    <option value="INTERBANCARIO">Interbancario</option>
                    <option value="VISA">Visa</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Monto del Adelanto</label>
                  <input
                    type="number"
                    value={aCuenta}
                    onChange={(e) => setACuenta(e.target.value)}
                    disabled={!puedeEditarCostos}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      opacity: puedeEditarCostos ? 1 : 0.5,
                      cursor: puedeEditarCostos ? 'text' : 'not-allowed'
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>Fecha Estimada de Entrega</label>
              <input
                type="date"
                value={fechaEstimada}
                min={(() => {
                  const today = new Date()
                  const year = today.getFullYear()
                  const month = String(today.getMonth() + 1).padStart(2, '0')
                  const day = String(today.getDate()).padStart(2, '0')
                  return `${year}-${month}-${day}`
                })()}
                onChange={(e) => setFechaEstimada(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {/* RESUMEN */}
          <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
              <span style={{ fontWeight: '500' }}>Costo del Servicio:</span>
              <span style={{ fontWeight: '600' }}>S/ {parseFloat(costoServicio || '0').toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
              <span style={{ fontWeight: '500' }}>Servicios Adicionales:</span>
              <span style={{ fontWeight: '600' }}>S/ {serviciosAdicionales.reduce((sum, s) => sum + s.precio, 0).toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '2px solid #d1d5db', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <span style={{ fontWeight: '700' }}>TOTAL:</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>S/ {calcularTotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                <span style={{ fontWeight: '600' }}>A Cuenta:</span>
                <span style={{ fontWeight: '600', color: '#3b82f6' }}>S/ {parseFloat(aCuenta || '0').toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(1rem, 3vw, 1.25rem)', paddingTop: '0.75rem', borderTop: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: '700' }}>SALDO:</span>
                <span style={{ fontWeight: '700', color: '#ef4444' }}>S/ {calcularSaldo().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/servicios/${servicioId}`)}
            disabled={loading || subiendoFotos}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || subiendoFotos ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading || subiendoFotos}
            style={{
              padding: '1rem 3rem',
              backgroundColor: loading || subiendoFotos ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || subiendoFotos ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              fontWeight: '600'
            }}
          >
            {subiendoFotos ? '📸 Subiendo fotos...' : loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>

      {/* MODALES */}
      <ModalAgregarProblema
        isOpen={modalAgregarProblema}
        onClose={() => setModalAgregarProblema(false)}
        problemas={problemasDisponibles}
        onSeleccionar={agregarProblema}
        onCrearNuevo={() => setModalNuevoProblema(true)}
        zIndex={1100}
      />

      <Modal
        isOpen={modalNuevoProblema}
        onClose={() => {
          setModalNuevoProblema(false)
          setNuevoProblema('')
          setNuevoProblemaDescripcion('')
        }}
        title="Crear Nuevo Problema"
        zIndex={1100}
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Descripción (opcional)
          </label>
          <textarea
            value={nuevoProblemaDescripcion}
            onChange={(e) => setNuevoProblemaDescripcion(e.target.value)}
            placeholder="Ej: Síntomas comunes, reparaciones..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '1rem',
              minHeight: '80px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setModalNuevoProblema(false)
                setNuevoProblema('')
                setNuevoProblemaDescripcion('')
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

      <ModalAgregarServicio
        isOpen={modalAgregarServicio}
        onClose={() => setModalAgregarServicio(false)}
        servicios={serviciosDisponibles}
        onSeleccionar={agregarServicioAdicional}
        onCrearNuevo={() => setModalNuevoServicio(true)}
      />

      <Modal isOpen={modalNuevoServicio} onClose={() => setModalNuevoServicio(false)} title="Crear Nuevo Servicio Adicional">
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre del servicio *</label>
            <input type="text" value={nuevoServicioNombre} onChange={(e) => setNuevoServicioNombre(e.target.value)} placeholder="Ej: Cambio de batería" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Precio sugerido *</label>
            <input type="number" value={nuevoServicioPrecio} onChange={(e) => setNuevoServicioPrecio(e.target.value)} min="0" step="0.01" placeholder="0.00" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setModalNuevoServicio(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
            <button type="button" onClick={crearNuevoServicioAdicional} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Crear y Agregar</button>
          </div>
        </div>
      </Modal>

      {/* ✅ MODAL EDITAR EQUIPO */}
      <Modal
        isOpen={modalEquipoAbierto}
        onClose={() => {
          setModalEquipoAbierto(false)
          resetearFormularioEquipo()
          setEquipoIndex(null)
        }}
        title={equipoIndex !== null ? '✏️ Editar Equipo' : '➕ Agregar Nuevo Equipo'}
        maxHeight="95vh"
      >
        <div style={{ maxHeight: '90vh', overflowY: 'auto', paddingRight: '1rem' }}>
          {/* DATOS BÁSICOS DEL EQUIPO */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 0.75rem 0',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              📱 Datos del Equipo
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.9rem'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                  Tipo *
                </label>
                <select
                  value={tipoEquipo}
                  onChange={(e) => setTipoEquipo(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                  Marca
                </label>
                <input
                  type="text"
                  value={marcaEquipo}
                  onChange={(e) => setMarcaEquipo(e.target.value)}
                  placeholder="HP, Lenovo..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                  Modelo
                </label>
                <input
                  type="text"
                  value={descripcionEquipo}
                  onChange={(e) => setDescripcionEquipo(e.target.value)}
                  placeholder="Pavilion 15, MacBook Pro 13..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
          </div>

          {/* ESTADO DE RECEPCIÓN */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 0.75rem 0',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              ✅ Estado de Recepción
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.8rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={dejoSinCargador}
                  onChange={(e) => {
                    setDejoSinCargador(e.target.checked)
                    if (e.target.checked) setConCargador(false)
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Sin cargador</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={conCargador}
                  onChange={(e) => {
                    setConCargador(e.target.checked)
                    if (e.target.checked) setDejoSinCargador(false)
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Con cargador</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={dejoAccesorios}
                  onChange={(e) => setDejoAccesorios(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Dejó accesorios</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={faltaPernos}
                  onChange={(e) => setFaltaPernos(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Falta pernos</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={tieneAranaduras}
                  onChange={(e) => setTieneAranaduras(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Arañaduras</span>
              </label>
            </div>
          </div>

          {/* PROBLEMAS */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', maxHeight: '14rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <h4 style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#374151',
                margin: 0
              }}>
                🔧 Problemas
              </h4>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setModalAgregarProblema(true)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  + Agregar
                </button>
                <button
                  type="button"
                  onClick={() => setModalNuevoProblema(true)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  + Nuevo
                </button>
              </div>
            </div>

            {problemasSeleccionados.length > 0 && (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '5px',
                overflow: 'auto',
                backgroundColor: '#fafafa',
                minHeight: 0,
                flex: 1
              }}>
                {problemasSeleccionados.map((p, index) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      borderBottom: index < problemasSeleccionados.length - 1 ? '1px solid #e5e7eb' : 'none',
                      fontSize: '0.8rem'
                    }}
                  >
                    <span>{p.nombre}</span>
                    <button
                      type="button"
                      onClick={() => eliminarProblema(p.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        transition: 'all 0.15s',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                Descripción
              </label>
              <textarea
                value={descripcionProblema}
                onChange={(e) => setDescripcionProblema(e.target.value)}
                rows={2}
                placeholder="Síntomas, fallas..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '5px',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* DETALLES Y COSTO */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.2rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <h4 style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#374151',
                margin: '0 0 0.75rem 0',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                📝 Detalles
              </h4>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                Otros detalles
              </label>
              <textarea
                value={otrosDetalles}
                onChange={(e) => setOtrosDetalles(e.target.value)}
                rows={2}
                placeholder="Información adicional..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '5px',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div>
              <h4 style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#374151',
                margin: '0 0 0.75rem 0',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                💰 Costo
              </h4>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>
                Monto (S/.) *
              </label>
              <input
                type="number"
                value={costoServicio}
                onChange={(e) => setCostoServicio(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '5px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <div style={{
                marginTop: '0.5rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                S/ {parseFloat(costoServicio || '0').toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '1rem'
          }}>
            <button
              type="button"
              onClick={() => {
                setModalEquipoAbierto(false)
                resetearFormularioEquipo()
                setEquipoIndex(null)
              }}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardarEquipo}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              {equipoIndex !== null ? '✏️ Guardar' : '➕ Agregar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}