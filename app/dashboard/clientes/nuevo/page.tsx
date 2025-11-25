"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipoDoc: 'DNI',
    numeroDoc: '',
    nombre: '',
    razonSocial: '',
    telefono: '',
    email: '',
    direccion: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.numeroDoc.trim()) {
      alert('⚠️ El número de documento es obligatorio')
      return
    }

    if (!formData.nombre.trim()) {
      alert('⚠️ El nombre es obligatorio')
      return
    }

    // Validar formato según tipo de documento
    const numeroDoc = formData.numeroDoc.trim()

    if (formData.tipoDoc === 'DNI') {
      if (!/^\d{8}$/.test(numeroDoc)) {
        alert('⚠️ El DNI debe tener exactamente 8 dígitos')
        return
      }
    } else if (formData.tipoDoc === 'RUC') {
      if (!/^\d{11}$/.test(numeroDoc)) {
        alert('⚠️ El RUC debe tener exactamente 11 dígitos')
        return
      }
    } else if (formData.tipoDoc === 'CE') {
      if (!/^\d{9}$/.test(numeroDoc)) {
        alert('⚠️ El CE debe tener exactamente 9 dígitos')
        return
      }
    } else if (formData.tipoDoc === 'PASAPORTE') {
      if (!/^[A-Za-z0-9]{7,12}$/.test(numeroDoc)) {
        alert('⚠️ El Pasaporte debe tener entre 7 y 12 caracteres alfanuméricos')
        return
      }
    }

    try {
      setLoading(true)

      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Cliente creado correctamente')
        router.push(`/dashboard/clientes/${data.cliente.id}`)
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.push('/dashboard/clientes')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}
        >
          ← Volver a Clientes
        </button>

        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
          ➕ Nuevo Cliente
        </h1>
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#dbeafe',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            ℹ️ Los campos marcados con * son obligatorios
          </div>

          {/* Tipo y Número de Documento */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
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
                value={formData.tipoDoc}
                onChange={(e) => setFormData({ ...formData, tipoDoc: e.target.value })}
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
                value={formData.numeroDoc}
                onChange={(e) => setFormData({ ...formData, numeroDoc: e.target.value })}
                placeholder={
                  formData.tipoDoc === 'DNI' ? '8 dígitos' :
                  formData.tipoDoc === 'RUC' ? '11 dígitos' :
                  formData.tipoDoc === 'CE' ? '9 dígitos' :
                  '7-12 caracteres alfanuméricos'
                }
                maxLength={
                  formData.tipoDoc === 'DNI' ? 8 :
                  formData.tipoDoc === 'RUC' ? 11 :
                  formData.tipoDoc === 'CE' ? 9 :
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
                {formData.tipoDoc === 'DNI' && 'DNI: 8 dígitos numéricos'}
                {formData.tipoDoc === 'RUC' && 'RUC: 11 dígitos numéricos'}
                {formData.tipoDoc === 'CE' && 'CE: 9 dígitos numéricos'}
                {formData.tipoDoc === 'PASAPORTE' && 'Pasaporte: 7-12 caracteres alfanuméricos'}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div style={{ marginBottom: '1.5rem' }}>
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
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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

          {/* Razón Social */}
          {formData.tipoDoc === 'RUC' && (
            <div style={{ marginBottom: '1.5rem' }}>
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
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
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
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              Dirección
            </label>
            <textarea
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
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

          {/* Botones */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            marginTop: '2rem'
          }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard/clientes')}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                opacity: loading ? 0.5 : 1
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {loading ? '⏳ Creando...' : '➕ Crear Cliente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}