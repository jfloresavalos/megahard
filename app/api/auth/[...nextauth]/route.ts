import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// ✅ 1. SACA LAS OPCIONES A SU PROPIA CONSTANTE Y EXPÓRTALA
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.usuario.findUnique({
          where: { username: credentials.username },
          include: { sede: true }
        })

        if (!user || !user.activo) {
          return null
        }

        // ✅ Comparación con bcrypt
        const isValidPassword = await bcrypt.compare(credentials.password, user.password)
        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          username: user.username,
          nombre: user.nombre,
          rol: user.rol,
          sedeId: user.sedeId,
          sedeName: user.sede?.nombre || null
        } as NextAuthUser
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.nombre = (user as any).nombre
        token.rol = (user as any).rol
        token.sedeId = (user as any).sedeId
        token.sedeName = (user as any).sedeName
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.nombre = token.nombre as string
        session.user.rol = token.rol as string
        session.user.sedeId = token.sedeId as string | null
        session.user.sedeName = token.sedeName as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: "jwt"
  }
};

// ✅ 2. PASA LAS OPCIONES A NextAuth
const handler = NextAuth(authOptions);

// ✅ 3. MANTÉN TUS EXPORTS
export { handler as GET, handler as POST };