import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando catálogos de servicios técnicos...')

  // Problemas comunes iniciales
  const problemasIniciales = [
    { nombre: 'Equipo no enciende', descripcion: 'El equipo no da señales de encendido' },
    { nombre: 'No levanta imagen', descripcion: 'Enciende pero la pantalla permanece negra' },
    { nombre: 'Pantalla rota', descripcion: 'Daño físico en la pantalla' },
    { nombre: 'Bisagra rota', descripcion: 'Problema en las bisagras de la laptop' },
    { nombre: 'Sistema operativo dañado', descripcion: 'Windows no inicia correctamente' },
    { nombre: 'Problema de impresión', descripcion: 'No imprime o imprime con defectos' },
    { nombre: 'Equipo bota luces rojas', descripcion: 'Indicadores de error en impresora' },
    { nombre: 'No pasa hojas', descripcion: 'Impresora no jala el papel' },
    { nombre: 'Problema de cabezal', descripcion: 'Cabezal de impresión obstruido o dañado' },
    { nombre: 'Mantenimiento preventivo', descripcion: 'Limpieza y optimización general' },
    { nombre: 'Recuperación de datos', descripcion: 'Rescate de información' },
    { nombre: 'Lentitud general', descripcion: 'El equipo funciona muy lento' },
    { nombre: 'Instalación de software', descripcion: 'Instalación de programas o drivers' },
    { nombre: 'Virus o malware', descripcion: 'Infección de virus' },
    { nombre: 'Problemas de conectividad', descripcion: 'WiFi, Bluetooth o red no funciona' },
    { nombre: 'Batería no carga', descripcion: 'Problemas con la batería o cargador' },
    { nombre: 'Teclado no funciona', descripcion: 'Teclas no responden' },
    { nombre: 'Touchpad no funciona', descripcion: 'Mouse táctil no responde' },
    { nombre: 'Sobrecalentamiento', descripcion: 'El equipo se calienta excesivamente' },
    { nombre: 'Ventilador ruidoso', descripcion: 'Ruido anormal del ventilador' }
  ]

  for (const problema of problemasIniciales) {
    await prisma.problemaComun.upsert({
      where: { nombre: problema.nombre },
      update: {},
      create: problema
    })
  }

  console.log(`✅ ${problemasIniciales.length} problemas comunes creados`)

  // Servicios adicionales iniciales
  const serviciosIniciales = [
    { nombre: 'Disco SSD 120GB', descripcion: 'Instalación de disco sólido 120GB', precioSugerido: 120 },
    { nombre: 'Disco SSD 240GB', descripcion: 'Instalación de disco sólido 240GB', precioSugerido: 180 },
    { nombre: 'Disco SSD 480GB', descripcion: 'Instalación de disco sólido 480GB', precioSugerido: 280 },
    { nombre: 'Memoria RAM 4GB', descripcion: 'Instalación de módulo RAM 4GB', precioSugerido: 80 },
    { nombre: 'Memoria RAM 8GB', descripcion: 'Instalación de módulo RAM 8GB', precioSugerido: 120 },
    { nombre: 'Memoria RAM 16GB', descripcion: 'Instalación de módulo RAM 16GB', precioSugerido: 200 },
    { nombre: 'Mantenimiento completo', descripcion: 'Limpieza física y optimización', precioSugerido: 60 },
    { nombre: 'Instalación de Windows', descripcion: 'Formateo e instalación de Windows', precioSugerido: 50 },
    { nombre: 'Instalación de Office', descripcion: 'Microsoft Office completo', precioSugerido: 30 },
    { nombre: 'Antivirus premium', descripcion: 'Instalación de antivirus licenciado', precioSugerido: 40 },
    { nombre: 'Cargador universal', descripcion: 'Cargador compatible', precioSugerido: 50 },
    { nombre: 'Pasta térmica', descripcion: 'Cambio de pasta térmica', precioSugerido: 20 },
    { nombre: 'Cambio de teclado', descripcion: 'Reemplazo de teclado completo', precioSugerido: 150 },
    { nombre: 'Cambio de pantalla', descripcion: 'Reemplazo de pantalla LCD', precioSugerido: 300 },
    { nombre: 'Recuperación de datos', descripcion: 'Servicio de recuperación de información', precioSugerido: 100 },
    { nombre: 'Instalación de programas', descripcion: 'Instalación de software adicional', precioSugerido: 20 },
    { nombre: 'Configuración de red', descripcion: 'Configuración de WiFi y red', precioSugerido: 30 }
  ]

  for (const servicio of serviciosIniciales) {
    await prisma.servicioAdicionalCatalogo.upsert({
      where: { nombre: servicio.nombre },
      update: {},
      create: servicio
    })
  }

  console.log(`✅ ${serviciosIniciales.length} servicios adicionales creados`)

  console.log('🎉 Catálogos creados exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })