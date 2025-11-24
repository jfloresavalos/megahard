"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// Asegúrate de que la ruta a tu componente Modal genérico sea correcta
import Modal from "./Modal"
import ModalBuscarProducto from "../[id]/components/ModalBuscarProducto" 

// Definimos el tipo para el objeto Servicio (puedes moverlo a un archivo de types)
interface Servicio {
  id: string
  sedeId: string
  numeroServicio: string
  // ...otros campos que puedas necesitar
}

// Definimos el tipo para un Producto (simplificado)
interface Producto {
  id: string
  nombre: string
  precioVenta: number
  stockDisponible: number
}

// Definimos el tipo para un Repuesto seleccionado
interface Repuesto {
  productoId: string
  productoNombre: string
  cantidad: number
  precioUnit: number
  subtotal: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  servicio: Servicio
}

export default function ModalMarcarReparado({ isOpen, onClose, servicio }: Props) {
  const router = useRouter()

  // --- Estados del Formulario ---
  const [diagnostico, setDiagnostico] = useState("")
  const [solucion, setSolucion] = useState("")

  // --- Estados de Fotos ---
  const [fotos, setFotos] = useState<File[]>([])
  const [previsualizaciones, setPrevisualizaciones] = useState<string[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)

  // --- Estados de Repuestos (Fase 4) ---
  const [repuestos, setRepuestos] = useState<Repuesto[]>([])
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState("")
  const [cargandoProductos, setCargandoProductos] = useState(false)
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)

  // --- Estados de Carga y Error ---
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Efecto para buscar productos cuando el usuario escribe
  useEffect(() => {
    if (busquedaProducto.length > 2) {
      cargarProductos()
    } else {
      setProductosDisponibles([])
    }
  }, [busquedaProducto])

  // Limpiar el modal cada vez que se abre
  useEffect(() => {
    if (isOpen) {
      setDiagnostico("")
      setSolucion("")
      setFotos([])
      setPrevisualizaciones([])
      setRepuestos([])
      setBusquedaProducto("")
      setProductosDisponibles([])
      setLoading(false)
      setError(null)
    }
  }, [isOpen])

  // --- LÓGICA DE FOTOS (Reutilizada de .../nuevo/page.tsx) ---
  const handleSeleccionarFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || [])
    if (fotos.length + archivos.length > 5) {
      alert("⚠️ Máximo 5 fotos permitidas")
      return
    }
    setFotos([...fotos, ...archivos])
    archivos.forEach(archivo => {
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
        formData.append("file", foto)
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        const data = await response.json()
        if (data.success) {
          urlsFotos.push(data.url)
        }
      }
      return urlsFotos
    } catch (error) {
      console.error("Error al subir fotos:", error)
      return []
    } finally {
      setSubiendoFotos(false)
    }
  }

  // --- LÓGICA DE REPUESTOS (Fase 4) ---
  const cargarProductos = async () => {
    setCargandoProductos(true)
    try {
      // Usamos la sede del SERVICIO para buscar stock
      const response = await fetch(`/api/productos?sedeId=${servicio.sedeId}&search=${busquedaProducto}`)
      const data = await response.json()
      if (data.success) {
        // Filtramos productos que tienen stock
        setProductosDisponibles(data.productos.filter((p: Producto) => p.stockDisponible > 0))
      }
    } catch (error) {
      console.error("Error cargando productos:", error)
    } finally {
      setCargandoProductos(false)
    }
  }

  const agregarRepuesto = (producto: any, cantidad: number, precioFinal: number) => {
    // Evitar duplicados
    if (repuestos.find(r => r.productoId === producto.id)) {
      alert("⚠️ Este repuesto ya está en la lista.")
      return
    }

    setRepuestos([...repuestos, {
      productoId: producto.id,
      productoNombre: `${producto.codigo} - ${producto.nombre}`,
      cantidad: cantidad,
      precioUnit: precioFinal,
      subtotal: precioFinal * cantidad,
    }])
  }
  
  const actualizarRepuesto = (index: number, cantidad: number, precio: number) => {
    // ✅ Validar cantidad mínima
    if (cantidad < 1) {
      alert("⚠️ La cantidad debe ser al menos 1")
      return
    }

    // ✅ Validar precio mínimo
    if (precio < 0) {
      alert("⚠️ El precio no puede ser negativo")
      return
    }

    const nuevosRepuestos = [...repuestos]
    nuevosRepuestos[index].cantidad = cantidad
    nuevosRepuestos[index].precioUnit = precio
    nuevosRepuestos[index].subtotal = cantidad * precio
    setRepuestos(nuevosRepuestos)
  }

  const eliminarRepuesto = (index: number) => {
    setRepuestos(repuestos.filter((_, i) => i !== index))
  }

  // --- LÓGICA PRINCIPAL (SUBMIT) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diagnostico.trim() || !solucion.trim()) {
      setError("El diagnóstico y la solución son obligatorios.")
      return
    }

    // Validar stock de repuestos (simplificado)
    for (const repuesto of repuestos) {
        // Esta es una validación simple, idealmente se re-valida en el backend (lo cual hicimos)
        const productoEnLista = productosDisponibles.find(p => p.id === repuesto.productoId);
        const stockDisponible = productoEnLista ? productoEnLista.stockDisponible : 0; // Asumimos 0 si no está en la lista cargada
        
        // Hacemos una comprobación simple en el cliente
        if (repuesto.cantidad > stockDisponible && productoEnLista) {
             setError(`Stock insuficiente para ${repuesto.productoNombre}. Disponible: ${stockDisponible}`)
             return
        }
        // Si no está en la lista (raro), dejamos que el backend lo valide
    }


    setLoading(true)
    setError(null)

    try {
      // 1. Subir fotos
      const fotosUrls = await subirFotos()

      // 2. Preparar datos
      const dataParaApi = {
        diagnostico,
        solucion,
        fotosDespues: fotosUrls,
        repuestosUsados: repuestos,
      }

      // 3. Llamar a la nueva API
      const response = await fetch(`/api/servicios/${servicio.id}/marcar-reparado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataParaApi),
      })

      const data = await response.json()

      if (data.success) {
        alert("✅ Servicio marcado como REPARADO")
        router.refresh() // Recargar la página de detalle
        onClose() // Cerrar el modal
      } else {
        setError(data.error || "Error al actualizar el servicio")
      }
    } catch (error) {
      console.error(error)
      setError("Error de conexión. Inténtelo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Marcar como Reparado: ${servicio.numeroServicio}`}
    >
      <form onSubmit={handleSubmit}>
        {/* --- Diagnóstico y Solución --- */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: '600' }}>Diagnóstico Técnico *</label>
          <textarea
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            rows={3}
            required
            placeholder="Qué problema se encontró..."
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: '600' }}>Solución Aplicada *</label>
          <textarea
            value={solucion}
            onChange={(e) => setSolucion(e.target.value)}
            rows={3}
            required
            placeholder="Qué se hizo para repararlo..."
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>

        {/* --- Lógica de Repuestos (Fase 4) --- */}
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
            🔩 Repuestos Utilizados (Opcional)
          </label>

          {/* INPUT CON LUPA PARA ABRIR MODAL */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Buscar repuesto del inventario..."
              readOnly
              onClick={() => setModalBuscarOpen(true)}
              style={{
                width: '100%',
                padding: '0.75rem 3rem 0.75rem 1rem',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                backgroundColor: 'white',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setModalBuscarOpen(true)}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                fontSize: '1.1rem',
              }}
              title="Buscar producto"
            >
              🔍
            </button>
          </div>

          {/* Lista de repuestos agregados */}
          {repuestos.length > 0 && (
            <div style={{ marginTop: '1rem', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              {repuestos.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '1rem',
                  borderBottom: i < repuestos.length - 1 ? '1px solid #e5e7eb' : 'none',
                  backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ flex: '1 1 150px', fontWeight: '600' }}>{r.productoNombre}</span>
                  <input
                    type="number"
                    value={r.cantidad}
                    onChange={(e) => actualizarRepuesto(i, Number(e.target.value), r.precioUnit)}
                    min="1"
                    style={{ width: '60px', padding: '4px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={r.precioUnit}
                    onChange={(e) => actualizarRepuesto(i, r.cantidad, Number(e.target.value))}
                    min="0"
                    step="0.01"
                    style={{ width: '80px', padding: '4px', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                  <span style={{width: '70px', textAlign: 'right', fontWeight: '700'}}>S/ {r.subtotal.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => eliminarRepuesto(i)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Lógica de Fotos --- */}
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <label style={{ fontWeight: '600' }}>Fotos del Resultado (Opcional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleSeleccionarFotos}
            disabled={fotos.length >= 5}
            style={{ display: 'block', marginTop: '8px' }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            {previsualizaciones.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt="preview" height="80" width="80" style={{ objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                <button type="button" onClick={() => eliminarFoto(i)} style={{ position: 'absolute', top: 0, right: 0, color: 'red', background: 'white', border: '1px solid red', borderRadius: '50%', cursor: 'pointer', lineHeight: '1', width: '20px', height: '20px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* --- Botones de Acción --- */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', textAlign: 'right' }}>
          {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'left' }}>{error}</div>}
          <button
            type="button"
            onClick={onClose}
            disabled={loading || subiendoFotos}
            style={{ padding: '10px 15px', marginRight: '10px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || subiendoFotos}
            style={{ padding: '10px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Guardando...' : subiendoFotos ? '📸 Subiendo...' : 'Confirmar Reparación'}
          </button>
        </div>
      </form>

      {/* MODAL BUSCAR PRODUCTO */}
      <ModalBuscarProducto
        isOpen={modalBuscarOpen}
        onClose={() => setModalBuscarOpen(false)}
        sedeId={servicio.sedeId}
        onSeleccionar={agregarRepuesto}
        tituloModal="Buscar Repuesto"
      />
    </Modal>
  )
}