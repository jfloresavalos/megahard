'use client'

import { FileText, FileSpreadsheet } from 'lucide-react'

interface ExportButtonsProps {
  onExportPDF: () => void
  onExportExcel?: () => void
  loadingPDF?: boolean
  loadingExcel?: boolean
}

export default function ExportButtons({
  onExportPDF,
  onExportExcel,
  loadingPDF = false,
  loadingExcel = false,
}: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      {/* Botón PDF */}
      <button
        onClick={onExportPDF}
        disabled={loadingPDF}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        <FileText size={18} />
        {loadingPDF ? 'Generando...' : 'Exportar PDF'}
      </button>

      {/* Botón Excel (opcional) */}
      {onExportExcel && (
        <button
          onClick={onExportExcel}
          disabled={loadingExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={18} />
          {loadingExcel ? 'Generando...' : 'Exportar Excel'}
        </button>
      )}
    </div>
  )
}
