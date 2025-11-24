'use client'

import Link from 'next/link'
import { useState } from 'react'

interface ReporteCard {
  titulo: string
  descripcion: string
  emoji: string
  url: string
  color: string
  disponible: boolean
}

export default function ReportesPage() {
  const reportes: ReporteCard[] = [
    {
      titulo: 'Caja Diaria',
      descripcion: 'Ingresos diarios de ventas, servicios técnicos y adelantos. Desglose por método de pago.',
      emoji: '💰',
      url: '/dashboard/reportes/caja-diaria',
      color: '#10b981',
      disponible: true,
    },
    {
      titulo: 'Stock y Alertas',
      descripcion: 'Inventario actual con productos bajo stock mínimo. Alertas automáticas de reorden.',
      emoji: '⚠️',
      url: '/dashboard/reportes/stock-alertas',
      color: '#f59e0b',
      disponible: true,
    },
    {
      titulo: 'Productos Más Vendidos',
      descripcion: 'Top de productos con mejor rotación. Análisis de tendencias de venta.',
      emoji: '📈',
      url: '/dashboard/reportes/productos-vendidos',
      color: '#3b82f6',
      disponible: true,
    },
    {
      titulo: 'Servicios Pendientes',
      descripcion: 'Estado de servicios técnicos activos. Saldos pendientes por cobrar.',
      emoji: '🔧',
      url: '/dashboard/reportes/servicios-pendientes',
      color: '#8b5cf6',
      disponible: false,
    },
    {
      titulo: 'Ventas Mensuales',
      descripcion: 'Resumen mensual de ventas. Comparativas con períodos anteriores.',
      emoji: '📊',
      url: '/dashboard/reportes/ventas-mensuales',
      color: '#6366f1',
      disponible: false,
    },
    {
      titulo: 'Kardex de Productos',
      descripcion: 'Historial completo de movimientos por producto. Trazabilidad de inventario.',
      emoji: '📦',
      url: '/dashboard/reportes/kardex',
      color: '#64748b',
      disponible: false,
    },
    {
      titulo: 'Cobranza por Sede',
      descripcion: 'Desglose de pagos y saldos pendientes por sucursal. Análisis de recuperación de cartera.',
      emoji: '🏪',
      url: '/dashboard/reportes/cobranza-sede',
      color: '#ec4899',
      disponible: true,
    },
    {
      titulo: 'Cobranza por Método de Pago',
      descripcion: 'Ingresos desglosados por cada método (efectivo, Yape, Plin, transferencia, tarjeta, etc.).',
      emoji: '💳',
      url: '/dashboard/reportes/cobranza-metodo-pago',
      color: '#06b6d4',
      disponible: true,
    },
    {
      titulo: 'Cobranza Total',
      descripcion: 'Consolidado de cobranzas diarias, semanales y mensuales. Estado general de caja.',
      emoji: '💰',
      url: '/dashboard/reportes/cobranza-total',
      color: '#14b8a6',
      disponible: false,
    },
    {
      titulo: 'Clientes por Cobrar',
      descripcion: 'Listado de deudas pendientes. Seguimiento a créditos vencidos y moras.',
      emoji: '👥',
      url: '/dashboard/reportes/clientes-cobrar',
      color: '#f97316',
      disponible: false,
    },
    {
      titulo: 'Resumen Gerencial',
      descripcion: 'Dashboard ejecutivo con KPIs. Ventas, ingresos, margen y tendencias del período.',
      emoji: '📋',
      url: '/dashboard/reportes/resumen-gerencial',
      color: '#6366f1',
      disponible: false,
    },
  ]

  const reportesActivos = reportes.filter(r => r.disponible)
  const reportesPendientes = reportes.filter(r => !r.disponible)

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 'bold',
            margin: '0 0 0.5rem 0',
            color: '#1f2937'
          }}>
            📊 Centro de Reportes
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0,
            maxWidth: '600px'
          }}>
            Generador de reportes inteligentes con datos en tiempo real. Exporta a PDF o Excel y toma decisiones informadas.
          </p>
        </div>
        <div style={{ fontSize: '3.5rem', opacity: 0.15 }}>📈</div>
      </div>

      {/* Reportes Disponibles */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{
            width: '4px',
            height: '1.75rem',
            background: 'linear-gradient(to bottom, #10b981, #059669)',
            borderRadius: '9999px'
          }}></span>
          Reportes Disponibles
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {reportesActivos.map((reporte) => (
            <Link
              key={reporte.titulo}
              href={reporte.url}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: `2px solid ${reporte.color}33`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)'
                  el.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                {/* Color bar */}
                <div style={{
                  height: '4px',
                  backgroundColor: reporte.color,
                  width: '100%'
                }}></div>

                {/* Contenido */}
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: '#e8f5e9',
                      color: '#10b981',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px'
                    }}>
                      ✅ Activo
                    </span>
                    <span style={{ fontSize: '1.75rem' }}>{reporte.emoji}</span>
                  </div>

                  {/* Título */}
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    marginBottom: '0.75rem',
                    color: '#1f2937'
                  }}>
                    {reporte.titulo}
                  </h3>

                  {/* Descripción */}
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '1rem',
                    flex: 1
                  }}>
                    {reporte.descripcion}
                  </p>

                  {/* CTA */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: reporte.color,
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <span>Abrir reporte</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>



      {/* Info Box */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #3b82f6',
        padding: '1.75rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '2rem' }}>ℹ️</span>
          <div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem',
              margin: 0
            }}>
              Reportes en Tiempo Real
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#4b5563',
              marginBottom: '1rem',
              margin: 0,
              lineHeight: 1.6
            }}>
              Todos los reportes se generan con los datos más actuales de tu sistema. Puedes exportar a PDF o Excel, aplicar filtros por fecha y sucursal, y compartir con tu equipo.
            </p>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: '#dbeafe',
                color: '#0369a1',
                padding: '0.5rem 0.75rem',
                borderRadius: '9999px'
              }}>
                📅 Filtrable por fecha
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '0.5rem 0.75rem',
                borderRadius: '9999px'
              }}>
                🏪 Multi-sede
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: '#f3e8ff',
                color: '#7e22ce',
                padding: '0.5rem 0.75rem',
                borderRadius: '9999px'
              }}>
                📊 Exportar PDF/Excel
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
