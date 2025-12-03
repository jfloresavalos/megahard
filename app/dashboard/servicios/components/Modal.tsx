// ✅ MODAL CORREGIDO - Soporte para altura ajustable

import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxHeight?: string  // ✅ NUEVO - permite ajustar altura
  closeOnBackdrop?: boolean  // ✅ NUEVO - permite desactivar cierre al hacer click fuera
  zIndex?: number  // ✅ NUEVO - permite ajustar z-index para modales anidados
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '80vh',  // ✅ DEFAULT 80vh, pero se puede cambiar
  closeOnBackdrop = false,  // ✅ DEFAULT false - NO cierra al hacer click fuera
  zIndex = 1000  // ✅ DEFAULT 1000, pero se puede aumentar para modales anidados
}: ModalProps) {
  if (!isOpen) return null

  return (
    <div
      onClick={() => closeOnBackdrop && onClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex,
        padding: '1rem',
        cursor: closeOnBackdrop ? 'pointer' : 'default'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: maxHeight,  // ✅ USA EL PROP
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            margin: 0
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6b7280',
              cursor: 'pointer',
              padding: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* ✅ Contenido con scroll */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}