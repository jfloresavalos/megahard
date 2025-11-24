"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ConfiguracionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (session && session.user?.rol !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  const menuItems = [
    {
      titulo: "Gestión de Usuarios",
      descripcion: "Crear, editar y gestionar usuarios del sistema",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      ruta: "/dashboard/configuracion/usuarios",
      color: "#3b82f6",
      colorFondo: "#dbeafe"
    },
    {
      titulo: "Gestión de Sedes",
      descripcion: "Administrar las sedes de la empresa",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      ruta: "/dashboard/configuracion/sedes",
      color: "#10b981",
      colorFondo: "#d1fae5"
    },
    {
      titulo: "Categorías y Subcategorías",
      descripcion: "Organizar los productos por categorías",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
      ruta: "/dashboard/configuracion/categorias",
      color: "#f59e0b",
      colorFondo: "#fef3c7"
    },
    {
      titulo: "Configuración de Empresa",
      descripcion: "Datos de la empresa, logo, redes sociales y métodos de pago",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      ),
      ruta: "/dashboard/configuracion/empresa",
      color: "#8b5cf6",
      colorFondo: "#ede9fe"
    },
    {
      titulo: "Importar Datos Masivamente",
      descripcion: "Carga productos, categorías y subcategorías desde Excel",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      ),
      ruta: "/dashboard/configuracion/import-datos",
      color: "#ec4899",
      colorFondo: "#fce7f3"
    }
  ]

  if (session?.user?.rol !== 'admin') {
    return null
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m5.657-13.657l-4.243 4.243m-2.828 2.828l-4.243 4.243m16.97 1.414l-4.243-4.243m-2.828-2.828l-4.243-4.243"></path>
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.25rem',
              fontWeight: '700',
              margin: 0,
              color: '#111827'
            }}>
              Configuración
            </h1>
            <p style={{
              fontSize: isMobile ? '0.95rem' : '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              Administra los ajustes generales del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Grid de opciones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: isMobile ? '1rem' : '1.5rem'
      }}>
        {menuItems.map((item) => (
          <div
            key={item.ruta}
            onClick={() => router.push(item.ruta)}
            style={{
              backgroundColor: 'white',
              padding: isMobile ? '1.75rem' : '2rem',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '2px solid transparent',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              e.currentTarget.style.borderColor = item.color
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            {/* Fondo decorativo */}
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              backgroundColor: item.colorFondo,
              borderRadius: '50%',
              opacity: 0.6,
              filter: 'blur(40px)'
            }}></div>

            {/* Contenido */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Icono */}
              <div style={{
                width: '70px',
                height: '70px',
                backgroundColor: item.colorFondo,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                color: item.color,
                boxShadow: `0 4px 12px ${item.color}30`
              }}>
                {item.icon}
              </div>

              {/* Título */}
              <h2 style={{
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: '600',
                margin: '0 0 0.75rem 0',
                color: '#111827',
                minHeight: '2.7rem'
              }}>
                {item.titulo}
              </h2>

              {/* Descripción */}
              <p style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                margin: '0 0 1.5rem 0',
                lineHeight: '1.5',
                minHeight: '3rem'
              }}>
                {item.descripcion}
              </p>

              {/* Botón/Link */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: item.color,
                fontWeight: '600',
                fontSize: '0.95rem'
              }}>
                <span>Administrar</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info adicional */}
      <div style={{
        marginTop: '2.5rem',
        padding: isMobile ? '1.5rem' : '2rem',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        borderLeft: '4px solid #667eea',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#dbeafe',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 0.5rem 0',
              color: '#1e40af'
            }}>
              Información importante
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#1e40af',
              margin: 0,
              lineHeight: '1.6'
            }}>
              Solo los administradores tienen acceso a esta sección. Los cambios realizados aquí afectan a todo el sistema y pueden impactar en el funcionamiento de la aplicación.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}