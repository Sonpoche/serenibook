// src/app/api/users/[id]/availability/[availabilityId]/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma/client"
import { auth } from "@/lib/auth/auth.config"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string, availabilityId: string } }
) {
  try {
    const { id: userId, availabilityId } = params
    
    // Vérifier l'authentification
    const session = await auth()
    if (!session?.user?.id || (session.user.id !== userId)) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }
    
    // Récupérer le profil professionnel
    const professional = await prisma.professional.findUnique({
      where: { userId },
    })
    
    if (!professional) {
      return NextResponse.json(
        { error: "Profil professionnel non trouvé" },
        { status: 404 }
      )
    }
    
    // Vérifier que le créneau appartient au praticien
    const timeSlot = await prisma.availability.findUnique({
      where: { id: availabilityId },
    })
    
    if (!timeSlot || timeSlot.professionalId !== professional.id) {
      return NextResponse.json(
        { error: "Créneau horaire non trouvé ou non autorisé" },
        { status: 404 }
      )
    }
    
    // Supprimer le créneau horaire
    await prisma.availability.delete({
      where: { id: availabilityId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur dans DELETE /api/users/[id]/availability/[availabilityId]:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}