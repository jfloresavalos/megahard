import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { montoPago, metodoPago } = await request.json()
    const { id: servicioId } = await params

    // Validaciones básicas
    if (!montoPago || montoPago <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!metodoPago) {
      return NextResponse.json(
        { success: false, error: 'Debe especificar el método de pago' },
        { status: 400 }
      )
    }

    // Obtener el servicio actual
    const servicio = await prisma.servicioTecnico.findUnique({
      where: { id: servicioId }
    })

    if (!servicio) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el servicio esté ENTREGADO
    if (servicio.estado !== 'ENTREGADO') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden registrar pagos para servicios entregados' },
        { status: 400 }
      )
    }

    // Verificar que haya saldo pendiente
    const saldoActual = Number(servicio.saldo)
    if (saldoActual <= 0) {
      return NextResponse.json(
        { success: false, error: 'Este servicio no tiene saldo pendiente' },
        { status: 400 }
      )
    }

    // Verificar que el monto no exceda el saldo
    if (montoPago > saldoActual) {
      return NextResponse.json(
        { success: false, error: `El monto no puede ser mayor al saldo pendiente (S/ ${saldoActual.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Calcular nuevo aCuenta y saldo
    const nuevoACuenta = Number(servicio.aCuenta) + montoPago
    const nuevoSaldo = saldoActual - montoPago

    // Actualizar el servicio
    const servicioActualizado = await prisma.servicioTecnico.update({
      where: { id: servicioId },
      data: {
        aCuenta: nuevoACuenta,
        saldo: nuevoSaldo,
        // Si paga todo el saldo, guardar el método de pago del saldo
        metodoPagoSaldo: nuevoSaldo === 0 ? metodoPago : servicio.metodoPagoSaldo,
        // Registrar fecha del último pago
        fechaUltimoPago: new Date()
      }
    })

    console.log(`✅ Pago registrado: S/ ${montoPago} - Nuevo saldo: S/ ${nuevoSaldo}`)

    return NextResponse.json({
      success: true,
      message: 'Pago registrado correctamente',
      nuevoACuenta,
      nuevoSaldo,
      metodoPago
    })

  } catch (error: any) {
    console.error('❌ Error al registrar pago:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
