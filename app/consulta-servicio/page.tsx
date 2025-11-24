"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface ConfigEmpresa {
  nombreEmpresa: string
  logotipo: string | null
  eslogan: string | null
  whatsapp: string | null
  emailContacto: string | null
}

export default function ConsultaServicioPage() {
  const router = useRouter()
  const [dni, setDni] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [config, setConfig] = useState<ConfigEmpresa | null>(null)

  useEffect(() => {
    fetch('/api/configuracion-publica')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Error cargando configuración:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validar DNI
    if (dni.trim().length !== 8) {
      setError("El DNI debe tener 8 dígitos")
      return
    }

    if (!/^\d+$/.test(dni.trim())) {
      setError("El DNI solo debe contener números")
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/consulta-servicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: dni.trim() })
      })

      const data = await response.json()

      if (data.success) {
        // Guardar DNI en sessionStorage para validaciones posteriores
        sessionStorage.setItem('consultaDni', dni.trim())

        // Redirigir a página de resultados
        router.push(`/consulta-servicio/resultados?dni=${dni.trim()}`)
      } else {
        setError(data.error || 'No se encontraron servicios con este DNI')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al consultar. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '500px',
        width: '100%',
        padding: '2.5rem'
      }}>
        {/* Logo / Título */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {config?.logotipo ? (
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={config.logotipo}
                alt={config.nombreEmpresa}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem'
            }}>
              🔍
            </div>
          )}
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 0.5rem 0'
          }}>
            {config?.nombreEmpresa || 'Consulta tu Servicio'}
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            margin: 0
          }}>
            {config?.eslogan || 'Ingresa tu DNI para ver el estado de tus equipos'}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151',
              fontSize: '0.95rem'
            }}>
              DNI
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                setDni(value)
                setError('')
              }}
              placeholder="12345678"
              maxLength={8}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1.125rem',
                textAlign: 'center',
                letterSpacing: '0.05em',
                fontWeight: '600',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = '#3b82f6'
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = '#e5e7eb'
              }}
            />
            {error && (
              <p style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || dni.length !== 8}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: loading || dni.length !== 8 ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: loading || dni.length !== 8 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading || dni.length !== 8 ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            {loading ? '🔍 Buscando...' : 'Consultar'}
          </button>
        </form>

        {/* Información adicional */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0 0 0.5rem 0'
          }}>
            ¿Tienes dudas?
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: '#3b82f6',
            fontWeight: '600',
            margin: 0
          }}>
            📞 Contáctanos{config?.whatsapp ? ` al ${config.whatsapp}` : ''}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          <p style={{ margin: 0 }}>
            Tus datos están protegidos 🔒
          </p>
        </div>
      </div>
    </div>
  )
}
