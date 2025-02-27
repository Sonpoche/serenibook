// src/components/profile/schedule-tab.tsx
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, X, Clock } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

// Interface pour typifier le slot de temps
interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  professionalId: string;
}

// Interface pour typifier les données du profil
interface ProfileData {
  id?: string;
  name?: string;
  professionalProfile?: {
    id?: string;
    autoConfirmBookings?: boolean;
  };
}

const timeSlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format d'heure invalide (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format d'heure invalide (HH:MM)"),
}).refine(
  (data) => {
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return endMinutes > startMinutes;
  },
  {
    message: "L'heure de fin doit être ultérieure à l'heure de début",
    path: ["endTime"]
  }
);

type TimeSlotFormValues = z.infer<typeof timeSlotSchema>

const dayNames = [
  "Dimanche",
  "Lundi", 
  "Mardi", 
  "Mercredi", 
  "Jeudi", 
  "Vendredi", 
  "Samedi"
];

export default function ScheduleTab({ profileData }: { profileData: ProfileData }) {
  const { data: session } = useSession()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoConfirm, setAutoConfirm] = useState(false)

  // Configuration du formulaire
  const form = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      dayOfWeek: 1, // Lundi par défaut
      startTime: "09:00",
      endTime: "17:00",
    }
  })

  // Chargement des créneaux horaires
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!session?.user?.id) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${session.user.id}/availability`)
        
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des horaires")
        }
        
        const data = await response.json()
        setTimeSlots(data.timeSlots || [])
        setAutoConfirm(data.autoConfirmBookings || false)
      } catch (error) {
        console.error("Erreur:", error)
        toast.error("Erreur lors du chargement des horaires")
      } finally {
        setLoading(false)
      }
    }
    
    fetchAvailability()
  }, [session?.user?.id])

  // Soumission du formulaire d'ajout de créneau
  async function onSubmit(data: TimeSlotFormValues) {
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/users/${session?.user?.id}/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout du créneau horaire")
      }

      const newTimeSlot = await response.json()
      setTimeSlots(prev => [...prev, newTimeSlot])
      
      toast.success("Créneau horaire ajouté avec succès")
      form.reset()
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de l'ajout du créneau horaire")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Suppression d'un créneau horaire
  async function deleteTimeSlot(id: string) {
    try {
      const response = await fetch(`/api/users/${session?.user?.id}/availability/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression du créneau horaire")
      }

      setTimeSlots(prev => prev.filter(slot => slot.id !== id))
      toast.success("Créneau horaire supprimé avec succès")
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la suppression du créneau horaire")
    }
  }

  // Mise à jour de l'option d'auto-confirmation
  async function toggleAutoConfirm() {
    try {
      const newValue = !autoConfirm
      
      const response = await fetch(`/api/users/${session?.user?.id}/settings/auto-confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autoConfirmBookings: newValue }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du paramètre")
      }

      setAutoConfirm(newValue)
      toast.success("Paramètre mis à jour avec succès")
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la mise à jour du paramètre")
    }
  }

  // Formatage de l'heure pour l'affichage
  const formatTime = (time: string) => {
    // Convertir de 24h à 12h avec AM/PM
    const [hour, minute] = time.split(':').map(Number);
    return new Date(0, 0, 0, hour, minute).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Horaires de travail</CardTitle>
          <CardDescription>
            Définissez vos horaires habituels pour chaque jour de la semaine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Option d'auto-confirmation */}
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Confirmation automatique</h3>
              <p className="text-sm text-gray-600">
                Confirmer automatiquement les réservations effectuées pendant vos horaires d'ouverture
              </p>
            </div>
            <Switch 
              checked={autoConfirm} 
              onCheckedChange={toggleAutoConfirm}
            />
          </div>
          
          {/* Formulaire d'ajout de créneau */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Jour de la semaine */}
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jour</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un jour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dayNames.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Heure de début */}
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de début</FormLabel>
                      <FormControl>
                        <Input 
                          // Utiliser text au lieu de time pour la compatibilité
                          type="text" 
                          placeholder="HH:MM"
                          pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Heure de fin */}
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de fin</FormLabel>
                      <FormControl>
                        <Input 
                          // Utiliser text au lieu de time pour la compatibilité
                          type="text" 
                          placeholder="HH:MM"
                          pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un créneau
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
          
          {/* Liste des créneaux horaires */}
          <div className="mt-6">
            <h3 className="font-medium text-lg mb-4">Créneaux horaires actuels</h3>
            
            {timeSlots.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Vous n'avez pas encore défini de créneaux horaires.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {timeSlots
                  .sort((a, b) => (a.dayOfWeek === b.dayOfWeek) 
                    ? a.startTime.localeCompare(b.startTime) 
                    : a.dayOfWeek - b.dayOfWeek)
                  .map((slot) => (
                    <div 
                      key={slot.id} 
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-24 font-medium">{dayNames[slot.dayOfWeek]}</div>
                        <div>
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteTimeSlot(slot.id)}
                        aria-label="Supprimer ce créneau"
                      >
                        <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}