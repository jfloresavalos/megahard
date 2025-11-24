"use client"

import { useEffect } from 'react'

interface ToastProps {
  mensaje: string
  tipo: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
  duracion?: number
}

export default function Toast({ mensaje, tipo, onClose, duracion = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duracion)

    return () => clearTimeout(timer)
  }, [onClose, duracion])

  const colores = {
    success: { bg: '#d1fae5', border: '#10b981', texto: '#065f46', icono: '✓' },
    error: { bg: '#fee2e2', border: '#ef4444', texto: '#991b1b', icono: '✗' },
    warning: { bg: '#fef3c7', border: '#f59e0b', texto: '#92400e', icono: '⚠' },
    info: { bg: '#dbeafe', border: '#3b82f6', texto: '#1e40af', icono: 'ℹ' }
  }

  const estilo = colores[tipo]

  return (
    <div
      style={{
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        zIndex: 9999,
        backgroundColor: estilo.bg,
        border: `2px solid ${estilo.border}`,
        borderRadius: '8px',
        padding: '1rem 1.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      <span style={{
        fontSize: '1.5rem',
        color: estilo.texto
      }}>
        {estilo.icono}
      </span>
      
      <span style={{
        flex: 1,
        color: estilo.texto,
        fontWeight: '500',
        fontSize: '0.95rem'
      }}>
        {mensaje}
      </span>
      
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: estilo.texto,
          cursor: 'pointer',
          fontSize: '1.25rem',
          padding: '0',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  )
}