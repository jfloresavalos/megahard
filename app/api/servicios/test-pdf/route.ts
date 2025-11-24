import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('✅ TEST PDF ENDPOINT ALCANZADO');
  return NextResponse.json({ mensaje: 'Endpoint test funcionando' }, { status: 200 });
}
