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

    // ==================== EQUIPO Y DETALLES ====================

// ✅ CALCULAR ALTURA DINÁMICA PARA "DETALLES DE RECEPCION"
let alturaDetalles = 30; // Altura base más compacta (antes 35)

if (servicio.otrosDetalles && servicio.otrosDetalles.trim()) {
  const detallesLineas = doc.splitTextToSize(servicio.otrosDetalles, (contentWidth - 4) / 2 - 10);
  const lineasNecesarias = Math.min(detallesLineas.length, 3); // Máximo 3 líneas
  alturaDetalles = 30 + (lineasNecesarias * 3.5) + 6;
}

const alturaMaxima = Math.max(30, alturaDetalles);

const anchoCol = (contentWidth - 4) / 2;

dibujarCaja(margin, y, anchoCol, alturaMaxima, 'DATOS DEL EQUIPO');

let yEquipo = y + 10; // Más compacto (antes 12)

doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.text('Tipo:', margin + 3, yEquipo);
doc.setFont('helvetica', 'normal');
doc.text(servicio.tipoEquipo, margin + 13, yEquipo);

yEquipo += 5;
doc.setFont('helvetica', 'bold');
doc.text('Marca/Modelo:', margin + 3, yEquipo);
doc.setFont('helvetica', 'normal');
const marca = doc.splitTextToSize(servicio.marcaModelo || 'N/A', anchoCol - 6);
doc.text(marca, margin + 3, yEquipo + 4);

yEquipo += marca.length * 4 + 3;
doc.setFont('helvetica', 'bold');
doc.text('Estado:', margin + 3, yEquipo);
doc.setFont('helvetica', 'normal');
doc.text(servicio.estado, margin + 18, yEquipo);

dibujarCaja(margin + anchoCol + 4, y, anchoCol, alturaMaxima, 'DETALLES DE RECEPCION');

let yDet = y + 10; // Más compacto (antes 12)
const xDet = margin + anchoCol + 7;

const detalles = [
  { label: 'Sin cargador', checked: servicio.dejoSinCargador },
  { label: 'Con accesorios', checked: servicio.dejoAccesorios },
  { label: 'Falta pernos', checked: servicio.faltaPernos },
  { label: 'Aranaduras', checked: servicio.tieneAranaduras },
];

doc.setFontSize(8);
detalles.forEach((det) => {
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(xDet, yDet - 2.5, 3.5, 3.5);

  if (det.checked) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', xDet + 0.8, yDet + 0.5);
  }

  doc.setTextColor(negro[0], negro[1], negro[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(det.label, xDet + 5, yDet);

  yDet += 5; // Más compacto (antes 5.5)
});

// ✅ MOSTRAR OTROS DETALLES (CON ESPACIO SUFICIENTE)
if (servicio.otrosDetalles && servicio.otrosDetalles.trim()) {
  yDet += 2;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(negro[0], negro[1], negro[2]);
  doc.text('OTROS DETALLES:', xDet, yDet);
  
  yDet += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const detallesLineas = doc.splitTextToSize(servicio.otrosDetalles, anchoCol - 10);
  
  const lineasAMostrar = detallesLineas.slice(0, 3);
  lineasAMostrar.forEach((linea: string) => {
    doc.text(linea, xDet, yDet);
    yDet += 3.5;
  });
}

y += alturaMaxima + 3; // Más compacto (antes +4)

// ==================== PROBLEMA ====================

let textoProblema = "";
const tieneBadges = problemasNombres.length > 0;
const tieneOtros = servicio.otrosProblemas && servicio.otrosProblemas.trim() !== "";

// 1. Construir el texto (SIN TÍTULOS REPETIDOS)
if (tieneBadges) {
  // Directamente los bullets
  textoProblema += problemasNombres.map((n: string) => `• ${n}`).join("\n");
}

if (tieneOtros) {
  if (tieneBadges) textoProblema += "\n\n"; // Añadir espacio
  // Directamente el texto adicional
  textoProblema += servicio.otrosProblemas;
}

// 2. Fallback: Si los campos nuevos están vacíos, usar el antiguo
if (!tieneBadges && !tieneOtros) {
  textoProblema = servicio.descripcionProblema || "Sin descripción";
}

doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(negro[0], negro[1], negro[2]);

// 3. Calcular altura dinámica
const lineasProblema = doc.splitTextToSize(textoProblema, contentWidth - 6);
// 8mm de padding (arriba/abajo) + 4.5mm por cada línea de texto
const alturaProblemaBox = 8 + (lineasProblema.length * 4.5); 

// 4. Dibujar la caja y el texto
dibujarCaja(margin, y, contentWidth, alturaProblemaBox, 'DESCRIPCION DEL PROBLEMA');
doc.text(lineasProblema, margin + 3, y + 10); // 10mm desde el borde superior de la caja

y += alturaProblemaBox + 3; // Mover 'y' hacia abajo + 3mm de margen

// ==================== FIN DEL BLOQUE REEMPLAZADO ====================

    // ==================== SERVICIOS ====================

    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, y, contentWidth, 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('DETALLE DE SERVICIOS Y COSTOS', margin + 2, y + 5.5);

    y += 8;

    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageWidth - margin, y);
    doc.line(margin, y + 7, pageWidth - margin, y + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCION', margin + 2, y + 5);
    doc.text('COSTO', pageWidth - margin - 25, y + 5, { align: 'right' });

    y += 7;

    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 6);
    doc.setFont('helvetica', 'normal');
    doc.text('Servicio Tecnico Principal', margin + 2, y + 4);
    doc.text(`S/ ${Number(servicio.costoServicio || 0).toFixed(2)}`, pageWidth - margin - 2, y + 4, { align: 'right' });

    y += 6;

    // Servicios adicionales
    if (servicio.serviciosAdicionales && Array.isArray(servicio.serviciosAdicionales) && servicio.serviciosAdicionales.length > 0) {
      const adicionales = servicio.serviciosAdicionales as Array<any>;
      
      adicionales.forEach((adic) => {
        doc.rect(margin, y, contentWidth, 6);
        const nombre = adic.nombre || adic.descripcion || 'Servicio adicional';
        const precio = adic.precio || adic.costo || 0;
        doc.text(nombre, margin + 2, y + 4);
        doc.text(`S/ ${Number(precio).toFixed(2)}`, pageWidth - margin - 2, y + 4, { align: 'right' });
        y += 6;
      });
    }

    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageWidth - margin, y);

    y += 3;

    // ==================== TOTALES Y RESUMEN DE PAGOS ====================

    // Calcular montos
    const totalServicio = Number(servicio.total || 0);
    const pagado = Number(servicio.aCuenta || 0);
    const saldo = Number(servicio.saldo || 0);

    // Altura dinámica según si hay método de pago
    const tieneMetodoPago = servicio.metodoPago && servicio.metodoPago.trim() !== '';
    const alturaTotales = tieneMetodoPago ? 30 : 24;

    const anchoCajaTot = 65;
    const xTot = pageWidth - margin - anchoCajaTot;

    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(xTot, y, anchoCajaTot, alturaTotales, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(xTot, y, anchoCajaTot, alturaTotales);

    let yTot = y + 6;

    // TOTAL
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('TOTAL:', xTot + 3, yTot);
    doc.text(`S/ ${totalServicio.toFixed(2)}`, xTot + anchoCajaTot - 3, yTot, { align: 'right' });

    yTot += 6;

    // PAGADO (con método de pago si existe)
    doc.setFontSize(9);
    doc.setTextColor(grisMedio[0], grisMedio[1], grisMedio[2]);
    if (tieneMetodoPago) {
      doc.text(`Pagado (${servicio.metodoPago}):`, xTot + 3, yTot);
    } else {
      doc.text('Pagado:', xTot + 3, yTot);
    }
    doc.text(`S/ ${pagado.toFixed(2)}`, xTot + anchoCajaTot - 3, yTot, { align: 'right' });

    yTot += 1;
    doc.setDrawColor(180, 180, 180);
    doc.line(xTot + 3, yTot, xTot + anchoCajaTot - 3, yTot);

    yTot += 5;

    // SALDO
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(negro[0], negro[1], negro[2]);
    doc.text('SALDO:', xTot + 3, yTot);
    doc.text(`S/ ${saldo.toFixed(2)}`, xTot + anchoCajaTot - 3, yTot, { align: 'right' });

    y += alturaTotales + 4;

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