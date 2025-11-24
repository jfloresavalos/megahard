import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    nombre: string
    rol: string
    sedeId: string | null
    sedeName?: string | null
  }

  interface Session {
    user: {
      id: string
      username: string
      nombre: string
      rol: string
      sedeId: string | null
      sedeName?: string | null
    }
  }
}