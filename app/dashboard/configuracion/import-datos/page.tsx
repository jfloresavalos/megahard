"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import ImportComponent from "@/components/ImportComponent"

export default function ImportPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'productos' | 'categorias' | 'subcategorias'>('productos')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.push('/dashboard/configuracion')}
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
          ← Volver a Configuración
        </button>
        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2.25rem',
          fontWeight: 'bold',
          margin: '0.5rem 0 0 0'
        }}>
          📥 Importar Datos Masivamente
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          margin: '0.5rem 0 0 0'
        }}>
          Carga productos, categorías y subcategorías usando archivos Excel
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        {[
          { id: 'productos', label: '📦 Productos' },
          { id: 'categorias', label: '📂 Categorías' },
          { id: 'subcategorias', label: '📁 Subcategorías' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'productos' && (
        <ImportComponent
          titulo="Importar Productos"
          plantillaUrl="/api/upload/plantillas/productos"
          importUrl="/api/import/productos"
          tipoArchivo="productos"
        />
      )}

      {activeTab === 'categorias' && (
        <ImportComponent
          titulo="Importar Categorías"
          plantillaUrl="/api/upload/plantillas/categorias"
          importUrl="/api/import/categorias"
          tipoArchivo="categorias"
        />
      )}

      {activeTab === 'subcategorias' && (
        <ImportComponent
          titulo="Importar Subcategorías"
          plantillaUrl="/api/upload/plantillas/subcategorias"
          importUrl="/api/import/subcategorias"
          tipoArchivo="subcategorias"
        />
      )}

      {/* Info cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '1.5rem',
        marginTop: '2rem'
      }}>
        {[
          {
            icon: '✅',
            titulo: 'Plantillas Prefab',
            desc: 'Descarga plantillas Excel predefinidas con instrucciones'
          },
          {
            icon: '🔒',
            titulo: 'Validación Completa',
            desc: 'Sistema verifica duplicados, categorías y datos válidos'
          },
          {
            icon: '📊',
            titulo: 'Reportes Detallados',
            desc: 'Obtén resumen de éxitos y errores por fila'
          }
        ].map((card, idx) => (
          <div key={idx} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{card.icon}</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {card.titulo}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
