"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNotification } from "@/contexts/notification-context";
import { useRealtime } from "@/contexts/realtime-context";
import { AlertCircle, Clock, Coffee, TrendingUp, X } from "lucide-react";
import type { SafeUser } from "@/lib/session";
import type { Pointage } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { startEmployeePointage, endEmployeePointage } from "@/actions/employee/pointages";
import { formatDateFR } from "@/lib/date-utils";

interface Break {
	startTime: string;
	endTime?: string;
	duration?: number;
}

interface WeekStats {
	hours: number;
	lates: number;
	overtime: number;
}

interface EmployeeDashboardClientProps {
	user: SafeUser;
	todayPointage: Pointage | null;
	weekStats: WeekStats;
}

export default function EmployeeDashboardClient({
	user,
	todayPointage,
	weekStats,
}: EmployeeDashboardClientProps) {
	const { showSuccess, showInfo, showError } = useNotification();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [currentTime, setCurrentTime] = useState(new Date());
	const [breaks, setBreaks] = useState<Break[]>([]);
	const [isOnBreak, setIsOnBreak] = useState(false);
	const { emitLateAlert } = useRealtime();

	const currentHour = currentTime.getHours();
	const isInBreakTimeRange = currentHour >= 12 && currentHour < 14;

	const isActive = todayPointage?.isActive ?? false;

	useEffect(() => {
	const timer = setInterval(() => setCurrentTime(new Date()), 1000);
	return () => clearInterval(timer);
	}, []);

	const handlePointageEntry = () => {
		startTransition(async () => {
			try {
				const pointage = await startEmployeePointage(user.id);
				if (!pointage) {
					showError("Échec de l'enregistrement du pointage d'entrée.");
					return;
				}
				showSuccess(
					"Pointage d'entrée enregistré à " + currentTime.toLocaleTimeString("fr-FR"),
				);
				router.refresh();
			} catch (e) {
				console.error(e);
				showError("Une erreur est survenue lors du pointage d'entrée.");
			}
		});
	};

	const handlePointageExit = () => {
		startTransition(async () => {
			try {
				const pointage = await endEmployeePointage(user.id);
				if (!pointage) {
					showError("Échec de l'enregistrement du pointage de sortie.");
					return;
				}
				showSuccess(
					"Pointage de sortie enregistré à " + currentTime.toLocaleTimeString("fr-FR"),
				);
				router.refresh();
			} catch (e) {
				console.error(e);
				showError("Une erreur est survenue lors du pointage de sortie.");
			}
		});
	};

	const handleBreakStart = () => {
	const hour = currentTime.getHours();

	if (hour < 12 || hour >= 14) {
		showInfo("Les pauses ne peuvent être prises qu'entre 12h et 14h");
		return;
	}

	const newBreak: Break = {
		startTime: currentTime.toLocaleTimeString("fr-FR"),
	};
	setBreaks((prev) => [...prev, newBreak]);
	setIsOnBreak(true);
	showInfo("Pause démarrée à " + newBreak.startTime);
	};

	const handleBreakEnd = () => {
	setBreaks((prev) => {
		if (prev.length === 0) return prev;

		const updated = [...prev];
		const lastBreak = updated[updated.length - 1];
		const endTime = currentTime.toLocaleTimeString("fr-FR");

		const today = new Date();
		const todayISO = today.toISOString().split("T")[0];
		const startDate = new Date(`${todayISO}T${lastBreak.startTime}`);
		const endDate = new Date(`${todayISO}T${endTime}`);
		const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);

		updated[updated.length - 1] = {
		...lastBreak,
		endTime,
		duration,
		};

		showSuccess(`Pause terminée. Durée: ${duration} minutes`);
		setIsOnBreak(false);

		return updated;
	});
	};

	const { hours: weekHours, lates: weekLates, overtime: weekOvertime } = weekStats;
	const [showAlertCard, setShowAlertCard] = useState(
	todayPointage?.status === "late" || weekLates > 0 || weekOvertime > 0,
	);

	const WEEK_TARGET_HOURS = 40;

	let weekHoursLabel = "Dans la cible";
	let weekHoursLabelClass = "text-emerald-600";
	if (weekHours < WEEK_TARGET_HOURS - 5) {
	weekHoursLabel = "En dessous de la cible";
	weekHoursLabelClass = "text-amber-600";
	} else if (weekHours > WEEK_TARGET_HOURS + 5) {
	weekHoursLabel = "Au-dessus de la cible";
	weekHoursLabelClass = "text-primary";
	}

	let weekLatesLabel = "Aucun retard enregistré";
	let weekLatesLabelClass = "text-emerald-600";
	if (weekLates === 0) {
	weekLatesLabel = "Aucun retard enregistré";
	weekLatesLabelClass = "text-emerald-600";
	} else if (weekLates <= 2) {
	weekLatesLabel = "Quelques retards, à surveiller";
	weekLatesLabelClass = "text-amber-600";
	} else {
	weekLatesLabel = "Plusieurs retards cette semaine";
	weekLatesLabelClass = "text-destructive";
	}

	let weekOvertimeLabel = "Pas d'heures supplémentaires cette semaine";
	let weekOvertimeLabelClass = "text-muted-foreground";
	if (weekOvertime === 0) {
	weekOvertimeLabel = "Pas d'heures supplémentaires cette semaine";
	weekOvertimeLabelClass = "text-muted-foreground";
	} else if (weekOvertime <= 5) {
	weekOvertimeLabel = "Volume d'heures sup. raisonnable";
	weekOvertimeLabelClass = "text-emerald-600";
	} else {
	weekOvertimeLabel = "Charge élevée en heures sup. cette semaine";
	weekOvertimeLabelClass = "text-amber-600";
	}

	const WORK_DAY_START_MINUTES = 9 * 60; // 09:00
	const WORK_DAY_DURATION_MINUTES = 8 * 60; // 8h de travail théorique
	const currentMinutesOfDay = currentTime.getHours() * 60 + currentTime.getMinutes();
	const elapsedDayMinutesRaw = currentMinutesOfDay - WORK_DAY_START_MINUTES;
	const elapsedDayMinutes = Math.min(
	Math.max(0, elapsedDayMinutesRaw),
	WORK_DAY_DURATION_MINUTES,
	);
	const dayProgress =
	WORK_DAY_DURATION_MINUTES > 0
		? Math.round((elapsedDayMinutes / WORK_DAY_DURATION_MINUTES) * 100)
		: 0;
	const remainingMinutes = Math.max(0, WORK_DAY_DURATION_MINUTES - elapsedDayMinutes);
	const remainingHours = Math.floor(remainingMinutes / 60);
	const remainingMins = remainingMinutes % 60;
	const remainingLabel =
	remainingMinutes <= 0
		? "Journée théorique terminée"
		: `${remainingHours > 0 ? `${remainingHours}h ` : ""}${remainingMins} min`;
	const dayTargetLabel = "8h (09:00 → 18:00)";

	const today = new Date();
	const todayISO = today.toISOString().split("T")[0];

	const computedWorkedHours = (() => {
	if (!todayPointage?.entryTime || !isActive || isOnBreak) return null;
	const startDate = new Date(`${todayISO}T${todayPointage.entryTime}`);
	const diffMs = currentTime.getTime() - startDate.getTime();
	if (diffMs <= 0) return null;
	const hours = Math.floor(diffMs / 3600000);
	return hours;
	})();

	type DayAction = {
	label: string;
	time: string;
	order: number;
	};

	const parseTimeToOrder = (time: string | null | undefined): number => {
	if (!time) return 0;
	const parts = time.split(":").map((part) => parseInt(part, 10));
	if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
		return 0;
	}
	const [h, m, s] = parts;
	return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
	};

	const dayActions: DayAction[] = [];

	if (todayPointage?.entryTime) {
	dayActions.push({
		label: "Pointage d'entrée",
		time: todayPointage.entryTime,
		order: parseTimeToOrder(todayPointage.entryTime),
	});
	}

	if (todayPointage?.exitTime) {
	dayActions.push({
		label: "Pointage de sortie",
		time: todayPointage.exitTime,
		order: parseTimeToOrder(todayPointage.exitTime),
	});
	}

	breaks.forEach((breakItem) => {
	dayActions.push({
		label: "Démarrage de pause",
		time: breakItem.startTime,
		order: parseTimeToOrder(breakItem.startTime),
	});

	if (breakItem.endTime) {
		dayActions.push({
		label: "Fin de pause",
		time: breakItem.endTime,
		order: parseTimeToOrder(breakItem.endTime),
		});
	}
	});

	dayActions.sort((a, b) => a.order - b.order);

	const currentStatusLabel = isOnBreak
	? "En pause"
	: isActive
	? "En activité"
	: "Hors service";

	const currentStatusDescription = !isActive
	? "Commencez votre journée en pointant votre arrivée."
	: isOnBreak
	? "Vous êtes actuellement en pause."
	: "Votre journée de travail est en cours.";

	const primaryCtaLabel = !isActive ? "Pointer mon arrivée" : "Pointer ma sortie";

	const handlePrimaryCta = () => {
	if (!isActive) {
		handlePointageEntry();
	} else {
		handlePointageExit();
	}
	};

	const primaryCtaDisabled = isPending;

	return (
	<div className="space-y-6 lg:space-y-8">
		<div>
		<h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
			Bonjour, <span className="text-primary">{user.firstname}</span>
		</h1>
		<p className="text-muted-foreground">
			{formatDateFR(currentTime)}
		</p>
		</div>

		{showAlertCard &&
		(todayPointage?.status === "late" || weekLates > 0 || weekOvertime > 0) && (
			<Card className="border border-amber-200 bg-card text-amber-900 dark:border-amber-900/40">
			<CardContent className="flex items-start gap-3 py-3">
				<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
				<div className="space-y-1 text-sm">
				{todayPointage?.status === "late" && (
					<p>Vous avez pointé en retard aujourd&apos;hui.</p>
				)}
				{weekLates > 0 && (
					<p>
					{weekLates === 1
						? "1 retard enregistré cette semaine."
						: `${weekLates} retards enregistrés cette semaine.`}
					</p>
				)}
				{weekOvertime > 0 && (
					<p>
					{weekOvertime}h d&apos;heures supplémentaires cette semaine.
					</p>
				)}
				</div>
				<Button
				type="button"
				variant="ghost"
				size="icon"
				className="ml-auto h-6 w-6 rounded-full text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
				onClick={() => {
					setShowAlertCard(false);
					if (todayPointage?.status === "late") {
					emitLateAlert({
						userId: user.id,
						userName: `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || user.username,
						timestamp: new Date().toISOString(),
					});
					}
				}}
				aria-label="Fermer l&apos;alerte"
				>
				<X className="h-3 w-3" />
				</Button>
			</CardContent>
			</Card>
		)}

		<Card className="border border-primary/30 bg-card rounded-xl shadow-md">
		<CardHeader>
			<CardTitle className="flex items-center justify-between gap-2">
			<span>Pointage du jour</span>
			<span className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
				<span
				className={`h-2.5 w-2.5 rounded-full ${
					isOnBreak
					? "bg-warning animate-pulse"
					: isActive
					? "bg-success animate-pulse"
					: "bg-muted"
				}`}
				/>
				<span>{currentStatusLabel}</span>
			</span>
			</CardTitle>
			<CardDescription>{currentStatusDescription}</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
			<div className="space-y-3">
			{todayPointage?.entryTime ? (
				<p className="text-sm text-muted-foreground">
				Arrivée : {todayPointage.entryTime}
				{computedWorkedHours !== null &&
					` • Temps travaillé estimé : ${computedWorkedHours}h`}
				</p>
			) : (
				<p className="text-sm text-muted-foreground">
				Vous n&apos;avez pas encore pointé aujourd&apos;hui.
				</p>
			)}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>Objectif du jour</span>
				<span className="font-medium text-foreground">{dayTargetLabel}</span>
				</div>
				<Progress value={dayProgress} />
				<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>Progression de la journée</span>
				<span>
					{dayProgress}% • Temps restant estimé : {remainingLabel}
				</span>
				</div>
			</div>
			</div>
			<div className="flex flex-col items-stretch gap-2 md:w-64">
			<Button
				onClick={handlePrimaryCta}
				disabled={primaryCtaDisabled}
				variant={isActive ? "destructive" : "default"}
				className="h-12 text-base font-semibold"
			>
				{primaryCtaLabel}
			</Button>
			<p className="text-xs text-muted-foreground text-center">
				{currentTime.toLocaleTimeString("fr-FR")}
			</p>
			</div>
		</CardContent>
		</Card>

		{/* Boutons de pointage */}
		<div className="grid gap-4 md:grid-cols-2">
		<Card className="h-full rounded-xl border border-sky-200 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-sky-900/40">
			<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Coffee className="h-5 w-5 text-primary" />
				Démarrer Pause
			</CardTitle>
			<CardDescription>Pause déjeuner ou autre</CardDescription>
			</CardHeader>
			<CardContent>
			<Button
				onClick={handleBreakStart}
				disabled={!isActive || isOnBreak || !isInBreakTimeRange}
				variant="outline"
				className={`w-full h-16 text-lg font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
				isActive && !isOnBreak && isInBreakTimeRange
					? "border-sky-500 bg-sky-500/10 text-sky-700 dark:border-sky-400 dark:text-sky-200"
					: "border-border text-muted-foreground"
				}`}
			>
				{!isActive
				? "Pointez d'abord l'entrée"
				: isOnBreak
				? "Pause en cours"
				: !isInBreakTimeRange
				? "Hors plage horaire"
				: "Démarrer Pause"}
			</Button>
			<p className="mt-2 text-center text-sm text-muted-foreground">
				Plage horaire: 12h-14h
			</p>
			</CardContent>
		</Card>

		<Card className="h-full rounded-xl border border-emerald-100 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/40">
			<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<Coffee className="h-5 w-5 text-primary" />
				Terminer Pause
			</CardTitle>
			<CardDescription>Reprendre le travail</CardDescription>
			</CardHeader>
			<CardContent>
			<Button
				onClick={handleBreakEnd}
				disabled={!isOnBreak}
				variant="outline"
				className={`w-full h-16 text-lg font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
				isOnBreak
					? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400 dark:text-emerald-200"
					: "border-border text-muted-foreground"
				}`}
			>
				{!isOnBreak ? "Aucune pause active" : "Terminer Pause"}
			</Button>
			<p className="mt-2 text-center text-sm text-muted-foreground">
				{currentTime.toLocaleTimeString("fr-FR")}
			</p>
			</CardContent>
		</Card>
		</div>

		{/* Statut actuel et Pauses */}
		<div className="grid gap-4 md:grid-cols-2">
		<Card className="bg-card/80 shadow-sm">
			<CardHeader>
			<CardTitle>Statut Actuel</CardTitle>
			</CardHeader>
			<CardContent>
			<div className="flex items-center gap-4">
				<div
				className={`h-4 w-4 rounded-full ${
					isActive && !isOnBreak
					? "bg-success animate-pulse"
					: isOnBreak
					? "bg-warning animate-pulse"
					: "bg-muted"
				}`}
				/>
				<div>
				<p className="font-semibold">
					{isOnBreak ? "En pause" : isActive ? "En activité" : "Hors service"}
				</p>
				{todayPointage?.entryTime && (
					<p className="text-sm text-muted-foreground">
					Arrivée: {todayPointage.entryTime}
					{computedWorkedHours !== null &&
						` • Temps travaillé: ${computedWorkedHours}h`}
					</p>
				)}
				</div>
			</div>
			{dayActions.length > 0 && (
				<div className="mt-4 space-y-2">
				<p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
					Dernières actions
				</p>
				<ul className="space-y-1.5 text-xs">
					{dayActions.slice(-4).map((action, index) => (
					<li
						key={`${action.time}-${index}`}
						className="flex items-center justify-between"
					>
						<span className="text-muted-foreground">{action.time}</span>
						<span className="font-medium text-foreground">{action.label}</span>
					</li>
					))}
				</ul>
				</div>
			)}
			</CardContent>
		</Card>

		<Card className="bg-card/80 shadow-sm">
			<CardHeader>
			<CardTitle>Pauses du jour</CardTitle>
			</CardHeader>
			<CardContent>
			{breaks.length === 0 ? (
				<p className="text-sm text-muted-foreground">Aucune pause enregistrée</p>
			) : (
				<div className="space-y-2">
				{breaks.map((breakItem, index) => (
					<div key={index} className="flex justify-between items-center text-sm">
					<span className="font-medium">Pause {index + 1}</span>
					<span className="text-muted-foreground">
						{breakItem.startTime} - {breakItem.endTime || "En cours"}
						{breakItem.duration && ` (${breakItem.duration} min)`}
					</span>
					</div>
				))}
				<div className="pt-2 border-t">
					<div className="flex justify-between items-center font-semibold">
					<span>Total pauses</span>
					<span>
						{breaks.reduce((sum, b) => sum + (b.duration || 0), 0)} min
					</span>
					</div>
				</div>
				</div>
			)}
			</CardContent>
		</Card>
		</div>

		{/* Statistiques de la semaine */}
		<div className="grid gap-4 md:grid-cols-3">
		<Card className="border border-primary/15 bg-card shadow-sm">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle className="text-sm font-medium">Heures travaillées</CardTitle>
			<Clock className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
			<div className="text-2xl font-bold">{weekHours}h</div>
			<p className="text-xs text-muted-foreground">Cette semaine</p>
			<p className={`mt-1 text-xs font-medium ${weekHoursLabelClass}`}>
				{weekHoursLabel}
			</p>
			</CardContent>
		</Card>

		<Card className="border border-amber-100 bg-card shadow-sm dark:border-amber-900/40">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle className="text-sm font-medium">Retards</CardTitle>
			<AlertCircle className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
			<div className="text-2xl font-bold">{weekLates}</div>
			<p className="text-xs text-muted-foreground">Cette semaine</p>
			<p className={`mt-1 text-xs font-medium ${weekLatesLabelClass}`}>
				{weekLatesLabel}
			</p>
			</CardContent>
		</Card>

		<Card className="border border-primary/10 bg-card shadow-sm">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle className="text-sm font-medium">Heures supplémentaires</CardTitle>
			<TrendingUp className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
			<div className="text-2xl font-bold">{weekOvertime}h</div>
			<p className="text-xs text-muted-foreground">Cette semaine</p>
			<p className={`mt-1 text-xs font-medium ${weekOvertimeLabelClass}`}>
				{weekOvertimeLabel}
			</p>
			</CardContent>
		</Card>
		</div>
	</div>
	);
}
