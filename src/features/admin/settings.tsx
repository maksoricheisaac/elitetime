"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNotification } from "@/contexts/notification-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, Bell, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import {
  systemSettingsFormSchema,
  type SystemSettingsFormInput,
  type SystemSettingsFormValues,
} from "@/schemas/admin/forms/settings";

interface AdminSettingsClientProps {
  initialSettings: SystemSettings;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const { showSuccess, showError } = useNotification();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SystemSettingsFormInput, unknown, SystemSettingsFormValues>({
    resolver: zodResolver(systemSettingsFormSchema),
    defaultValues: {
      workStartTime: initialSettings.workStartTime,
      workEndTime: initialSettings.workEndTime,
      maxSessionEndTime: initialSettings.maxSessionEndTime ?? "",
      breakDuration: initialSettings.breakDuration,
      overtimeThreshold: initialSettings.overtimeThreshold,
      holidays: (initialSettings.holidays as string[]) ?? [],
      notificationsEnabled: initialSettings.notificationsEnabled,
      ldapSyncEnabled: initialSettings.ldapSyncEnabled,
      ldapSyncIntervalMinutes: initialSettings.ldapSyncIntervalMinutes,
      newHoliday: "",
    },
    mode: "onSubmit",
  });

  const applyZodErrors = (error: z.ZodError<unknown>) => {
    error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (!field || typeof field !== "string") return;
      form.setError(field as keyof SystemSettingsFormValues, {
        type: "manual",
        message: issue.message,
      });
    });
  };

  const handleSaveGeneral = () => {
    void form.handleSubmit((values) => {
      const parsed = systemSettingsFormSchema.safeParse(values);
      if (!parsed.success) {
        applyZodErrors(parsed.error);
        showError("Veuillez corriger les champs en erreur.");
        return;
      }
      startTransition(async () => {
        try {
          await adminUpdateSystemSettings({
            workStartTime: parsed.data.workStartTime,
            workEndTime: parsed.data.workEndTime,
            maxSessionEndTime: parsed.data.maxSessionEndTime || undefined,
            breakDuration: parsed.data.breakDuration,
            overtimeThreshold: parsed.data.overtimeThreshold,
            holidays: parsed.data.holidays,
          });
          showSuccess("Paramètres généraux enregistrés");
        } catch {
          showError("Impossible d'enregistrer les paramètres pour le moment.");
        }
      });
    })();
  };

  const handleAddHoliday = () => {
    const raw = form.getValues("newHoliday") ?? "";
    if (!raw) return;

    void form.trigger(["newHoliday", "holidays"]).then((ok) => {
      if (!ok) return;
      const current = form.getValues("holidays") ?? [];
      const updated = [...current, raw].sort();
      const parsed = systemSettingsFormSchema.pick({ holidays: true }).safeParse({
        holidays: updated,
      });
      if (!parsed.success) {
        applyZodErrors(parsed.error);
        showError("La date sélectionnée est invalide.");
        return;
      }
      form.setValue("holidays", updated, { shouldDirty: true });
      form.setValue("newHoliday", "", { shouldDirty: true });

      startTransition(async () => {
        try {
          await adminUpdateSystemSettings({ holidays: updated });
          showSuccess("Jour férié ajouté");
        } catch {
          showError("Impossible d'ajouter ce jour férié.");
        }
      });
    });
  };

  const handleRemoveHoliday = (date: string) => {
    const current = form.getValues("holidays") ?? [];
    const updated = current.filter((h) => h !== date);
    form.setValue("holidays", updated, { shouldDirty: true });

    void form.trigger("holidays").then((ok) => {
      if (!ok) return;
      const parsed = systemSettingsFormSchema.pick({ holidays: true }).safeParse({
        holidays: updated,
      });
      if (!parsed.success) {
        applyZodErrors(parsed.error);
        showError("La liste des jours fériés est invalide.");
        return;
      }
      startTransition(async () => {
        try {
          await adminUpdateSystemSettings({ holidays: updated });
          showSuccess("✅ Jour férié supprimé");
        } catch {
          showError("Impossible de supprimer ce jour férié.");
        }
      });
    });
  };

  const handleToggleNotifications = (value: boolean) => {
    form.setValue("notificationsEnabled", value, { shouldDirty: true });
    void form.trigger("notificationsEnabled").then((ok) => {
      if (!ok) return;
      const parsed = systemSettingsFormSchema.pick({ notificationsEnabled: true }).safeParse({
        notificationsEnabled: value,
      });
      if (!parsed.success) {
        applyZodErrors(parsed.error);
        showError("La valeur des notifications est invalide.");
        return;
      }
      startTransition(async () => {
        try {
          await adminUpdateSystemSettings({ notificationsEnabled: value });
          showSuccess("Paramètres de notifications mis à jour");
        } catch {
          showError("Impossible de mettre à jour les notifications.");
        }
      });
    });
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const holidays = form.watch("holidays");

  return (
    <Form {...form}>
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
          <TabsTrigger value="ldap" className="text-xs md:text-sm">
            LDAP / AD
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
                <FormField
                  control={form.control}
                  name="workStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de début</FormLabel>
                      <FormControl>
                        <Input id="startTime" type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxSessionEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure limite de pointage</FormLabel>
                      <FormControl>
                        <Input
                          id="maxSessionEndTime"
                          type="time"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de fin</FormLabel>
                      <FormControl>
                        <Input id="endTime" type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="breakDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pause (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          id="breakDuration"
                          type="number"
                          value={field.value == null ? "" : String(field.value)}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button className="cursor-pointer" type="button" onClick={handleSaveGeneral} disabled={isPending}>
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ldap" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Synchronisation LDAP / Active Directory
              </CardTitle>
              <CardDescription>
                Configuration de la synchronisation automatique des employés depuis l&apos;annuaire LDAP/AD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Activer la synchronisation automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Lorsque cette option est activée, un job serveur synchronise régulièrement la liste des employés
                    avec l&apos;annuaire LDAP/AD.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="ldapSyncEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          id="ldapSyncEnabled"
                          checked={field.value}
                          onCheckedChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ldapSyncIntervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalle de synchronisation (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          id="ldapSyncIntervalMinutes"
                          type="number"
                          min={5}
                          max={1440}
                          value={field.value == null ? "" : String(field.value)}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fréquence à laquelle le job serveur tente une synchronisation automatique.
                      </p>
                    </FormItem>
                  )}
                />

                {initialSettings.ldapLastSyncAt && (
                  <div className="space-y-1">
                    <Label className="text-base">Dernière synchronisation réussie</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(initialSettings.ldapLastSyncAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="cursor-pointer"
                type="button"
                onClick={() => {
                  void form.handleSubmit((values) => {
                    const parsed = systemSettingsFormSchema
                      .pick({ ldapSyncEnabled: true, ldapSyncIntervalMinutes: true })
                      .safeParse(values);
                    if (!parsed.success) {
                      applyZodErrors(parsed.error);
                      showError("Veuillez corriger les champs LDAP en erreur.");
                      return;
                    }
                    startTransition(async () => {
                      try {
                        await adminUpdateSystemSettings({
                          ldapSyncEnabled: parsed.data.ldapSyncEnabled,
                          ldapSyncIntervalMinutes: parsed.data.ldapSyncIntervalMinutes,
                        });
                        showSuccess("Paramètres LDAP enregistrés");
                      } catch {
                        showError("Impossible d'enregistrer les paramètres LDAP pour le moment.");
                      }
                    });
                  })();
                }}
                disabled={isPending}
              >
                Enregistrer les paramètres LDAP
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
              <FormField
                control={form.control}
                name="overtimeThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil quotidien (heures)</FormLabel>
                    <FormControl>
                      <Input
                        id="overtimeThreshold"
                        type="number"
                        className="max-w-xs"
                        value={field.value == null ? "" : String(field.value)}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Au-delà de ce seuil, les heures sont comptabilisées comme heures supplémentaires
                    </p>
                  </FormItem>
                )}
              />
              <Button className="cursor-pointer" type="button" onClick={handleSaveGeneral} disabled={isPending}>
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
                <FormField
                  control={form.control}
                  name="newHoliday"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel className="sr-only">Nouveau jour férié</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="cursor-pointer" type="button" onClick={handleAddHoliday} disabled={isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {holidays.map((date) => (
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
                      type="button"
                      onClick={() => handleRemoveHoliday(date)}
                      className="ml-2 hover:text-destructive cursor-pointer"
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
                <FormField
                  control={form.control}
                  name="notificationsEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          id="notifications"
                          checked={field.value}
                          onCheckedChange={handleToggleNotifications}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                  <Button variant="outline" className="w-full justify-start cursor-pointer">
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
                  <Button variant="outline" className="w-full justify-start cursor-pointer">
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
                  <Button variant="destructive" className="w-full justify-start cursor-pointer">
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
  </Form>
  );
}
