"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import ModalIngresoStock from './components/ModalIngresoStock'

// Interfaces
interface ProductoSede {
  sedeId: string
  stock: number
  sede: {
    id: string
    nombre: string
  }
}

interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  precioVenta: number
  precioCompra: number
  garantia: string | null
  stockMin: number
  imagenes: string[]
  subcategoria: {
    id: string
    nombre: string
    categoria: {
      id: string
      nombre: string
    }
  }
  sedes: ProductoSede[]
}

interface Categoria {
  id: string
  nombre: string
  subcategorias: Array<{
    id: string
    nombre: string
  }>
}

interface Sede {
  id: string
  nombre: string
}

export default function ProductosPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const esAdmin = session?.user?.rol === 'admin'
  const sedeUsuario = session?.user?.sedeId

  const [isMobile, setIsMobile] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")
  const [sedeFiltro, setSedeFiltro] = useState('todas')
  const [paginaActual, setPaginaActual] = useState(1)
  const productosPorPagina = 50
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false)
  const [mostrarModalConsulta, setMostrarModalConsulta] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)

  // Estados para modal de consulta
  const [busquedaConsulta, setBusquedaConsulta] = useState("")
  const [sedeConsulta, setSedeConsulta] = useState("todas")

  // Estado para modal de ingreso rápido
  const [modalIngreso, setModalIngreso] = useState<{
    id: string
    codigo: string
    nombre: string
    stock: number
    precioCompra: number
    precioVenta: number
  } | null>(null)

  // Estados del formulario de edición
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precioCompra: '',
    precioVenta: '',
    garantia: '',
    stockMin: '',
    imagenes: [] as string[]
  })

  // Estados del formulario de nuevo producto
  const [formNuevo, setFormNuevo] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precioCompra: '',
    precioVenta: '',
    garantia: '',
    stockMin: '5',
    categoriaId: '',
    subcategoriaId: '',
    stockInicial: '0',
    sedeId: '',
    imagenes: [] as string[]
  })

  const [subcategoriasDisponibles, setSubcategoriasDisponibles] = useState<Array<{id: string, nombre: string}>>([])
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  const cargarDatosIniciales = async () => {
    try {
      const resCategorias = await fetch('/api/categorias')
      const dataCategorias = await resCategorias.json()
      if (dataCategorias.success) {
        setCategorias(dataCategorias.categorias)
      }

      const resSedes = await fetch('/api/sedes')
      const dataSedes = await resSedes.json()
      if (dataSedes.success) {
        setSedes(dataSedes.sedes)
        
        if (!esAdmin && sedeUsuario) {
          setFormNuevo(prev => ({ ...prev, sedeId: sedeUsuario }))
        } else if (dataSedes.sedes.length > 0) {
          setFormNuevo(prev => ({ ...prev, sedeId: dataSedes.sedes[0].id }))
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    }
  }

  const buscarProductos = async () => {
    // Validar que haya al menos 3 caracteres en la búsqueda O que haya seleccionado una categoría
    if (busqueda.trim().length < 3 && categoriaFiltro === 'todas') {
      alert('⚠️ Ingrese al menos 3 caracteres para buscar O seleccione una categoría')
      return
    }

    try {
      setLoading(true)
      setHasSearched(true)
      const resProductos = await fetch('/api/productos')
      const dataProductos = await resProductos.json()
      if (dataProductos.success) {
        setProductos(dataProductos.productos)
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
      alert('❌ Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const limpiarBusqueda = () => {
    setBusqueda('')
    setProductos([])
    setHasSearched(false)
    setCategoriaFiltro('todas')
    setSedeFiltro('todas')
    setPaginaActual(1)
  }

  const handleCategoriaChange = (categoriaId: string) => {
    setFormNuevo({ ...formNuevo, categoriaId, subcategoriaId: '', codigo: '' })
    const categoria = categorias.find(c => c.id === categoriaId)
    setSubcategoriasDisponibles(categoria?.subcategorias || [])
  }

  const handleSubcategoriaChange = async (subcategoriaId: string) => {
    setFormNuevo({ ...formNuevo, subcategoriaId })

    if (subcategoriaId) {
      try {
        const response = await fetch('/api/productos/generar-codigo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subcategoriaId })
        })

        const data = await response.json()
        if (data.success) {
          setFormNuevo(prev => ({ ...prev, codigo: data.codigo }))
        }
      } catch (error) {
        console.error('Error al generar código:', error)
      }
    }
  }

  const handleImagenChange = async (e: React.ChangeEvent<HTMLInputElement>, esNuevo: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar número máximo de fotos
    const imagenesActuales = esNuevo ? formNuevo.imagenes : formData.imagenes
    if (imagenesActuales.length >= 2) {
      alert('Solo puedes subir máximo 2 fotos por producto')
      return
    }

    // Validar tamaño
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar 2MB')
      return
    }

    setSubiendoImagen(true)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      const response = await fetch('/api/upload/productos', {
        method: 'POST',
        body: formDataUpload
      })

      const data = await response.json()

      if (data.success) {
        if (esNuevo) {
          setFormNuevo(prev => ({ ...prev, imagenes: [...prev.imagenes, data.url] }))
        } else {
          setFormData(prev => ({ ...prev, imagenes: [...prev.imagenes, data.url] }))
        }
      } else {
        alert(data.error || 'Error al subir imagen')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir imagen')
    } finally {
      setSubiendoImagen(false)
    }
  }

  const handleEliminarImagen = (index: number, esNuevo: boolean) => {
    if (esNuevo) {
      setFormNuevo(prev => ({
        ...prev,
        imagenes: prev.imagenes.filter((_, i) => i !== index)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        imagenes: prev.imagenes.filter((_, i) => i !== index)
      }))
    }
  }

  const handleCrearProducto = async () => {
    if (!formNuevo.codigo || !formNuevo.nombre || !formNuevo.precioCompra || 
        !formNuevo.precioVenta || !formNuevo.subcategoriaId || !formNuevo.sedeId) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    if (parseFloat(formNuevo.precioVenta) <= parseFloat(formNuevo.precioCompra)) {
      alert('El precio de venta debe ser mayor al precio de compra')
      return
    }

    setGuardando(true)

    try {
      const response = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formNuevo)
      })

      const data = await response.json()

      if (data.success) {
        alert('Producto creado correctamente')
        await cargarDatosIniciales()
        setMostrarModalNuevo(false)
        setFormNuevo({
          codigo: '',
          nombre: '',
          descripcion: '',
          precioCompra: '',
          precioVenta: '',
          garantia: '',
          stockMin: '5',
          categoriaId: '',
          subcategoriaId: '',
          stockInicial: '0',
          sedeId: esAdmin ? (sedes[0]?.id || '') : sedeUsuario || '',
          imagenes: []
        })
        setSubcategoriasDisponibles([])
      } else {
        alert(data.error || 'Error al crear producto')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear producto')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el producto "${nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Producto eliminado correctamente')
        cargarDatosIniciales()
        setMostrarModal(false)
      } else {
        alert('Error al eliminar producto')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar producto')
    }
  }

  const handleVerDetalle = (producto: Producto) => {
    setProductoSeleccionado(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precioCompra: producto.precioCompra.toString(),
      precioVenta: producto.precioVenta.toString(),
      garantia: producto.garantia || '',
      stockMin: producto.stockMin.toString(),
      imagenes: producto.imagenes || []
    })
    setModoEdicion(false)
    setMostrarModal(true)
  }

  const handleEditar = () => {
    if (!esAdmin && productoSeleccionado) {
      const tieneProductoEnSuSede = productoSeleccionado.sedes.some(s => s.sede.id === sedeUsuario)
      if (!tieneProductoEnSuSede) {
        alert('Solo puedes editar productos de tu sede')
        return
      }
    }
    setModoEdicion(true)
  }

  const handleCancelarEdicion = () => {
    if (productoSeleccionado) {
      setFormData({
        nombre: productoSeleccionado.nombre,
        descripcion: productoSeleccionado.descripcion || '',
        precioCompra: productoSeleccionado.precioCompra.toString(),
        precioVenta: productoSeleccionado.precioVenta.toString(),
        garantia: productoSeleccionado.garantia || '',
        stockMin: productoSeleccionado.stockMin.toString(),
        imagenes: productoSeleccionado.imagenes || []
      })
    }
    setModoEdicion(false)
  }

  const handleGuardarEdicion = async () => {
    if (!productoSeleccionado) return

    if (!formData.nombre || !formData.precioCompra || !formData.precioVenta) {
      alert('Por favor completa los campos obligatorios')
      return
    }

    setGuardando(true)

    try {
      const response = await fetch(`/api/productos/${productoSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        alert('Producto actualizado correctamente')
        await cargarDatosIniciales()
        setMostrarModal(false)
        setModoEdicion(false)
      } else {
        alert('Error al actualizar producto')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar producto')
    } finally {
      setGuardando(false)
    }
  }

  const productosDeMiSede = esAdmin ? productos : productos.filter(p => {
    const tieneStockEnMiSede = p.sedes.some(s => s.sede.id === sedeUsuario)
    return tieneStockEnMiSede
  })

  const productosFiltrados = productosDeMiSede.filter(p => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase())

    const coincideCategoria =
      categoriaFiltro === "todas" ||
      p.subcategoria.categoria.id === categoriaFiltro

    const coincideSede =
      sedeFiltro === 'todas' ||
      p.sedes.some(s => s.sedeId === sedeFiltro)

    return coincideBusqueda && coincideCategoria && coincideSede
  })

  // Paginación
  const indiceInicio = (paginaActual - 1) * productosPorPagina
  const indiceFin = indiceInicio + productosPorPagina
  const productosPaginados = productosFiltrados.slice(indiceInicio, indiceFin)
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina)

  const productosConsulta = productos.filter(p => {
    const coincideBusqueda = 
      p.nombre.toLowerCase().includes(busquedaConsulta.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busquedaConsulta.toLowerCase())
    
    let coincideSede = true
    if (sedeConsulta !== "todas") {
      coincideSede = p.sedes.some(s => s.sede.id === sedeConsulta)
    }
    
    return coincideBusqueda && coincideSede
  })

  const handleNuevoProducto = () => {
    setMostrarModalNuevo(true)
  }

  const handleAbrirConsulta = () => {
    setBusquedaConsulta("")
    setSedeConsulta("todas")
    setMostrarModalConsulta(true)
  }

  const getStockDeMiSede = (producto: Producto) => {
    if (esAdmin) {
      return producto.sedes.reduce((sum, s) => sum + s.stock, 0)
    }
    const sede = producto.sedes.find(s => s.sede.id === sedeUsuario)
    return sede?.stock || 0
  }

  const getStockPorSede = (producto: Producto, sedeIdParam: string) => {
    if (sedeIdParam === "todas") {
      return producto.sedes.reduce((sum, s) => sum + s.stock, 0)
    }
    const sede = producto.sedes.find(s => s.sede.id === sedeIdParam)
    return sede?.stock || 0
  }

  const puedeEditarProducto = (producto: Producto) => {
    if (esAdmin) return true
    return producto.sedes.some(s => s.sede.id === sedeUsuario)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando productos...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: '1.5rem',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            margin: 0
          }}>
            {esAdmin ? `Productos (${productosFiltrados.length})` : `Productos de Mi Sede (${productosFiltrados.length})`}
          </h1>
          {!esAdmin && (
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {session?.user?.sedeName}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          {!esAdmin && (
            <button
              onClick={handleAbrirConsulta}
              style={{
                padding: isMobile ? '0.75rem 1.5rem' : '0.75rem 2rem',
                backgroundColor: '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              🔍 Consultar Stock de Otras Sedes
            </button>
          )}
          {esAdmin && (
            <button
              onClick={handleNuevoProducto}
              style={{
                padding: isMobile ? '0.75rem 1.5rem' : '0.75rem 2rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              + Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : esAdmin ? '2fr 1fr 1fr auto auto' : '2fr 1fr auto auto',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Buscar por nombre o código (mínimo 3 caracteres)..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPaginaActual(1)
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                buscarProductos()
              }
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.95rem'
            }}
          />

          <select
            value={categoriaFiltro}
            onChange={(e) => {
              setCategoriaFiltro(e.target.value)
              setPaginaActual(1)
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.95rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>

          {esAdmin && (
            <select
              value={sedeFiltro}
              onChange={(e) => {
                setSedeFiltro(e.target.value)
                setPaginaActual(1)
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="todas">Todas las sedes</option>
              {sedes.map(sede => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
          )}

          <button
            onClick={buscarProductos}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? '⏳ Buscando...' : '🔍 Buscar'}
          </button>

          {hasSearched && (
            <button
              onClick={limpiarBusqueda}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              🗑️ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de productos */}
      {!hasSearched ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            Buscar Productos
          </div>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0 }}>
            Ingresa al menos 3 caracteres en el campo de búsqueda y presiona "Buscar" para encontrar productos
          </p>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '2rem 1rem' : '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>📦</p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', margin: '0 0 0.5rem 0' }}>
            No se encontraron productos
          </h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Intenta con otra búsqueda o filtro
          </p>
        </div>
      ) : isMobile ? (
        // Vista móvil - Cards
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {productosPaginados.map((producto) => {
              const stock = getStockDeMiSede(producto)
              return (
                <div
                  key={producto.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div onClick={() => handleVerDetalle(producto)} style={{ cursor: 'pointer' }}>
                    {producto.imagenes && producto.imagenes.length > 0 && (
                      <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
                        <img src={producto.imagenes[0]} alt={producto.nombre} style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '6px' }} />
                        {producto.imagenes.length > 1 && (
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                          }}>
                            +{producto.imagenes.length - 1}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      {producto.codigo}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      {producto.nombre}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                      {producto.subcategoria.categoria.nombre}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Precio</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2563eb' }}>
                          S/ {Number(producto.precioVenta).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Stock</div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          color: stock > 10 ? '#10b981' : stock > 0 ? '#f59e0b' : '#ef4444'
                        }}>
                          {stock}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginación móvil */}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                disabled={paginaActual === 1}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: paginaActual === 1 ? '#d1d5db' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                ← Anterior
              </button>

              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Página {paginaActual} de {totalPaginas}
              </span>

              <button
                onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual === totalPaginas}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: paginaActual === totalPaginas ? '#d1d5db' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      ) : (
        // Vista escritorio - Tabla
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Imagen</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Código</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Producto</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Categoría</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>P. Compra</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>P. Venta</th>
                  {esAdmin ? (
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Stock Total</th>
                  ) : (
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Stock</th>
                  )}
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosPaginados.map((producto) => {
                  const stock = getStockDeMiSede(producto)
                  return (
                    <tr
                      key={producto.id}
                      style={{ borderBottom: '1px solid #e5e7eb' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <td style={{ padding: '1rem' }}>
                        {producto.imagenes && producto.imagenes.length > 0 ? (
                          <div style={{ position: 'relative' }}>
                            <img src={producto.imagenes[0]} alt={producto.nombre} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                            {producto.imagenes.length > 1 && (
                              <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '2px 4px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold'
                              }}>
                                +{producto.imagenes.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ width: '50px', height: '50px', backgroundColor: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📦</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {producto.codigo}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                        {producto.nombre}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {producto.subcategoria.categoria.nombre}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.95rem', textAlign: 'right', color: '#6b7280' }}>
                        S/ {Number(producto.precioCompra).toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.95rem', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                        S/ {Number(producto.precioVenta).toFixed(2)}
                      </td>

                      {/* Admin ve stock total, usuario ve solo su sede */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: stock > 10 ? '#d1fae5' : stock > 0 ? '#fef3c7' : '#fee2e2',
                          color: stock > 10 ? '#065f46' : stock > 0 ? '#92400e' : '#991b1b'
                        }}>
                          {stock}
                        </span>
                      </td>
                      
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleVerDetalle(producto)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            👁️ Ver
                          </button>
                          {esAdmin && (
                            <button
                              onClick={() => handleEliminar(producto.id, producto.nombre)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación escritorio */}
      {!isMobile && totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
            disabled={paginaActual === 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: paginaActual === 1 ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            ← Anterior
          </button>

          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Página {paginaActual} de {totalPaginas}
          </span>

          <button
            onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
            disabled={paginaActual === totalPaginas}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: paginaActual === totalPaginas ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal de CONSULTA DE STOCK */}
      {mostrarModalConsulta && (
        <div
          onClick={() => setMostrarModalConsulta(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              🔍 Consultar Stock de Otras Sedes
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busquedaConsulta}
                onChange={(e) => setBusquedaConsulta(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />

              <select
                value={sedeConsulta}
                onChange={(e) => setSedeConsulta(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="todas">Todas las sedes</option>
                {sedes.filter(s => s.id !== sedeUsuario).map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Código</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Producto</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {productosConsulta.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        No se encontraron productos
                      </td>
                    </tr>
                  ) : (
                    productosConsulta.map((producto) => {
                      const stock = getStockPorSede(producto, sedeConsulta)
                      return (
                        <tr key={producto.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {producto.codigo}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.95rem', fontWeight: '500', color: '#111827' }}>
                            {producto.nombre}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              backgroundColor: stock > 10 ? '#d1fae5' : stock > 0 ? '#fef3c7' : '#fee2e2',
                              color: stock > 10 ? '#065f46' : stock > 0 ? '#92400e' : '#991b1b'
                            }}>
                              {stock}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                onClick={() => setMostrarModalConsulta(false)}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de NUEVO PRODUCTO */}
      {mostrarModalNuevo && (
        <div
          onClick={() => !guardando && setMostrarModalNuevo(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Nuevo Producto
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Categoría *
              </label>
              <select
                value={formNuevo.categoriaId}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Subcategoría *
              </label>
              <select
                value={formNuevo.subcategoriaId}
                onChange={(e) => handleSubcategoriaChange(e.target.value)}
                disabled={!formNuevo.categoriaId}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  backgroundColor: 'white',
                  cursor: formNuevo.categoriaId ? 'pointer' : 'not-allowed',
                  opacity: formNuevo.categoriaId ? 1 : 0.5
                }}
              >
                <option value="">Selecciona una subcategoría</option>
                {subcategoriasDisponibles.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Código del producto (generado automáticamente)
              </label>
              <input
                type="text"
                value={formNuevo.codigo}
                readOnly
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  backgroundColor: '#f9fafb',
                  cursor: 'not-allowed',
                  color: formNuevo.codigo ? '#111827' : '#9ca3af'
                }}
                placeholder="Selecciona una subcategoría para generar el código"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Imágenes del producto (máximo 2)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImagenChange(e, true)}
                disabled={subiendoImagen || formNuevo.imagenes.length >= 2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  opacity: formNuevo.imagenes.length >= 2 ? 0.5 : 1,
                  cursor: formNuevo.imagenes.length >= 2 ? 'not-allowed' : 'pointer'
                }}
              />
              {subiendoImagen && (
                <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.5rem' }}>
                  Subiendo imagen...
                </p>
              )}
              {formNuevo.imagenes.length >= 2 && (
                <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                  Has alcanzado el límite de 2 imágenes
                </p>
              )}
              {formNuevo.imagenes.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {formNuevo.imagenes.map((img, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={img} alt={`Preview ${index + 1}`} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #e5e7eb' }} />
                      <button
                        type="button"
                        onClick={() => handleEliminarImagen(index, true)}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre del producto *
              </label>
              <input
                type="text"
                value={formNuevo.nombre}
                onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                placeholder="Ej: Laptop Dell Inspiron 15"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Descripción
              </label>
              <textarea
                value={formNuevo.descripcion}
                onChange={(e) => setFormNuevo({ ...formNuevo, descripcion: e.target.value })}
                rows={3}
                placeholder="Descripción detallada del producto"
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Garantía
              </label>
              <input
                type="text"
                value={formNuevo.garantia}
                onChange={(e) => setFormNuevo({ ...formNuevo, garantia: e.target.value })}
                placeholder="Ej: 1 año, 6 meses"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Precio de Compra *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formNuevo.precioCompra}
                  onChange={(e) => setFormNuevo({ ...formNuevo, precioCompra: e.target.value })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Precio de Venta *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formNuevo.precioVenta}
                  onChange={(e) => setFormNuevo({ ...formNuevo, precioVenta: e.target.value })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Stock mínimo *
              </label>
              <input
                type="number"
                value={formNuevo.stockMin}
                onChange={(e) => setFormNuevo({ ...formNuevo, stockMin: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Sede *
                </label>
                <select
                  value={formNuevo.sedeId}
                  onChange={(e) => setFormNuevo({ ...formNuevo, sedeId: e.target.value })}
                  disabled={!esAdmin}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    backgroundColor: esAdmin ? 'white' : '#f9fafb',
                    cursor: esAdmin ? 'pointer' : 'not-allowed'
                  }}
                >
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
                {!esAdmin && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Solo puedes agregar productos a tu sede
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Stock inicial
                </label>
                <input
                  type="number"
                  value={formNuevo.stockInicial}
                  onChange={(e) => setFormNuevo({ ...formNuevo, stockInicial: e.target.value })}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setMostrarModalNuevo(false)}
                disabled={guardando}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearProducto}
                disabled={guardando}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: guardando ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              >
                {guardando ? 'Creando...' : '💾 Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle/edición */}
      {mostrarModal && productoSeleccionado && (
        <div
          onClick={() => !modoEdicion && setMostrarModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {modoEdicion ? 'Editar Producto' : 'Detalle del Producto'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!modoEdicion && esAdmin && (
                  <button
                    onClick={handleEditar}
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
                    ✏️ Editar
                  </button>
                )}
                <button
                  onClick={() => {
                    setMostrarModal(false)
                    setModoEdicion(false)
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb'
                    e.currentTarget.style.color = '#374151'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.color = '#6b7280'
                  }}
                  title="Cerrar"
                >
                  ×
                </button>
              </div>
            </div>

            {productoSeleccionado.imagenes && productoSeleccionado.imagenes.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {productoSeleccionado.imagenes.map((img, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={img} alt={`${productoSeleccionado.nombre} ${index + 1}`} style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '3px solid #e5e7eb' }} />
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}/{productoSeleccionado.imagenes.length}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Código</p>
              <p style={{ fontWeight: '600' }}>{productoSeleccionado.codigo}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Categoría</p>
              <p style={{ fontWeight: '600' }}>
                {productoSeleccionado.subcategoria.categoria.nombre} → {productoSeleccionado.subcategoria.nombre}
              </p>
            </div>

            {modoEdicion && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Imágenes del producto (máximo 2)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImagenChange(e, false)}
                  disabled={subiendoImagen || formData.imagenes.length >= 2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    opacity: formData.imagenes.length >= 2 ? 0.5 : 1,
                    cursor: formData.imagenes.length >= 2 ? 'not-allowed' : 'pointer'
                  }}
                />
                {subiendoImagen && (
                  <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.5rem' }}>
                    Subiendo imagen...
                  </p>
                )}
                {formData.imagenes.length >= 2 && (
                  <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                    Has alcanzado el límite de 2 imágenes
                  </p>
                )}
                {formData.imagenes.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {formData.imagenes.map((img, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img src={img} alt={`Preview ${index + 1}`} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #e5e7eb' }} />
                        <button
                          type="button"
                          onClick={() => handleEliminarImagen(index, false)}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Nombre del producto *
              </label>
              {modoEdicion ? (
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              ) : (
                <p style={{ fontWeight: '600' }}>{productoSeleccionado.nombre}</p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Descripción
              </label>
              {modoEdicion ? (
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <p>{productoSeleccionado.descripcion || 'Sin descripción'}</p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Garantía
              </label>
              {modoEdicion ? (
                <input
                  type="text"
                  value={formData.garantia}
                  onChange={(e) => setFormData({ ...formData, garantia: e.target.value })}
                  placeholder="Ej: 1 año, 6 meses"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              ) : (
                <p>{productoSeleccionado.garantia || 'Sin garantía'}</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Precio de Compra *
                </label>
                {modoEdicion ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precioCompra}
                    onChange={(e) => setFormData({ ...formData, precioCompra: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.95rem'
                    }}
                  />
                ) : (
                  <p style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                    S/ {Number(productoSeleccionado.precioCompra).toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Precio de Venta *
                </label>
                {modoEdicion ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.95rem'
                    }}
                  />
                ) : (
                  <p style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#2563eb' }}>
                    S/ {Number(productoSeleccionado.precioVenta).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Stock mínimo *
              </label>
              {modoEdicion ? (
                <input
                  type="number"
                  value={formData.stockMin}
                  onChange={(e) => setFormData({ ...formData, stockMin: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              ) : (
                <p>{productoSeleccionado.stockMin} unidades</p>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                {esAdmin ? 'Stock por Sede' : 'Stock en Mi Sede'}
              </p>
              {productoSeleccionado.sedes.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fef3c7',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#92400e',
                  fontSize: '0.875rem'
                }}>
                  Este producto no tiene stock en ninguna sede
                </div>
              ) : (
                productoSeleccionado.sedes
                  .filter(sedeItem => esAdmin || sedeItem.sede.id === sedeUsuario)
                  .map((sedeItem) => {
                    const sedeId = sedeItem.sede.id
                    const sedeNombre = sedeItem.sede.nombre
                    const esSedeUsuario = sedeId === sedeUsuario

                    return (
                      <div
                        key={sedeId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          backgroundColor: esSedeUsuario ? '#dbeafe' : '#f9fafb',
                          borderRadius: '6px',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <span>
                          {sedeNombre}
                          {esSedeUsuario && !esAdmin && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#2563eb' }}>
                              (Tu sede)
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 'bold' }}>{sedeItem.stock} unidades</span>
                      </div>
                    )
                  })
              )}
              {!esAdmin && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  💡 Usa el botón "Consultar Stock de Otras Sedes" para ver stock de otras ubicaciones
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {modoEdicion ? (
                <>
                  <button
                    onClick={handleCancelarEdicion}
                    disabled={guardando}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: guardando ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarEdicion}
                    disabled={guardando}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: guardando ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: guardando ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600'
                    }}
                  >
                    {guardando ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ingreso Rápido */}
      {modalIngreso && (
        <ModalIngresoStock
          producto={modalIngreso}
          sedeId={sedeUsuario || sedes[0]?.id || ''}
          onClose={() => setModalIngreso(null)}
          onSuccess={() => cargarDatosIniciales()}
        />
      )}
    </div>
  )
}