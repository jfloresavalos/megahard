"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Banco {
  nombre: string
  cuenta: string
  cci: string
}

interface MetodoPago {
  id: string
  nombre: string
  activo: boolean
}

export default function ConfiguracionEmpresaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // Datos de la empresa
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [ruc, setRuc] = useState('')
  const [eslogan, setEslogan] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [logotipo, setLogotipo] = useState('')

  // Redes y contacto
  const [web, setWeb] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [emailContacto, setEmailContacto] = useState('')

  // Métodos de pago (para PDF - legacy)
  const [metodosPago, setMetodosPago] = useState<string[]>([])
  const [bancos, setBancos] = useState<Banco[]>([])
  const [numeroPlin, setNumeroPlin] = useState('')
  const [numeroYape, setNumeroYape] = useState('')

  // Métodos de pago dinámicos
  const [metodosPagoDB, setMetodosPagoDB] = useState<MetodoPago[]>([])
  const [nuevoMetodoPago, setNuevoMetodoPago] = useState('')
  const [mostrarFormMetodoPago, setMostrarFormMetodoPago] = useState(false)

  // Nota footer
  const [notaFooter, setNotaFooter] = useState('')

  // Estado para agregar banco
  const [mostrarFormBanco, setMostrarFormBanco] = useState(false)
  const [nuevoBanco, setNuevoBanco] = useState<Banco>({ nombre: '', cuenta: '', cci: '' })

  useEffect(() => {
    cargarConfiguracion()
    cargarMetodosPago()
  }, [])

  const cargarConfiguracion = async () => {
    try {
      const response = await fetch('/api/configuracion')
      const data = await response.json()

      if (data.success && data.configuracion) {
        const config = data.configuracion
        setNombreEmpresa(config.nombreEmpresa || '')
        setRuc(config.ruc || '')
        setEslogan(config.eslogan || '')
        setDescripcion(config.descripcion || '')
        setLogotipo(config.logotipo || '')
        setWeb(config.web || '')
        setFacebook(config.facebook || '')
        setInstagram(config.instagram || '')
        setWhatsapp(config.whatsapp || '')
        setEmailContacto(config.emailContacto || '')
        setMetodosPago(config.metodosPago || [])
        setBancos(config.bancos || [])
        setNumeroPlin(config.numeroPlin || '')
        setNumeroYape(config.numeroYape || '')
        setNotaFooter(config.notaFooter || '')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarMetodosPago = async () => {
    try {
      const response = await fetch('/api/metodos-pago')
      const data = await response.json()
      if (data.success) {
        setMetodosPagoDB(data.metodosPago)
      }
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error)
    }
  }

  const agregarMetodoPago = async () => {
    if (!nuevoMetodoPago.trim()) {
      alert('Ingrese el nombre del método de pago')
      return
    }

    try {
      const response = await fetch('/api/metodos-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoMetodoPago })
      })

      const data = await response.json()

      if (data.success) {
        mostrarMensaje('✅ Método de pago agregado correctamente')
        setNuevoMetodoPago('')
        setMostrarFormMetodoPago(false)
        cargarMetodosPago()
      } else {
        mostrarMensaje('❌ ' + data.error)
      }
    } catch (error) {
      mostrarMensaje('❌ Error al agregar método de pago')
    }
  }

  const eliminarMetodoPago = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el método de pago "${nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/metodos-pago?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        mostrarMensaje('✅ Método de pago eliminado correctamente')
        cargarMetodosPago()
      } else {
        mostrarMensaje('❌ Error al eliminar método de pago')
      }
    } catch (error) {
      mostrarMensaje('❌ Error al eliminar método de pago')
    }
  }

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendoLogo(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/configuracion/logo', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setLogotipo(data.url)
        mostrarMensaje('✅ Logo subido correctamente')
      } else {
        mostrarMensaje('❌ ' + data.error)
      }
    } catch (error) {
      mostrarMensaje('❌ Error al subir logo')
    } finally {
      setSubiendoLogo(false)
    }
  }

  const toggleMetodoPago = (metodo: string) => {
    if (metodosPago.includes(metodo)) {
      setMetodosPago(metodosPago.filter(m => m !== metodo))
    } else {
      setMetodosPago([...metodosPago, metodo])
    }
  }

  const agregarBanco = () => {
    if (!nuevoBanco.nombre || !nuevoBanco.cuenta) {
      alert('Complete al menos el nombre del banco y número de cuenta')
      return
    }
    setBancos([...bancos, nuevoBanco])
    setNuevoBanco({ nombre: '', cuenta: '', cci: '' })
    setMostrarFormBanco(false)
  }

  const eliminarBanco = (index: number) => {
    setBancos(bancos.filter((_, i) => i !== index))
  }

  const mostrarMensaje = (msg: string) => {
    setMensaje(msg)
    setTimeout(() => setMensaje(''), 3000)
  }

  const handleGuardar = async () => {
    if (!nombreEmpresa || !ruc) {
      mostrarMensaje('❌ Nombre de empresa y RUC son obligatorios')
      return
    }

    setGuardando(true)

    try {
      const response = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreEmpresa,
          ruc,
          eslogan,
          descripcion,
          web,
          facebook,
          instagram,
          whatsapp,
          emailContacto,
          metodosPago,
          bancos,
          numeroPlin,
          numeroYape,
          notaFooter
        })
      })

      const data = await response.json()

      if (data.success) {
        mostrarMensaje('✅ Configuración guardada correctamente')
      } else {
        mostrarMensaje('❌ ' + data.error)
      }
    } catch (error) {
      mostrarMensaje('❌ Error al guardar configuración')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        ⏳ Cargando...
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', margin: 0 }}>
          ⚙️ Configuración de la Empresa
        </h1>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← Volver
        </button>
      </div>

      {mensaje && (
        <div style={{
          padding: '1rem',
          backgroundColor: mensaje.includes('✅') ? '#d1fae5' : '#fee2e2',
          color: mensaje.includes('✅') ? '#065f46' : '#991b1b',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontWeight: '600'
        }}>
          {mensaje}
        </div>
      )}

      {/* DATOS DE LA EMPRESA */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          🏢 Datos de la Empresa
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              placeholder="MEGA HARD INVERSIONES SAC"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              RUC *
            </label>
            <input
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              placeholder="20549296689"
              maxLength={11}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Eslogan
          </label>
          <input
            type="text"
            value={eslogan}
            onChange={(e) => setEslogan(e.target.value)}
            placeholder="SERVICIO Y VENTA ESPECIALIZADO"
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
            Descripción de Servicios
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="SOPORTE Y VENTA DE PC - LAPTOP&#10;IMPRESORAS Y REPUESTO EN GENERAL&#10;SISTEMA DE VIGILANCIA"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* LOGO */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          🖼️ Logotipo
        </h2>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            backgroundColor: subiendoLogo ? '#9ca3af' : '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            cursor: subiendoLogo ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}>
            {subiendoLogo ? '⏳ Subiendo...' : '📤 Subir Logo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleSubirLogo}
              disabled={subiendoLogo}
              style={{ display: 'none' }}
            />
          </label>

          {logotipo && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Vista previa:
              </p>
              <img 
                src={logotipo} 
                alt="Logo"
                style={{ 
                  maxWidth: '150px', 
                  maxHeight: '150px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0.5rem'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* REDES SOCIALES Y CONTACTO */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          🌐 Redes Sociales y Contacto
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Sitio Web
            </label>
            <input
              type="text"
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="www.megahardinversiones.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Facebook
            </label>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="facebook.com/megahard"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@megahard"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              WhatsApp
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="992961703"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={emailContacto}
              onChange={(e) => setEmailContacto(e.target.value)}
              placeholder="contacto@megahard.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>
      </div>

      {/* GESTIÓN DE MÉTODOS DE PAGO */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
            💰 Métodos de Pago
          </h2>
          <button
            type="button"
            onClick={() => setMostrarFormMetodoPago(!mostrarFormMetodoPago)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {mostrarFormMetodoPago ? '✕ Cancelar' : '+ Agregar Método de Pago'}
          </button>
        </div>

        {mostrarFormMetodoPago && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Nombre del Método de Pago *
              </label>
              <input
                type="text"
                value={nuevoMetodoPago}
                onChange={(e) => setNuevoMetodoPago(e.target.value)}
                placeholder="EFECTIVO, TARJETA, YAPE, PLIN, etc."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    agregarMetodoPago()
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={agregarMetodoPago}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ✓ Agregar
            </button>
          </div>
        )}

        {/* Lista de métodos de pago */}
        {metodosPagoDB.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {metodosPagoDB.map((metodo) => (
              <div
                key={metodo.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                  {metodo.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarMetodoPago(metodo.id, metodo.nombre)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #d1d5db'
          }}>
            No hay métodos de pago registrados. Haz clic en "+ Agregar Método de Pago" para añadir uno.
          </div>
        )}

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #3b82f6',
          fontSize: '0.875rem',
          color: '#1e40af'
        }}>
          <strong>ℹ️ Nota:</strong> Los métodos de pago que agregues aquí aparecerán en los formularios de nueva venta, nuevo servicio y al marcar servicios como entregados.
        </div>
      </div>

{/* BILLETERAS DIGITALES - VERSIÓN CORREGIDA */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          💳 Billeteras Digitales
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Número YAPE
            </label>
            <input
              type="text"
              value={numeroYape}
              onChange={(e) => setNumeroYape(e.target.value)}
              placeholder="999888777"
              maxLength={9}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Número PLIN
            </label>
            <input
              type="text"
              value={numeroPlin}
              onChange={(e) => setNumeroPlin(e.target.value)}
              placeholder="992961703"
              maxLength={9}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>
      </div>
      {/* BANCOS */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
            🏦 Cuentas Bancarias
          </h2>
          <button
            type="button"
            onClick={() => setMostrarFormBanco(!mostrarFormBanco)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {mostrarFormBanco ? '✕ Cancelar' : '+ Agregar Banco'}
          </button>
        </div>

        {mostrarFormBanco && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nombre del Banco *
                </label>
                <input
                  type="text"
                  value={nuevoBanco.nombre}
                  onChange={(e) => setNuevoBanco({...nuevoBanco, nombre: e.target.value})}
                  placeholder="BCP, BBVA, Interbank..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Número de Cuenta *
                </label>
                <input
                  type="text"
                  value={nuevoBanco.cuenta}
                  onChange={(e) => setNuevoBanco({...nuevoBanco, cuenta: e.target.value})}
                  placeholder="139-300157478"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  CCI (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevoBanco.cci}
                  onChange={(e) => setNuevoBanco({...nuevoBanco, cci: e.target.value})}
                  placeholder="003-139-003001574785-37"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={agregarBanco}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ✓ Agregar Banco
            </button>
          </div>
        )}

        {/* Lista de bancos */}
        {bancos.length > 0 ? (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {bancos.map((banco, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Banco
                  </div>
                  <div style={{ fontWeight: '600' }}>{banco.nombre}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Cuenta
                  </div>
                  <div style={{ fontWeight: '500' }}>{banco.cuenta}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    CCI
                  </div>
                  <div style={{ fontWeight: '500' }}>{banco.cci || 'N/A'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarBanco(index)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #d1d5db'
          }}>
            No hay bancos registrados. Haz clic en "+ Agregar Banco" para añadir uno.
          </div>
        )}
      </div>

      {/* NOTA FOOTER */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          📝 Nota al Pie de la Guía
        </h2>

        <textarea
          value={notaFooter}
          onChange={(e) => setNotaFooter(e.target.value)}
          rows={3}
          placeholder="NOTA: "
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* BOTÓN GUARDAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          disabled={guardando}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: guardando ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          style={{
            padding: '1rem 3rem',
            backgroundColor: guardando ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: guardando ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          {guardando ? '⏳ Guardando...' : '💾 Guardar Configuración'}
        </button>
      </div>
    </div>
  )
}