"use client";

import { useState, useTransition } from "react";
import { useNotification } from "@/contexts/notification-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, Bell, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { SystemSettings } from "@/generated/prisma/client";
import { adminUpdateSystemSettings } from "@/actions/admin/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminSettingsClientProps {
  initialSettings: SystemSettings;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const { showSuccess } = useNotification();
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState(initialSettings);
  const [newHoliday, setNewHoliday] = useState("");
  const [, setNotifications] = useState(initialSettings.notificationsEnabled);

  const handleSaveGeneral = () => {
    startTransition(async () => {
      await adminUpdateSystemSettings({
        workStartTime: settings.workStartTime,
        workEndTime: settings.workEndTime,
        maxSessionEndTime: settings.maxSessionEndTime,
        breakDuration: settings.breakDuration,
        overtimeThreshold: settings.overtimeThreshold,
        holidays: (settings.holidays as string[]) ?? [],
      });
      showSuccess("✅ Paramètres généraux enregistrés");
    });
  };

  const handleAddHoliday = () => {
    if (newHoliday) {
      const updatedHolidays = [...((settings.holidays as string[]) ?? []), newHoliday].sort();
      setSettings({ ...settings, holidays: updatedHolidays});
      setNewHoliday("");
      startTransition(async () => {
        await adminUpdateSystemSettings({ holidays: updatedHolidays });
        showSuccess("✅ Jour férié ajouté");
      });
    }
  };

  const handleRemoveHoliday = (date: string) => {
    const updatedHolidays = ((settings.holidays as string[]) ?? []).filter((h) => h !== date);
    setSettings({ ...settings, holidays: updatedHolidays });
    startTransition(async () => {
      await adminUpdateSystemSettings({ holidays: updatedHolidays });
      showSuccess("✅ Jour férié supprimé");
    });
  };

  const handleToggleNotifications = (value: boolean) => {
    setNotifications(value);
    setSettings({ ...settings, notificationsEnabled: value });
    startTransition(async () => {
      await adminUpdateSystemSettings({ notificationsEnabled: value });
      showSuccess("✅ Paramètres de notifications mis à jour");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres système</h1>
        <p className="text-muted-foreground">Configuration globale de l&apos;application</p>
      </div>

      <Tabs defaultValue="work">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="work" className="text-xs md:text-sm">
            Horaires de travail
          </TabsTrigger>
          <TabsTrigger value="overtime" className="text-xs md:text-sm">
            Heures supplémentaires
          </TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs md:text-sm">
            Jours fériés
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="danger" className="text-xs md:text-sm text-destructive">
            Zone de danger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horaires de travail
              </CardTitle>
              <CardDescription>Définissez les horaires standards de l&apos;entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={settings.workStartTime}
                    onChange={(e) =>
                      setSettings({ ...settings, workStartTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxSessionEndTime">Heure limite de pointage</Label>
                  <Input
                    id="maxSessionEndTime"
                    type="time"
                    value={settings.maxSessionEndTime ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, maxSessionEndTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={settings.workEndTime}
                    onChange={(e) =>
                      setSettings({ ...settings, workEndTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="breakDuration">Pause (minutes)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    value={settings.breakDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        breakDuration: parseInt(e.target.value || "0", 10),
                      })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSaveGeneral} disabled={isPending}>
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Heures supplémentaires
              </CardTitle>
              <CardDescription>Configuration du calcul des heures sup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="overtimeThreshold">Seuil quotidien (heures)</Label>
                <Input
                  id="overtimeThreshold"
                  type="number"
                  value={settings.overtimeThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      overtimeThreshold: parseInt(e.target.value || "0", 10),
                    })
                  }
                  className="max-w-xs"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Au-delà de ce seuil, les heures sont comptabilisées comme heures supplémentaires
                </p>
              </div>
              <Button onClick={handleSaveGeneral} disabled={isPending}>
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Jours fériés
              </CardTitle>
              <CardDescription>Gérez la liste des jours fériés de l&apos;année</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleAddHoliday} disabled={isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(settings.holidays as string[]).map((date) => (
                  <Badge
                    key={date}
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    {new Date(date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    <button
                      onClick={() => handleRemoveHoliday(date)}
                      className="ml-2 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Paramètres des notifications système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-base">
                    Activer les notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications pour les événements importants
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer des emails pour les événements critiques
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Alertes de retard</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier les managers des retards de leur équipe
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Rappels de pointage</Label>
                  <p className="text-sm text-muted-foreground">
                    Rappeler aux employés de pointer en sortie
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-4 space-y-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zone de danger</CardTitle>
              <CardDescription>Actions irréversibles sur le système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    Réinitialiser tous les pointages
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Réinitialiser tous les pointages ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est potentiellement irréversible et supprimera l&apos;historique de pointage
                      de tous les utilisateurs. Assurez-vous d&apos;avoir effectué les exports nécessaires avant
                      de continuer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction>Confirmer la réinitialisation</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    Exporter toutes les données
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Exporter toutes les données ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L&apos;export peut contenir des informations sensibles. Vérifiez que vous respectez les
                      politiques internes de sécurité et de confidentialité avant de partager ce fichier.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction>Confirmer l&apos;export</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start">
                    Supprimer toutes les données (⚠️ Irréversible)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer définitivement toutes les données ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette opération supprimera l&apos;ensemble des données du système et ne peut pas être annulée.
                      Cette action ne doit être effectuée qu&apos;en dernier recours et après validation formelle.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Oui, supprimer toutes les données
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
