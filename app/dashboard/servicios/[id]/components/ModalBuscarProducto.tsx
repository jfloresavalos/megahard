"use client"

import { useState, useEffect } from "react"

interface Producto {
  id: string
  codigo: string
  nombre: string
  precioVenta: number
  stock: number
  categoria?: {
    nombre: string
  }
}

interface ModalBuscarProductoProps {
  isOpen: boolean
  onClose: () => void
  sedeId: string
  onSeleccionar: (producto: Producto, cantidad: number, precioFinal: number) => void
  tituloModal?: string
}

export default function ModalBuscarProducto({
  isOpen,
  onClose,
  sedeId,
  onSeleccionar,
  tituloModal = "Buscar Producto"
}: ModalBuscarProductoProps) {
  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [precioEditable, setPrecioEditable] = useState(0)

  // Buscar productos
  useEffect(() => {
    const buscarProductos = async () => {
      if (busqueda.length < 2) {
        setProductos([])
        return
      }

      setCargando(true)
      try {
        const response = await fetch(
          `/api/productos?busqueda=${encodeURIComponent(busqueda)}&sedeId=${sedeId}&soloConStock=true`
        )
        const data = await response.json()

        if (data.success) {
          setProductos(data.productos || [])
        }
      } catch (error) {
        console.error("Error al buscar productos:", error)
      } finally {
        setCargando(false)
      }
    }

    const timer = setTimeout(buscarProductos, 300)
    return () => clearTimeout(timer)
  }, [busqueda, sedeId])

  // Reset cuando se abre/cierra
  useEffect(() => {
    if (isOpen) {
      setBusqueda("")
      setProductos([])
      setProductoSeleccionado(null)
      setCantidad(1)
    }
  }, [isOpen])

  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto)
    setCantidad(1)
    setPrecioEditable(Number(producto.precioVenta))
  }

  const confirmarSeleccion = () => {
    if (!productoSeleccionado) return

    if (cantidad < 1) {
      alert("⚠️ La cantidad debe ser al menos 1")
      return
    }

    if (cantidad > productoSeleccionado.stock) {
      alert(`⚠️ Stock insuficiente. Disponible: ${productoSeleccionado.stock}`)
      return
    }

    if (precioEditable <= 0) {
      alert("⚠️ El precio debe ser mayor a 0")
      return
    }

    onSeleccionar(productoSeleccionado, cantidad, precioEditable)
    onClose()
  }

  const cancelar = () => {
    setProductoSeleccionado(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        padding: "1rem",
      }}
      onClick={cancelar}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          maxWidth: "700px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: "1.5rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>
            🔍 {tituloModal}
          </h2>
          <button
            onClick={cancelar}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        {/* PASO 1: BÚSQUEDA Y SELECCIÓN */}
        {!productoSeleccionado ? (
          <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
            {/* Buscador */}
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código del producto..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #3b82f6",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  outline: "none",
                }}
              />
              {busqueda.length > 0 && busqueda.length < 2 && (
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  Escribe al menos 2 caracteres para buscar...
                </p>
              )}
            </div>

            {/* Loading */}
            {cargando && (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "#6b7280" }}>🔄 Buscando productos...</p>
              </div>
            )}

            {/* Lista de productos */}
            {!cargando && productos.length > 0 && (
              <div>
                <p style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem",
                  fontWeight: "600"
                }}>
                  📦 {productos.length} producto(s) encontrado(s)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {productos.map((producto) => {
                    const stockBajo = producto.stock < 5
                    const sinStock = producto.stock === 0

                    return (
                      <div
                        key={producto.id}
                        onClick={() => !sinStock && seleccionarProducto(producto)}
                        style={{
                          border: sinStock ? "2px solid #ef4444" : stockBajo ? "2px solid #f59e0b" : "2px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "1rem",
                          cursor: sinStock ? "not-allowed" : "pointer",
                          backgroundColor: sinStock ? "#fef2f2" : "white",
                          transition: "all 0.2s",
                          opacity: sinStock ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!sinStock) {
                            e.currentTarget.style.backgroundColor = "#f0f9ff"
                            e.currentTarget.style.borderColor = "#3b82f6"
                            e.currentTarget.style.transform = "translateY(-2px)"
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.2)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sinStock) {
                            e.currentTarget.style.backgroundColor = "white"
                            e.currentTarget.style.borderColor = stockBajo ? "#f59e0b" : "#e5e7eb"
                            e.currentTarget.style.transform = "translateY(0)"
                            e.currentTarget.style.boxShadow = "none"
                          }
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                              <span style={{
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                color: "#6b7280",
                                backgroundColor: "#f3f4f6",
                                padding: "0.125rem 0.5rem",
                                borderRadius: "4px",
                              }}>
                                {producto.codigo}
                              </span>
                              {producto.categoria && (
                                <span style={{
                                  fontSize: "0.75rem",
                                  color: "#3b82f6",
                                  backgroundColor: "#eff6ff",
                                  padding: "0.125rem 0.5rem",
                                  borderRadius: "4px",
                                }}>
                                  {producto.categoria.nombre}
                                </span>
                              )}
                            </div>
                            <p style={{
                              fontSize: "1rem",
                              fontWeight: "600",
                              color: "#111827",
                              margin: "0.25rem 0",
                            }}>
                              {producto.nombre}
                            </p>
                            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                              <span style={{
                                fontSize: "0.875rem",
                                color: sinStock ? "#ef4444" : stockBajo ? "#f59e0b" : "#10b981",
                                fontWeight: "600",
                              }}>
                                {sinStock ? "⚠️ SIN STOCK" : stockBajo ? `⚠️ Stock bajo: ${producto.stock}` : `✅ Stock: ${producto.stock}`}
                              </span>
                              <span style={{
                                fontSize: "0.875rem",
                                fontWeight: "700",
                                color: "#3b82f6",
                              }}>
                                S/ {Number(producto.precioVenta).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {!sinStock && (
                            <button
                              style={{
                                backgroundColor: "#3b82f6",
                                color: "white",
                                padding: "0.5rem 1rem",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.875rem",
                              }}
                            >
                              Seleccionar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sin resultados */}
            {!cargando && busqueda.length >= 2 && productos.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</p>
                <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
                  No se encontraron productos
                </p>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Intenta con otro término de búsqueda
                </p>
              </div>
            )}

            {/* Estado inicial */}
            {!cargando && busqueda.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</p>
                <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
                  Busca un producto
                </p>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Escribe el nombre o código del producto en el buscador
                </p>
              </div>
            )}
          </div>
        ) : (
          /* PASO 2: CONFIRMAR CANTIDAD */
          <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
            <div style={{
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                Producto seleccionado:
              </p>
              <p style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827", marginBottom: "0.5rem" }}>
                {productoSeleccionado.nombre}
              </p>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem" }}>
                <span style={{ color: "#6b7280" }}>Código: <strong>{productoSeleccionado.codigo}</strong></span>
                <span style={{ color: "#10b981", fontWeight: "600" }}>Stock: {productoSeleccionado.stock}</span>
                <span style={{ color: "#3b82f6", fontWeight: "700" }}>S/ {Number(productoSeleccionado.precioVenta).toFixed(2)}</span>
              </div>
            </div>

            {/* Cantidad y Precio */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Cantidad */}
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Cantidad:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    disabled={cantidad <= 1}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      backgroundColor: cantidad <= 1 ? "#f3f4f6" : "white",
                      cursor: cantidad <= 1 ? "not-allowed" : "pointer",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: cantidad <= 1 ? "#9ca3af" : "#374151",
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      if (val > productoSeleccionado.stock) {
                        alert(`⚠️ Stock máximo: ${productoSeleccionado.stock}`)
                        return
                      }
                      setCantidad(Math.max(1, val))
                    }}
                    min="1"
                    max={productoSeleccionado.stock}
                    style={{
                      width: "80px",
                      textAlign: "center",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      padding: "0.5rem",
                      border: "2px solid #3b82f6",
                      borderRadius: "8px",
                    }}
                  />
                  <button
                    onClick={() => setCantidad(Math.min(productoSeleccionado.stock, cantidad + 1))}
                    disabled={cantidad >= productoSeleccionado.stock}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      backgroundColor: cantidad >= productoSeleccionado.stock ? "#f3f4f6" : "white",
                      cursor: cantidad >= productoSeleccionado.stock ? "not-allowed" : "pointer",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: cantidad >= productoSeleccionado.stock ? "#9ca3af" : "#374151",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Precio Unitario EDITABLE */}
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Precio Unitario:
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "#6b7280",
                  }}>S/</span>
                  <input
                    type="number"
                    value={precioEditable}
                    onChange={(e) => setPrecioEditable(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    style={{
                      width: "100%",
                      textAlign: "right",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      padding: "0.5rem 0.75rem 0.5rem 2.5rem",
                      border: "2px solid #10b981",
                      borderRadius: "8px",
                      color: "#10b981",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Subtotal */}
            <div style={{
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor: "#f0f9ff",
              borderRadius: "8px",
              textAlign: "right",
            }}>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Subtotal:</p>
              <p style={{ fontSize: "2rem", fontWeight: "700", color: "#3b82f6" }}>
                S/ {(precioEditable * cantidad).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
        }}>
          <button
            onClick={() => productoSeleccionado ? setProductoSeleccionado(null) : cancelar()}
            style={{
              padding: "0.75rem 1.5rem",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              backgroundColor: "white",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem",
              color: "#374151",
            }}
          >
            {productoSeleccionado ? "← Volver" : "Cancelar"}
          </button>
          {productoSeleccionado && (
            <button
              onClick={confirmarSeleccion}
              style={{
                padding: "0.75rem 2rem",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#3b82f6",
                color: "white",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.95rem",
              }}
            >
              ✓ Agregar al servicio
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
