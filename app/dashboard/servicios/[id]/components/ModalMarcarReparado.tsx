"use client"

import { useState } from "react"
import ModalBuscarProducto from "./ModalBuscarProducto"

interface Producto {
  id: string
  codigo: string
  nombre: string
  precioVenta: number
  stock: number
}

interface RepuestoSeleccionado {
  productoId: string
  productoNombre: string
  cantidad: number
  precioUnit: number
  subtotal: number
}

interface ModalMarcarReparadoProps {
  isOpen: boolean
  onClose: () => void
  servicio: {
    id: string
    numeroServicio: string
    sedeId: string
  }
}

export default function ModalMarcarReparado({
  isOpen,
  onClose,
  servicio
}: ModalMarcarReparadoProps) {
  const [diagnostico, setDiagnostico] = useState("")
  const [solucion, setSolucion] = useState("")
  const [fotosDespues, setFotosDespues] = useState<string[]>([])
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoSeleccionado[]>([])

  // Estados para modal de búsqueda
  const [modalBuscarOpen, setModalBuscarOpen] = useState(false)

  const [subiendoFotos, setSubiendoFotos] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // ✅ Agregar producto desde el modal
  const agregarRepuesto = (producto: Producto, cantidad: number, precioFinal: number) => {
    // Verificar si ya está agregado
    if (repuestosSeleccionados.find(r => r.productoId === producto.id)) {
      alert("⚠️ Este repuesto ya está agregado")
      return
    }

    const nuevoRepuesto: RepuestoSeleccionado = {
      productoId: producto.id,
      productoNombre: `${producto.codigo} - ${producto.nombre}`,
      cantidad: cantidad,
      precioUnit: precioFinal,
      subtotal: precioFinal * cantidad
    }

    setRepuestosSeleccionados([...repuestosSeleccionados, nuevoRepuesto])
  }

  // ✅ Actualizar cantidad de un repuesto
  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return

    const nuevosRepuestos = [...repuestosSeleccionados]
    const repuesto = nuevosRepuestos[index]

    repuesto.cantidad = nuevaCantidad
    repuesto.subtotal = repuesto.precioUnit * nuevaCantidad
    setRepuestosSeleccionados(nuevosRepuestos)
  }

  // ✅ Eliminar repuesto
  const eliminarRepuesto = (index: number) => {
    setRepuestosSeleccionados(repuestosSeleccionados.filter((_, i) => i !== index))
  }

  // ✅ Subir fotos
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const fotosActuales = fotosDespues.length
    const fotosNuevas = files.length

    if (fotosActuales + fotosNuevas > 5) {
      alert("⚠️ Máximo 5 fotos permitidas")
      return
    }

    setSubiendoFotos(true)

    try {
      const urlsSubidas: string[] = []

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        if (data.success) {
          urlsSubidas.push(data.url)
        }
      }

      setFotosDespues([...fotosDespues, ...urlsSubidas])
      alert(`✅ ${urlsSubidas.length} foto(s) subida(s)`)
    } catch (error) {
      console.error("Error al subir fotos:", error)
      alert("❌ Error al subir fotos")
    } finally {
      setSubiendoFotos(false)
    }
  }

  // ✅ Eliminar foto
  const eliminarFoto = async (url: string) => {
    try {
      await fetch("/api/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      setFotosDespues(fotosDespues.filter(f => f !== url))
    } catch (error) {
      console.error("Error al eliminar foto:", error)
    }
  }

  // ✅ Enviar formulario
  const handleSubmit = async () => {
    if (!diagnostico.trim() || !solucion.trim()) {
      alert("⚠️ El diagnóstico y la solución son obligatorios")
      return
    }

    // Confirmar
    const confirmar = confirm(
      `¿Confirmar que el servicio ${servicio.numeroServicio} está REPARADO?\n\n` +
      `Repuestos: ${repuestosSeleccionados.length}\n` +
      `Fotos: ${fotosDespues.length}`
    )

    if (!confirmar) return

    setEnviando(true)

    try {
      const response = await fetch(`/api/servicios/${servicio.id}/marcar-reparado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostico,
          solucion,
          fotosDespues,
          repuestosUsados: repuestosSeleccionados,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Servicio ${servicio.numeroServicio} marcado como REPARADO`)
        onClose() // Cierra el modal y recarga la página padre
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error al marcar como reparado:", error)
      alert("❌ Error de conexión")
    } finally {
      setEnviando(false)
    }
  }

  if (!isOpen) return null

  const costoTotalRepuestos = repuestosSeleccionados.reduce((sum, r) => sum + r.subtotal, 0)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          maxWidth: "900px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "2rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>
            🔧 Marcar como Reparado: {servicio.numeroServicio}
          </h2>
          <button
            onClick={onClose}
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

        {/* DIAGNÓSTICO */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
            Diagnóstico Técnico <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            placeholder="Qué problema se encontró..."
            rows={4}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.95rem",
            }}
          />
        </div>

        {/* SOLUCIÓN */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
            Solución Aplicada <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={solucion}
            onChange={(e) => setSolucion(e.target.value)}
            placeholder="Qué se hizo para repararlo..."
            rows={4}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.95rem",
            }}
          />
        </div>

        {/* REPUESTOS UTILIZADOS */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
            🔩 Repuestos Utilizados (Opcional)
          </label>

          {/* INPUT CON LUPA PARA ABRIR MODAL */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Buscar repuesto del inventario..."
              readOnly
              onClick={() => setModalBuscarOpen(true)}
              style={{
                width: "100%",
                padding: "0.75rem 3rem 0.75rem 1rem",
                border: "2px solid #3b82f6",
                borderRadius: "8px",
                fontSize: "0.95rem",
                cursor: "pointer",
                backgroundColor: "white",
              }}
            />
            <button
              type="button"
              onClick={() => setModalBuscarOpen(true)}
              style={{
                position: "absolute",
                right: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "0.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                fontSize: "1.1rem",
              }}
              title="Buscar producto"
            >
              🔍
            </button>
          </div>

          {/* LISTA DE REPUESTOS SELECCIONADOS */}
          {repuestosSeleccionados.length > 0 && (
            <div style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
              {repuestosSeleccionados.map((repuesto, index) => (
                <div
                  key={index}
                  style={{
                    padding: "1rem",
                    borderBottom: index < repuestosSeleccionados.length - 1 ? "1px solid #e5e7eb" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: index % 2 === 0 ? "white" : "#f9fafb",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{repuesto.productoNombre}</div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      S/ {repuesto.precioUnit.toFixed(2)} c/u
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button
                        onClick={() => actualizarCantidad(index, repuesto.cantidad - 1)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: "30px", textAlign: "center", fontWeight: "600" }}>
                        {repuesto.cantidad}
                      </span>
                      <button
                        onClick={() => actualizarCantidad(index, repuesto.cantidad + 1)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ fontWeight: "700", minWidth: "80px", textAlign: "right" }}>
                      S/ {repuesto.subtotal.toFixed(2)}
                    </div>

                    <button
                      onClick={() => eliminarRepuesto(index)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {/* TOTAL REPUESTOS */}
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f9fafb",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "700",
                  fontSize: "1.1rem",
                }}
              >
                <span>TOTAL REPUESTOS:</span>
                <span style={{ color: "#10b981" }}>S/ {costoTotalRepuestos.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* FOTOS DEL RESULTADO */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
            📸 Fotos del Resultado (Opcional)
          </label>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFotoChange}
            disabled={subiendoFotos || fotosDespues.length >= 5}
            style={{ marginBottom: "1rem" }}
          />

          {fotosDespues.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem" }}>
              {fotosDespues.map((url, index) => (
                <div key={index} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px" }}
                  />
                  <button
                    onClick={() => eliminarFoto(url)}
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTONES */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={enviando}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={enviando || !diagnostico.trim() || !solucion.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: enviando ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: enviando ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            {enviando ? "⏳ Guardando..." : "✅ Confirmar Reparación"}
          </button>
        </div>
      </div>

      {/* MODAL BUSCAR PRODUCTO */}
      <ModalBuscarProducto
        isOpen={modalBuscarOpen}
        onClose={() => setModalBuscarOpen(false)}
        sedeId={servicio.sedeId}
        onSeleccionar={agregarRepuesto}
        tituloModal="Buscar Repuesto"
      />
    </div>
  )
}
