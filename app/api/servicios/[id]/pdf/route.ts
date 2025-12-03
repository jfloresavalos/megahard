import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';

const fs = require('fs');
const path = require('path');

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    console.log('🔍🔍 Generando PDF para servicio:', id);

    // Obtener servicio con todas las relaciones
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario: {
          select: {
            nombre: true,
            username: true
          }
        },
        sede: {
          select: {
            nombre: true,
            direccion: true,
            telefono: true
          }
        },
        tipoServicioRelacion: true // ✅ Esta es la relación con la tabla TipoServicio
      },
    });

    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Obtener configuración (o usar valores por defecto)
    let config = await prisma.configuracionEmpresa.findFirst({
      where: { activo: true },
    });

    // Si no existe configuración, usar valores por defecto
    if (!config) {
      console.warn('⚠️ No se encontró configuración de empresa, usando valores por defecto');
      config = {
        id: 'default',
        nombreEmpresa: 'MI EMPRESA',
        ruc: '00000000000',
        eslogan: null,
        descripcion: null,
        logotipo: null,
        web: null,
        facebook: null,
        instagram: null,
        whatsapp: null,
        emailContacto: null,
        metodosPago: [],
        bancos: [],
        numeroPlin: null,
        numeroYape: null,
        notaFooter: 'Configure los datos de su empresa en Configuración > Empresa',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }


// ==================== INICIO DEL CÓDIGO NUEVO ====================

    // 1. Obtener todos los problemas comunes para "traducir" los IDs
    const problemasComunes = await prisma.problemaComun.findMany({
      where: { activo: true },
      select: { id: true, nombre: true }
    });

    // 2. Crear un "mapa" para buscarlos fácilmente
    const nombresMap = new Map<string, string>();
    problemasComunes.forEach(p => nombresMap.set(p.id, p.nombre));
    
    // 3. "Traducir" los IDs del servicio a nombres reales
    let problemasNombres: string[] = []; // <-- AQUÍ SE CREA LA VARIABLE
    if (Array.isArray(servicio.problemasReportados)) {
      (servicio.problemasReportados as string[]).forEach((id: string) => {
        const nombre = nombresMap.get(id);
        if (nombre) {
          problemasNombres.push(nombre);
        }
      });
    }

    // Obtener todas las sedes activas
    const sedes = await prisma.sede.findMany({
      where: { activo: true },
      select: {
        nombre: true,
        direccion: true,
        telefono: true
      }
    });

    // DEBUG: Imprimir datos clave
    console.log('=== PDF SERVICIO:', servicio.numeroServicio, '===');
    console.log('YAPE:', config.numeroYape);
    console.log('PLIN:', config.numeroPlin);
    console.log('Bancos:', Array.isArray(config.bancos) ? config.bancos.length : 'No es array');
    console.log('=====================================');

    // Crear PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 12;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - margin * 2;

    let y = margin;

    // Colores
    const grisOscuro = [60, 60, 60];
    const grisClaro = [245, 245, 245];
    const grisMedio = [120, 120, 120];
    const negro = [0, 0, 0];

    // ==================== FUNCIÓN AUXILIAR ====================

    const dibujarCaja = (x: number, y: number, w: number, h: number, titulo?: string) => {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.rect(x, y, w, h);

      if (titulo) {
        doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
        doc.rect(x, y, w, 7, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.line(x, y + 7, x + w, y + 7);
        doc.setTextColor(negro[0], negro[1], negro[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo, x + 2, y + 5);
      }
    };

    // ==================== ENCABEZADO OPTIMIZADO ====================

    // Calcular altura del encabezado basado en sedes
    let alturaSedes = 0;
    if (sedes.length > 0) {
      alturaSedes = sedes.length * 3.5;
    }
    const alturaEncabezado = 28 + alturaSedes; // ✅ De 32 a 28 (-4mm)

    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(margin, y, contentWidth, alturaEncabezado, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, alturaEncabezado);

    // Logo
    if (config.logotipo) {
      try {
        // El logo está en /public/uploads/logo-xxxxx.png
        // En jsPDF necesitamos la ruta completa del servidor
        const logoPath = path.join(process.cwd(), 'public', config.logotipo);
        
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          const logoBase64 = logoBuffer.toString('base64');
          const ext = config.logotipo.split('.').pop()?.toLowerCase();
          const format = ext === 'png' ? 'PNG' : ext === 'jpg' || ext === 'jpeg' ? 'JPEG' : 'PNG';
          
          doc.addImage(`data:image/${ext};base64,${logoBase64}`, format, margin + 3, y + 3, 25, 25);
        } else {
          console.log('⚠️ Logo no encontrado en:', logoPath);
          // Mostrar placeholder
          doc.setFillColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
          doc.rect(margin + 3, y + 3, 25, 25, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('LOGO', margin + 15.5, y + 16, { align: 'center' });
        }
      } catch (error) {
        console.error('❌ Error al cargar logo:', error);
        // Mostrar placeholder
        doc.setFillColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
        doc.rect(margin + 3, y + 3, 25, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('LOGO', margin + 15.5, y + 16, { align: 'center' });
      }
    } else {
      doc.setFillColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
      doc.rect(margin + 3, y + 3, 25, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('LOGO', margin + 15.5, y + 16, { align: 'center' });
    }

    // Info empresa (centro)
    const xCentro = margin + 32;
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(config.nombreEmpresa.toUpperCase(), xCentro, y + 7);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    
    let yInfo = y + 12;
    
    if (config.web) {
      doc.text(config.web.toUpperCase(), xCentro, yInfo);
      yInfo += 3.5;
    }
    
    if (config.descripcion) {
      const desc = doc.splitTextToSize(config.descripcion.toUpperCase(), 80);
      doc.text(desc[0], xCentro, yInfo);
      if (desc[1]) {
        yInfo += 3.5;
        doc.text(desc[1], xCentro, yInfo);
      }
      yInfo += 3.5;
    }

    // SEDES (dentro del encabezado)
    if (sedes.length > 0) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('SEDES:', xCentro, yInfo);
      yInfo += 3;
      
      doc.setFont('helvetica', 'normal');
      sedes.forEach((sede) => {
        let txt = sede.nombre;
        if (sede.direccion) txt += `: ${sede.direccion}`;
        const lineas = doc.splitTextToSize(txt, 75);
        doc.text(lineas[0], xCentro, yInfo);
        yInfo += 3.5;
      });
    }

    // Box derecha: Guía
    const anchoBoxDerecha = 55;
    const xDerecha = pageWidth - margin - anchoBoxDerecha;
    
    doc.setFillColor(255, 255, 255);
    doc.rect(xDerecha, y + 3, anchoBoxDerecha, 26, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(xDerecha, y + 3, anchoBoxDerecha, 26);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('GUIA DE RECEPCION', xDerecha + anchoBoxDerecha / 2, y + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    doc.text(`RUC: ${config.ruc}`, xDerecha + anchoBoxDerecha / 2, y + 13, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text(servicio.numeroServicio, xDerecha + anchoBoxDerecha / 2, y + 20, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    doc.text(`Tecnico: ${servicio.usuario?.nombre || 'N/A'}`, xDerecha + anchoBoxDerecha / 2, y + 25, { align: 'center' });

    y += alturaEncabezado + 5;

    // Fecha (fuera del encabezado, más compacta)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    const fecha = servicio.fechaRecepcion ? new Date(servicio.fechaRecepcion).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'N/A';
    doc.text(`Fecha: ${fecha}`, margin, y);

    y += 6;

    // ==================== CLIENTE ====================

    dibujarCaja(margin, y, contentWidth, 18, 'DATOS DEL CLIENTE'); // ✅ De 22 a 18 (-4mm)

    let yCliente = y + 10;
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.setFontSize(9);

    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', margin + 3, yCliente);
    doc.setFont('helvetica', 'normal');
    doc.text(servicio.clienteNombre || 'N/A', margin + 18, yCliente);

    yCliente += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('DNI:', margin + 3, yCliente);
    doc.setFont('helvetica', 'normal');
    doc.text(servicio.clienteDni || 'N/A', margin + 13, yCliente);

    doc.setFont('helvetica', 'bold');
    doc.text('Celular:', margin + 80, yCliente);
    doc.setFont('helvetica', 'normal');
    doc.text(servicio.clienteCelular || 'N/A', margin + 97, yCliente);

    y += 22;

    // ==================== EQUIPOS RECIBIDOS ====================

    // ✅ PARSEAR serviciosAdicionales para obtener array de equipos
    let equipos: any[] = [];

    if (servicio.serviciosAdicionales) {
      try {
        let parsed: any;

        if (typeof servicio.serviciosAdicionales === 'string') {
          parsed = JSON.parse(servicio.serviciosAdicionales);
        } else if (typeof servicio.serviciosAdicionales === 'object') {
          parsed = servicio.serviciosAdicionales;
        }

        // Extraer array de equipos
        if (parsed && parsed.equipos && Array.isArray(parsed.equipos)) {
          equipos = parsed.equipos;
        }
      } catch (error) {
        console.error('❌ Error parseando serviciosAdicionales:', error);
      }
    }

    // ✅ Si no hay equipos en serviciosAdicionales, usar datos del servicio principal
    if (equipos.length === 0) {
      equipos = [{
        tipoEquipo: servicio.tipoEquipo,
        marcaModelo: servicio.marcaModelo,
        descripcionEquipo: servicio.descripcionEquipo,
        dejoSinCargador: servicio.dejoSinCargador,
        conCargador: !servicio.dejoSinCargador,
        dejoAccesorios: servicio.dejoAccesorios,
        faltaPernos: servicio.faltaPernos,
        tieneAranaduras: servicio.tieneAranaduras,
        otrosDetalles: servicio.otrosDetalles,
        costoServicio: servicio.costoServicio
      }];
    }

    console.log('📦 Equipos a mostrar en PDF:', equipos.length);

    // ✅ CALCULAR ALTURA NECESARIA (más compacta)
    // 7mm header + 6mm cabecera + (equipos * 5mm) + margen
    const alturaEquipos = 13 + (equipos.length * 5);

    dibujarCaja(margin, y, contentWidth, alturaEquipos, 'EQUIPOS RECIBIDOS');

    y += 7; // Después del header

    // ✅ PARSEAR SERVICIOS ADICIONALES ANTES DE LA TABLA
    let serviciosAdicionalesArray: any[] = [];

    if (servicio.serviciosAdicionales) {
      try {
        let parsed: any;

        if (typeof servicio.serviciosAdicionales === 'string') {
          parsed = JSON.parse(servicio.serviciosAdicionales);
        } else if (typeof servicio.serviciosAdicionales === 'object') {
          parsed = servicio.serviciosAdicionales;
        }

        // Extraer array de servicios (NO equipos)
        if (parsed && parsed.servicios && Array.isArray(parsed.servicios)) {
          serviciosAdicionalesArray = parsed.servicios;
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].nombre) {
          serviciosAdicionalesArray = parsed;
        }
      } catch (error) {
        console.error('❌ Error parseando servicios adicionales:', error);
      }
    }

    // Cabecera de la tabla
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('#', margin + 2, y + 4);
    doc.text('TIPO', margin + 8, y + 4);
    doc.text('MARCA/MODELO', margin + 35, y + 4);
    doc.text('ESTADO', margin + 95, y + 4);
    doc.text('COSTO', pageWidth - margin - 18, y + 4);

    y += 6;

    // ✅ LISTAR EQUIPOS EN TABLA COMPACTA
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    equipos.forEach((equipo: any, index: number) => {
      doc.rect(margin, y, contentWidth, 5);

      // Número
      doc.text(`${index + 1}`, margin + 2, y + 3.5);

      // Tipo
      const tipo = doc.splitTextToSize(equipo.tipoEquipo || 'N/A', 25);
      doc.text(tipo[0], margin + 8, y + 3.5);

      // Marca/Modelo
      const marca = doc.splitTextToSize(equipo.marcaModelo || 'N/A', 58);
      doc.text(marca[0], margin + 35, y + 3.5);

      // Estado
      let estado: string[] = [];
      if (equipo.dejoSinCargador) estado.push('Sin carg');
      if (equipo.conCargador) estado.push('C/carg');
      if (equipo.dejoAccesorios) estado.push('C/acces');
      if (equipo.faltaPernos) estado.push('S/pernos');
      if (equipo.tieneAranaduras) estado.push('Arañaz');

      const estadoTexto = estado.length > 0 ? estado.join(', ') : 'Normal';
      const estadoLineas = doc.splitTextToSize(estadoTexto, 60);
      doc.text(estadoLineas[0], margin + 95, y + 3.5);

      // Costo
      doc.text(`S/ ${Number(equipo.costoServicio || 0).toFixed(2)}`, pageWidth - margin - 2, y + 3.5, { align: 'right' });

      y += 5;
    });

    y += 3; // Espacio después de la tabla de equipos

    // ==================== PROBLEMAS REPORTADOS ====================

    const alturaProblemas = 13 + (equipos.length * 5);
    dibujarCaja(margin, y, contentWidth, alturaProblemas, 'PROBLEMAS REPORTADOS');

    y += 7;

    // Cabecera
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('#', margin + 2, y + 4);
    doc.text('EQUIPO', margin + 8, y + 4);
    doc.text('PROBLEMA REPORTADO', margin + 50, y + 4);

    y += 6;

    // Listar problemas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    equipos.forEach((equipo: any, index: number) => {
      doc.rect(margin, y, contentWidth, 5);

      // Número
      doc.text(`${index + 1}`, margin + 2, y + 3.5);

      // Equipo
      const equipoNombre = `${equipo.tipoEquipo || 'N/A'} - ${equipo.marcaModelo || 'N/A'}`;
      const equipoLineas = doc.splitTextToSize(equipoNombre, 40);
      doc.text(equipoLineas[0], margin + 8, y + 3.5);

      // Problema
      let problemaTexto = 'Por diagnosticar';
      if (equipo.descripcionProblema) {
        problemaTexto = equipo.descripcionProblema;
      } else if (equipo.problemasSeleccionados && equipo.problemasSeleccionados.length > 0) {
        problemaTexto = equipo.problemasSeleccionados.map((p: any) => p.nombre).join(', ');
      }
      const problemaLineas = doc.splitTextToSize(problemaTexto, 135);
      doc.text(problemaLineas[0], margin + 50, y + 3.5);

      y += 5;
    });

    y += 3;

    // ==================== SERVICIOS ADICIONALES ====================

    if (serviciosAdicionalesArray.length > 0) {
      const alturaServAdicionales = 13 + (serviciosAdicionalesArray.length * 5);
      dibujarCaja(margin, y, contentWidth, alturaServAdicionales, 'SERVICIOS ADICIONALES');

      y += 7;

      // Cabecera
      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(negro[0], negro[1], negro[2]);
      doc.text('DESCRIPCION', margin + 2, y + 4);
      doc.text('PRECIO', pageWidth - margin - 20, y + 4);

      y += 6;

      // Listar servicios
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      serviciosAdicionalesArray.forEach((servicio: any) => {
        doc.rect(margin, y, contentWidth, 5);

        const nombre = servicio.nombre || servicio.descripcion || 'Servicio adicional';
        const nombreLineas = doc.splitTextToSize(nombre, 150);
        doc.text(nombreLineas[0], margin + 2, y + 3.5);

        const precio = Number(servicio.precio || servicio.costo || 0);
        doc.text(`S/ ${precio.toFixed(2)}`, pageWidth - margin - 2, y + 3.5, { align: 'right' });

        y += 5;
      });

      y += 3;
    }

    // ==================== RESUMEN DE COSTOS Y PAGOS ====================

    // Calcular totales
    const totalEquipos = equipos.reduce((sum: number, eq: any) => sum + (Number(eq.costoServicio) || 0), 0);
    const totalServiciosAdicionales = serviciosAdicionalesArray.reduce((sum: number, serv: any) => sum + (Number(serv.precio || serv.costo) || 0), 0);
    const totalGeneral = totalEquipos + totalServiciosAdicionales;
    const pagado = Number(servicio.aCuenta || 0);
    const saldo = totalGeneral - pagado;
    const tieneMetodoPago = servicio.metodoPago && servicio.metodoPago.trim() !== '';

    // Calcular altura dinámica
    let alturaResumen = 8 + 5 + 5 + 5; // header + total equipos + total + pagado
    if (serviciosAdicionalesArray.length > 0) alturaResumen += 5; // total servicios
    alturaResumen += 5; // saldo

    // Ancho de la caja (más ancho para que no sobresalgan las letras)
    const anchoResumen = 75;
    const xResumen = pageWidth - margin - anchoResumen; // Posición a la derecha

    dibujarCaja(xResumen, y, anchoResumen, alturaResumen, 'RESUMEN DE COSTOS');

    let yResumen = y + 7;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(negro[0], negro[1], negro[2]);

    // Total Equipos
    doc.text('Total Equipos:', xResumen + 3, yResumen + 3);
    doc.text(`S/ ${totalEquipos.toFixed(2)}`, xResumen + anchoResumen - 3, yResumen + 3, { align: 'right' });
    yResumen += 5;

    // Total Servicios Adicionales (solo si hay)
    if (serviciosAdicionalesArray.length > 0) {
      doc.text('Total Serv. Adic.:', xResumen + 3, yResumen + 3);
      doc.text(`S/ ${totalServiciosAdicionales.toFixed(2)}`, xResumen + anchoResumen - 3, yResumen + 3, { align: 'right' });
      yResumen += 5;
    }

    // Línea separadora
    doc.setDrawColor(180, 180, 180);
    doc.line(xResumen + 3, yResumen, xResumen + anchoResumen - 3, yResumen);
    yResumen += 3;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL:', xResumen + 3, yResumen + 3);
    doc.text(`S/ ${totalGeneral.toFixed(2)}`, xResumen + anchoResumen - 3, yResumen + 3, { align: 'right' });
    yResumen += 5;

    // Pagado (a cuenta)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    if (tieneMetodoPago) {
      doc.text(`Pagado (${servicio.metodoPago}):`, xResumen + 3, yResumen + 3);
    } else {
      doc.text('Pagado (A cuenta):', xResumen + 3, yResumen + 3);
    }
    doc.text(`S/ ${pagado.toFixed(2)}`, xResumen + anchoResumen - 3, yResumen + 3, { align: 'right' });
    yResumen += 5;

    // Saldo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('SALDO:', xResumen + 3, yResumen + 3);
    doc.text(`S/ ${saldo.toFixed(2)}`, xResumen + anchoResumen - 3, yResumen + 3, { align: 'right' });

    y += alturaResumen + 4;

    // ==================== CUENTAS DE LA EMPRESA ====================

    // Validación SUPER robusta de datos
    const plin = config.numeroPlin ? String(config.numeroPlin).trim() : '';
    const yape = config.numeroYape ? String(config.numeroYape).trim() : '';
    
    // Parsear bancos con máxima tolerancia
    let bancosArray: any[] = [];
    
    console.log('🔍 DEBUG BANCOS - Tipo:', typeof config.bancos);
    console.log('🔍 DEBUG BANCOS - Valor raw:', config.bancos);
    
    if (config.bancos) {
      // Si ya es un array
      if (Array.isArray(config.bancos)) {
        bancosArray = config.bancos.filter((b: any) => {
          if (!b) return false;
          if (typeof b !== 'object') return false;
          return !!(b.nombre || b.cuenta);
        });
        console.log('✅ Bancos es array:', bancosArray);
      }
      // Si es string JSON
      else if (typeof config.bancos === 'string') {
        try {
          const parsed = JSON.parse(config.bancos);
          if (Array.isArray(parsed)) {
            bancosArray = parsed.filter((b: any) => {
              if (!b) return false;
              if (typeof b !== 'object') return false;
              return !!(b.nombre || b.cuenta);
            });
            console.log('✅ Bancos parseado de string:', bancosArray);
          } else if (parsed && typeof parsed === 'object') {
            const tieneNombre = parsed.nombre;
            const tieneCuenta = parsed.cuenta;
            if (tieneNombre || tieneCuenta) {
              bancosArray = [parsed];
              console.log('✅ Banco individual convertido a array:', bancosArray);
            }
          }
        } catch (e) {
          console.log('⚠️ Error parseando bancos string:', e);
        }
      }
      // Si es un objeto directo (Prisma JsonValue)
      else if (typeof config.bancos === 'object') {
        const obj = config.bancos as any;
        const tieneNombre = obj.nombre;
        const tieneCuenta = obj.cuenta;
        if (tieneNombre || tieneCuenta) {
          bancosArray = [obj];
          console.log('✅ Banco objeto directo:', bancosArray);
        }
      }
    }

    const tienePlin = plin !== '' && plin !== 'null' && plin !== 'undefined';
    const tieneYape = yape !== '' && yape !== 'null' && yape !== 'undefined';
    const tieneBancos = bancosArray.length > 0;

    console.log('=== VALIDACIÓN FINAL CUENTAS ===');
    console.log('PLIN:', tienePlin ? `✅ ${plin}` : '❌ Vacío');
    console.log('YAPE:', tieneYape ? `✅ ${yape}` : '❌ Vacío');
    console.log('Bancos:', tieneBancos ? `✅ ${bancosArray.length} encontrado(s)` : '❌ Ninguno');
    if (tieneBancos) {
      bancosArray.forEach((b: any, i: number) => {
        console.log(`  ${i + 1}. ${b?.nombre || 'Sin nombre'} - Cta: ${b?.cuenta || 'Sin cuenta'}`);
      });
    }
    console.log('================================');

    // MOSTRAR SECCIÓN SOLO SI HAY AL MENOS UNA CUENTA
if (tienePlin || tieneYape || tieneBancos) {
  let lineas = 0;
  if (tieneYape) lineas++;
  if (tienePlin) lineas++;
  lineas += bancosArray.length;

  let altura = 8 + (lineas * 5); // ✅ De "10 + lineas*6" a "8 + lineas*5" (más compacto)
  
  // ✅ SOLO MOSTRAR SI HAY ESPACIO MÍNIMO DE 25mm
  if (y + altura < pageHeight - 45) { // Menos estricto (antes: y + altura + 25)
  dibujarCaja(margin, y, contentWidth, altura, 'CUENTAS DISPONIBLES PARA PAGO');
  
    
    let yPago = y + 10; // De 12 a 10

    doc.setFontSize(8); // De 9 a 8
    doc.setTextColor(negro[0], negro[1], negro[2]);

    // YAPE
    if (tieneYape && yPago < pageHeight - 35) {
      doc.setFont('helvetica', 'bold');
      doc.text('YAPE:', margin + 3, yPago);
      doc.setFont('helvetica', 'normal');
      doc.text(yape, margin + 20, yPago);
      yPago += 5; // De 6 a 5
    }

    // PLIN
    if (tienePlin && yPago < pageHeight - 35) {
      doc.setFont('helvetica', 'bold');
      doc.text('PLIN:', margin + 3, yPago);
      doc.setFont('helvetica', 'normal');
      doc.text(plin, margin + 20, yPago);
      yPago += 5; // De 6 a 5
    }

    // BANCOS
    bancosArray.forEach((banco: any) => {
      if (!banco || typeof banco !== 'object') return;
      if (yPago >= pageHeight - 35) return;
      
      const nombreBanco = banco.nombre || 'Banco';
      const cuentaBanco = banco.cuenta || '';
      const cciBanco = banco.cci || '';
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${nombreBanco}:`, margin + 3, yPago);
      doc.setFont('helvetica', 'normal');
      
      let textoBanco = `Cta: ${cuentaBanco}`;
      if (cciBanco && String(cciBanco).trim() !== '') {
        textoBanco += ` | CCI: ${cciBanco}`;
      }
      
      doc.text(textoBanco, margin + 30, yPago);
      yPago += 5; // De 6 a 5
    });

    y += altura + 3; // De +4 a +3
  } else {
  // Si no cabe completo, mostrar al menos lo esencial
  const alturaMinima = 8 + (Math.min(lineas, 2) * 5); // Máximo 2 líneas
  if (y + alturaMinima < pageHeight - 35) {
    dibujarCaja(margin, y, contentWidth, alturaMinima, 'CUENTAS DISPONIBLES PARA PAGO');
    
    let yPago = y + 10;
    doc.setFontSize(8);
    doc.setTextColor(negro[0], negro[1], negro[2]);

    // Mostrar solo los primeros 2
    let contadorMostrados = 0;
    
    if (tieneYape && contadorMostrados < 2) {
      doc.setFont('helvetica', 'bold');
      doc.text('YAPE:', margin + 3, yPago);
      doc.setFont('helvetica', 'normal');
      doc.text(yape, margin + 20, yPago);
      yPago += 5;
      contadorMostrados++;
    }

    if (tienePlin && contadorMostrados < 2) {
      doc.setFont('helvetica', 'bold');
      doc.text('PLIN:', margin + 3, yPago);
      doc.setFont('helvetica', 'normal');
      doc.text(plin, margin + 20, yPago);
      contadorMostrados++;
    }

    y += alturaMinima + 3;
  } else {
    console.log('⚠️ NO HAY ESPACIO PARA CUENTAS');
  }
}}


    // ==================== NOTA ====================
if (config.notaFooter && y + 10 < pageHeight - 30) { // ✅ De 12 a 10
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(margin, y, contentWidth, 10, 'F'); // ✅ De 12 a 10
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, contentWidth, 10); // ✅ De 12 a 10

  doc.setFontSize(6.5); // ✅ De 7 a 6.5
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
  const nota = doc.splitTextToSize(config.notaFooter, contentWidth - 6);
  doc.text(nota.slice(0, 2), margin + 3, y + 4);

  y += 13; // ✅ De 15 a 13
}

    // ==================== FIRMAS ====================

    const yFirma = pageHeight - 22;

    doc.setDrawColor(180, 180, 180);
    doc.line(margin + 10, yFirma, margin + 70, yFirma);
    doc.line(pageWidth - margin - 70, yFirma, pageWidth - margin - 10, yFirma);

    doc.setFontSize(8);
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    doc.text('Firma del Cliente', margin + 40, yFirma + 5, { align: 'center' });
    doc.text('Firma del Tecnico', pageWidth - margin - 40, yFirma + 5, { align: 'center' });

    doc.setFontSize(7);
    doc.text(
      `Documento generado el ${new Date().toLocaleString('es-PE')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    // Generar
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="guia-${servicio.numeroServicio}.pdf"`,
      },
    });
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}