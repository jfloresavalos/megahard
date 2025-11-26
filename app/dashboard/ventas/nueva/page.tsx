"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Toast from "@/components/Toast"

interface Cliente {
  id: string
  nombre: string
  numeroDoc: string
  tipoDoc: string
  telefono: string | null
}

interface Sede {
  id: string
  nombre: string
}


interface MetodoPago {
  id: string
  nombre: string
}

interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  precioVenta: number
  stockMin: number
  stockDisponible: number
  stockBajo: boolean
  subcategoria: {
    nombre: string
    categoria: {
      nombre: string
    }
  }
}

interface ItemVenta {
  productoId: string
  producto: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
}

interface ToastState {
  mostrar: boolean
  mensaje: string
  tipo: 'success' | 'error' | 'warning' | 'info'
}

export default function NuevaVentaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [clienteGenerico, setClienteGenerico] = useState<Cliente | null>(null)
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [hasSearchedProductos, setHasSearchedProductos] = useState(false)

  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [tipoDocBusqueda, setTipoDocBusqueda] = useState("DNI")
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null)
  const [sedeId, setSedeId] = useState("")
  const [tipoComprobante, setTipoComprobante] = useState("BOLETA")
  const [metodoPago, setMetodoPago] = useState("")
  const [items, setItems] = useState<ItemVenta[]>([])
  const [guardando, setGuardando] = useState(false)
  const [ventaCreada, setVentaCreada] = useState<any>(null)
  const [mostrarModalComprobante, setMostrarModalComprobante] = useState(false)

  // Modal productos
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false)
  const [busquedaProducto, setBusquedaProducto] = useState("")

  // Modal crear cliente
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    tipoDoc: 'DNI',
    nombre: '',
    numeroDoc: '',
    telefono: '',
    razonSocial: '',
    direccion: '',
    email: ''
  })

  const [toast, setToast] = useState<ToastState>({
    mostrar: false,
    mensaje: '',
    tipo: 'info'
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [session])

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ mostrar: true, mensaje, tipo })
  }

  const cargarDatos = async () => {
    try {
      const fetchPromises = [
        fetch('/api/clientes'),
        fetch('/api/metodos-pago')
      ]

      if (session?.user?.rol === 'admin') {
        fetchPromises.push(fetch('/api/sedes'))
      }

      const responses = await Promise.all(fetchPromises)
      const [clientesData, metodoPagoData, sedesData] = await Promise.all(
        responses.map(r => r.json())
      )

      if (clientesData.success) {
        setClientes(clientesData.clientes)
        const generico = clientesData.clientes.find(
          (c: Cliente) => c.numeroDoc === '00000000'
        )
        setClienteGenerico(generico || null)
      }

      if (metodoPagoData.success) {
        setMetodosPago(metodoPagoData.metodosPago)
        if (metodoPagoData.metodosPago.length > 0) {
          setMetodoPago(metodoPagoData.metodosPago[0].id)
        }
      }

      if (sedesData && sedesData.success) {
        setSedes(sedesData.sedes)
      }

      if (session?.user?.rol === 'usuario' && session?.user?.sedeId) {
        setSedeId(session.user.sedeId)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarToast('Error al cargar los datos', 'error')
    } finally {
      setLoadingClientes(false)
    }
  }

  // Función para buscar productos manualmente
  const buscarProductos = async () => {
    // Validar que haya al menos 3 caracteres en la búsqueda
    if (busquedaProducto.trim().length < 3) {
      mostrarToast('Ingrese al menos 3 caracteres para buscar productos', 'warning')
      return
    }

    try {
      setLoadingProductos(true)
      setHasSearchedProductos(true)

      // Determinar sede a buscar
      const sedeConsulta = session?.user?.rol === 'admin' ? sedeId : session?.user?.sedeId

      if (!sedeConsulta) {
        mostrarToast('Debe seleccionar una sede primero', 'warning')
        setLoadingProductos(false)
        return
      }

      const response = await fetch(`/api/productos?sedeId=${sedeConsulta}`)
      const data = await response.json()

      if (data.success) {
        setProductos(data.productos)
        console.log(`${data.productos.length} productos cargados`)
      } else {
        mostrarToast('Error al cargar productos', 'error')
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
      mostrarToast('Error al cargar productos', 'error')
    } finally {
      setLoadingProductos(false)
    }
  }

  const limpiarBusquedaProductos = () => {
    setBusquedaProducto('')
    setProductos([])
    setHasSearchedProductos(false)
  }

  const handleBuscarCliente = () => {
    if (!busquedaCliente.trim()) {
      mostrarToast('Ingrese un número de documento', 'warning')
      return
    }

    // Validar formato según tipo de documento
    const numeroDoc = busquedaCliente.trim()

    if (tipoDocBusqueda === 'DNI') {
      if (!/^\d{8}$/.test(numeroDoc)) {
        mostrarToast('El DNI debe tener exactamente 8 dígitos', 'warning')
        return
      }
    } else if (tipoDocBusqueda === 'RUC') {
      if (!/^\d{11}$/.test(numeroDoc)) {
        mostrarToast('El RUC debe tener exactamente 11 dígitos', 'warning')
        return
      }
    } else if (tipoDocBusqueda === 'CE') {
      if (!/^\d{9}$/.test(numeroDoc)) {
        mostrarToast('El CE debe tener exactamente 9 dígitos', 'warning')
        return
      }
    } else if (tipoDocBusqueda === 'PASAPORTE') {
      if (!/^[A-Za-z0-9]{7,12}$/.test(numeroDoc)) {
        mostrarToast('El Pasaporte debe tener entre 7 y 12 caracteres alfanuméricos', 'warning')
        return
      }
    }

    const cliente = clientes.find(c => c.numeroDoc === numeroDoc && c.tipoDoc === tipoDocBusqueda)

    if (cliente) {
      if (cliente.numeroDoc === '00000000') {
        mostrarToast('Use el botón "Sin DNI" para ventas sin DNI', 'warning')
        return
      }
      setClienteEncontrado(cliente)
      mostrarToast('Cliente encontrado', 'success')
    } else {
      setClienteEncontrado(null)
      mostrarToast('Cliente no encontrado', 'info')
    }
  }

  const handleUsarClienteGenerico = () => {
    if (clienteGenerico) {
      setClienteEncontrado(clienteGenerico)
      setBusquedaCliente('')
      mostrarToast('Usando cliente genérico', 'info')
    }
  }

  const handleLimpiarCliente = () => {
    setClienteEncontrado(null)
    setBusquedaCliente('')
  }

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.numeroDoc.trim()) {
      mostrarToast('Nombre y documento son obligatorios', 'warning')
      return
    }

    // Validar formato según tipo de documento
    const numeroDoc = nuevoCliente.numeroDoc.trim()

    if (nuevoCliente.tipoDoc === 'DNI') {
      if (!/^\d{8}$/.test(numeroDoc)) {
        mostrarToast('El DNI debe tener exactamente 8 dígitos', 'warning')
        return
      }
    } else if (nuevoCliente.tipoDoc === 'RUC') {
      if (!/^\d{11}$/.test(numeroDoc)) {
        mostrarToast('El RUC debe tener exactamente 11 dígitos', 'warning')
        return
      }
    } else if (nuevoCliente.tipoDoc === 'CE') {
      if (!/^\d{9}$/.test(numeroDoc)) {
        mostrarToast('El CE debe tener exactamente 9 dígitos', 'warning')
        return
      }
    } else if (nuevoCliente.tipoDoc === 'PASAPORTE') {
      if (!/^[A-Za-z0-9]{7,12}$/.test(numeroDoc)) {
        mostrarToast('El Pasaporte debe tener entre 7 y 12 caracteres alfanuméricos', 'warning')
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
        mostrarToast('Cliente creado correctamente', 'success')
        setClientes([...clientes, data.cliente])
        setClienteEncontrado(data.cliente)
        setBusquedaCliente(data.cliente.numeroDoc)
        setTipoDocBusqueda(data.cliente.tipoDoc)
        setMostrarModalCliente(false)
        setNuevoCliente({
          tipoDoc: 'DNI',
          nombre: '',
          numeroDoc: '',
          telefono: '',
          razonSocial: '',
          direccion: '',
          email: ''
        })
      } else {
        mostrarToast(data.error || 'Error al crear cliente', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al crear cliente', 'error')
    }
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase())
  )

  const handleAgregarProducto = (producto: Producto) => {
    const existe = items.find(item => item.productoId === producto.id)

    if (existe) {
      mostrarToast('Producto ya agregado', 'warning')
      return
    }

    const nuevoItem: ItemVenta = {
      productoId: producto.id,
      producto,
      cantidad: 1,
      precioUnitario: Number(producto.precioVenta),
      subtotal: Number(producto.precioVenta)
    }

    setItems([...items, nuevoItem])
    mostrarToast('Producto agregado', 'success')
  }

  const handleCambiarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad < 1) return
    setItems(items.map(item => {
      if (item.productoId === productoId) {
        return {
          ...item,
          cantidad,
          subtotal: cantidad * item.precioUnitario
        }
      }
      return item
    }))
  }

  const handleCambiarPrecio = (productoId: string, precio: number) => {
    if (precio < 0) return
    setItems(items.map(item => {
      if (item.productoId === productoId) {
        return {
          ...item,
          precioUnitario: precio,
          subtotal: item.cantidad * precio
        }
      }
      return item
    }))
  }

  const handleEliminarItem = (productoId: string) => {
    setItems(items.filter(item => item.productoId !== productoId))
  }

  const calcularTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const handleGuardarVenta = async () => {
    if (!clienteEncontrado) {
      mostrarToast('Debe seleccionar un cliente', 'warning')
      return
    }

    if (items.length === 0) {
      mostrarToast('Debe agregar al menos un producto', 'warning')
      return
    }

    if (!metodoPago) {
      mostrarToast('Debe seleccionar un método de pago', 'warning')
      return
    }

    if (!session?.user?.id) {
      mostrarToast('No se pudo identificar el usuario', 'error')
      return
    }

    const sedeVenta = session.user.rol === 'admin' ? sedeId : session.user.sedeId

    if (!sedeVenta) {
      mostrarToast('Debe seleccionar una sede', 'warning')
      return
    }

    setGuardando(true)

    try {
      const ventaData = {
        clienteId: clienteEncontrado.id,
        usuarioId: session.user.id,
        sedeId: sedeVenta,
        tipoComprobante,
        metodoPago,
        items: items.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario
        }))
      }

      console.log('Enviando venta:', ventaData)

      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ventaData)
      })

      const data = await response.json()

      if (data.success) {
        mostrarToast('Venta registrada correctamente', 'success')
        setVentaCreada(data.venta)
        setMostrarModalComprobante(true)
        // Limpiar formulario
        setClienteEncontrado(null)
        setBusquedaCliente('')
        setItems([])
      } else {
        mostrarToast(data.error || 'Error al registrar venta', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarToast('Error al registrar venta', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '0', paddingBottom: isMobile ? '100px' : '2rem' }}>
      {toast.mostrar && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast({ ...toast, mostrar: false })}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/dashboard/ventas')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '0.5rem',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Volver a Ventas
        </button>
        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          margin: 0
        }}>
          Nueva Venta
        </h1>
      </div>

      {/* Contenido principal */}
      <div style={{
        backgroundColor: 'white',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        {/* Cliente */}
        <div style={{
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: '700',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            Cliente
          </h3>

          {!clienteEncontrado ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '90px 1fr' : 'auto 1fr auto',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <select
                  value={tipoDocBusqueda}
                  onChange={(e) => setTipoDocBusqueda(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="CE">CE</option>
                  <option value="PASAPORTE">Pasap.</option>
                </select>
                <input
                  type="text"
                  placeholder={`${tipoDocBusqueda}...`}
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBuscarCliente()}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: isMobile ? '0.8rem' : '0.875rem'
                  }}
                />
                {!isMobile && (
                  <button
                    onClick={handleBuscarCliente}
                    style={{
                      padding: '0.625rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Buscar
                  </button>
                )}
              </div>
              {isMobile && (
                <button
                  onClick={handleBuscarCliente}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Buscar Cliente
                </button>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setMostrarModalCliente(true)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  + Crear
                </button>
                {clienteGenerico && (
                  <button
                    onClick={handleUsarClienteGenerico}
                    style={{
                      padding: '0.5rem 0.875rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}
                  >
                    Sin DNI
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '0.75rem',
              backgroundColor: clienteEncontrado.numeroDoc === '00000000' ? '#f3f4f6' : '#f0f9ff',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                  {clienteEncontrado.nombre}
                </div>
                {clienteEncontrado.numeroDoc !== '00000000' && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {clienteEncontrado.numeroDoc}
                  </div>
                )}
              </div>
              <button
                onClick={handleLimpiarCliente}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Sede (solo admin) */}
        {session?.user?.rol === 'admin' && (
          <div style={{
            paddingBottom: '1rem',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem'
            }}>
              Sede
            </h3>
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Seleccione...</option>
              {sedes.map(sede => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo de Comprobante */}
        <div style={{
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: '700',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            Tipo de Comprobante
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setTipoComprobante('BOLETA')}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: tipoComprobante === 'BOLETA' ? '#3b82f6' : 'white',
                color: tipoComprobante === 'BOLETA' ? 'white' : '#6b7280',
                border: `2px solid ${tipoComprobante === 'BOLETA' ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              BOLETA
            </button>
            <button
              onClick={() => setTipoComprobante('FACTURA')}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: tipoComprobante === 'FACTURA' ? '#3b82f6' : 'white',
                color: tipoComprobante === 'FACTURA' ? 'white' : '#6b7280',
                border: `2px solid ${tipoComprobante === 'FACTURA' ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              FACTURA
            </button>
          </div>
        </div>

        {/* Método de Pago */}
        <div style={{
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: '700',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            Método de Pago
          </h3>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">Seleccione...</option>
            {metodosPago.map(metodo => (
              <option key={metodo.id} value={metodo.id}>
                {metodo.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Productos */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0
            }}>
              Productos ({items.length})
            </h3>
            <button
              onClick={() => setMostrarModalProductos(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Agregar
            </button>
          </div>

          {/* Lista de productos */}
          {items.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#9ca3af',
              border: '2px dashed #e5e7eb',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0 }}>No hay productos agregados</p>
            </div>
          ) : (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {items.map((item, index) => (
                <div
                  key={item.productoId}
                  style={{
                    padding: isMobile ? '0.75rem' : '1rem',
                    borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {/* Info producto */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '0.125rem'
                        }}>
                          {item.producto.nombre}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {item.producto.codigo}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarItem(item.productoId)}
                        style={{
                          padding: '0.375rem',
                          backgroundColor: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>

                    {/* Controles */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : '80px 100px 1fr',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}>
                      <div>
                        <label style={{
                          fontSize: '0.625rem',
                          color: '#6b7280',
                          fontWeight: '600',
                          display: 'block',
                          marginBottom: '0.25rem'
                        }}>
                          Cant.
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleCambiarCantidad(item.productoId, parseInt(e.target.value) || 1)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          fontSize: '0.625rem',
                          color: '#6b7280',
                          fontWeight: '600',
                          display: 'block',
                          marginBottom: '0.25rem'
                        }}>
                          Precio
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => handleCambiarPrecio(item.productoId, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>

                      <div style={{
                        textAlign: 'right',
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#10b981'
                      }}>
                        S/ {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer flotante con total y botón */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        bottom: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        backgroundColor: 'white',
        padding: '1rem',
        borderTop: isMobile ? '1px solid #e5e7eb' : 'none',
        boxShadow: isMobile ? '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        zIndex: isMobile ? 50 : 'auto',
        borderRadius: isMobile ? '0' : '12px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>
                Total a pagar
              </div>
              <div style={{
                fontSize: isMobile ? '1.75rem' : '2rem',
                fontWeight: '700',
                color: '#10b981'
              }}>
                S/ {calcularTotal().toFixed(2)}
              </div>
            </div>
            {!isMobile && (
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                paddingLeft: '1rem',
                borderLeft: '1px solid #e5e7eb'
              }}>
                {items.length} producto{items.length !== 1 ? 's' : ''} {items.reduce((sum, item) => sum + item.cantidad, 0)} unidad{items.reduce((sum, item) => sum + item.cantidad, 0) !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          <button
            onClick={handleGuardarVenta}
            disabled={
              guardando ||
              items.length === 0 ||
              !clienteEncontrado ||
              !metodoPago ||
              (session?.user?.rol === 'admin' && !sedeId)
            }
            style={{
              padding: '1rem 2rem',
              background: guardando || items.length === 0 || !clienteEncontrado || (session?.user?.rol === 'admin' && !sedeId)
                ? '#9ca3af'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: guardando || items.length === 0 || !clienteEncontrado || (session?.user?.rol === 'admin' && !sedeId) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: isMobile ? '100%' : 'auto',
              whiteSpace: 'nowrap',
              boxShadow: guardando || items.length === 0 || !clienteEncontrado ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            {guardando ? (
              'Guardando...'
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Registrar Venta
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Productos */}
      {mostrarModalProductos && (
        <div
          onClick={() => setMostrarModalProductos(false)}
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
            padding: isMobile ? '1rem' : '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                margin: 0
              }}>
                Agregar Productos
              </h2>
              <button
                onClick={() => setMostrarModalProductos(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Búsqueda */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Buscar por nombre o código (mínimo 3 caracteres)..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      buscarProductos()
                    }
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
                <button
                  onClick={buscarProductos}
                  disabled={loadingProductos}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: loadingProductos ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingProductos ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {loadingProductos ? 'Buscando...' : 'Buscar'}
                </button>
                {hasSearchedProductos && (
                  <button
                    onClick={limpiarBusquedaProductos}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de productos */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem'
            }}>
              {!hasSearchedProductos ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>-</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Buscar Productos
                  </div>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    Ingresa al menos 3 caracteres en el campo de búsqueda y presiona "Buscar" para encontrar productos
                  </p>
                </div>
              ) : loadingProductos ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <p style={{ margin: 0 }}>Cargando productos...</p>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>-</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    No se encontraron productos
                  </div>
                  <p style={{ margin: 0 }}>Intenta con otra búsqueda</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {productosFiltrados.map((producto) => {
                    const yaAgregado = items.some(item => item.productoId === producto.id)

                    const stockDisponible = producto.stockDisponible
                    const stockBajo = producto.stockBajo

                    return (
                      <div
                        key={producto.id}
                        onClick={() => {
                          if (!yaAgregado && stockDisponible > 0) {
                            handleAgregarProducto(producto)
                            setBusquedaProducto('')
                          }
                        }}
                        style={{
                          padding: '1rem',
                          border: `1px solid ${yaAgregado ? '#d1d5db' : stockDisponible === 0 ? '#fca5a5' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: yaAgregado || stockDisponible === 0 ? 'not-allowed' : 'pointer',
                          backgroundColor: yaAgregado ? '#f9fafb' : stockDisponible === 0 ? '#fee2e2' : 'white',
                          opacity: yaAgregado || stockDisponible === 0 ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (!yaAgregado && stockDisponible > 0) {
                            e.currentTarget.style.borderColor = '#10b981'
                            e.currentTarget.style.backgroundColor = '#f0fdf4'
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!yaAgregado && stockDisponible > 0) {
                            e.currentTarget.style.borderColor = '#e5e7eb'
                            e.currentTarget.style.backgroundColor = 'white'
                          }
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '1rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '0.25rem'
                            }}>
                              {producto.nombre}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              marginBottom: '0.5rem'
                            }}>
                              {producto.codigo} {producto.subcategoria.categoria.nombre} {producto.subcategoria.nombre}
                            </div>

                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: stockDisponible === 0 ? '#fee2e2' : stockBajo ? '#fef3c7' : '#dbeafe',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: stockDisponible === 0 ? '#991b1b' : stockBajo ? '#92400e' : '#1e40af'
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                              </svg>
                              {stockDisponible === 0 ? 'Sin stock' : `Stock: ${stockDisponible} unidades`}
                              {stockBajo && stockDisponible > 0 && ' '}
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.25rem'
                          }}>
                            <div style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: yaAgregado ? '#6b7280' : stockDisponible === 0 ? '#991b1b' : '#10b981',
                              whiteSpace: 'nowrap'
                            }}>
                              {yaAgregado ? 'Agregado' : stockDisponible === 0 ? 'Sin stock' : `S/ ${Number(producto.precioVenta).toFixed(2)}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {mostrarModalCliente && (
        <div
          onClick={() => setMostrarModalCliente(false)}
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
            padding: isMobile ? '1rem' : '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem'
            }}>
              Nuevo Cliente
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Tipo de Documento *
              </label>
              <select
                value={nuevoCliente.tipoDoc}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipoDoc: e.target.value })}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">CE</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
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
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                {nuevoCliente.tipoDoc === 'RUC' ? 'Razón Social *' : 'Nombre *'}
              </label>
              <input
                type="text"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                placeholder={nuevoCliente.tipoDoc === 'RUC' ? 'Razón Social' : 'Nombre completo'}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            {nuevoCliente.tipoDoc === 'RUC' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  Razón Social (adicional)
                </label>
                <input
                  type="text"
                  value={nuevoCliente.razonSocial}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, razonSocial: e.target.value })}
                  placeholder="Razón Social adicional"
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.875rem' : '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: isMobile ? '1rem' : '0.95rem'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Teléfono
              </label>
              <input
                type="text"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                placeholder="Teléfono (opcional)"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Email
              </label>
              <input
                type="email"
                value={nuevoCliente.email}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                placeholder="Email (opcional)"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#6b7280',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}>
                Dirección
              </label>
              <input
                type="text"
                value={nuevoCliente.direccion}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                placeholder="Dirección (opcional)"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: isMobile ? '1rem' : '0.95rem'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={() => setMostrarModalCliente(false)}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 2 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCliente}
                style={{
                  padding: isMobile ? '0.875rem' : '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : '0.95rem',
                  fontWeight: '600',
                  order: isMobile ? 1 : 2
                }}
              >
                Crear Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Comprobante */}
      {mostrarModalComprobante && ventaCreada && (
        <div
          onClick={() => {
            setMostrarModalComprobante(false)
            router.push('/dashboard/ventas')
          }}
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
            padding: isMobile ? '1rem' : '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem'
            }}>

            </div>

            <h2 style={{
              fontSize: isMobile ? '1.5rem' : '1.75rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              Venta Registrada!
            </h2>

            <p style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#3b82f6',
              marginBottom: '1.5rem'
            }}>
              {ventaCreada.numeroVenta}
            </p>

            <p style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              marginBottom: '2rem'
            }}>
              Total: <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>
                S/ {Number(ventaCreada.total).toFixed(2)}
              </strong>
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  window.open(`/comprobante/${ventaCreada.id}`, '_blank')
                }}
                style={{
                  padding: '1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                Ver / Imprimir Comprobante
              </button>

              <button
                onClick={() => {
                  setMostrarModalComprobante(false)
                  router.push('/dashboard/ventas')
                }}
                style={{
                  padding: '1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Volver a Ventas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
