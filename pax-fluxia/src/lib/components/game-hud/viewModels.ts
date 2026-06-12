import { STAR_TYPE_STATS, type StarType } from "@pax/common";
import type { PlayerState, StarState } from "$lib/types/game.types";
import type {
  PlayerStandingViewModel,
  SelectedStarViewModel,
  StarTypeViewModel,
} from "./types";

export const STAR_TYPE_UI: Record<StarType, StarTypeViewModel> = {
  grey: { id: "grey", label: "Basic", icon: "grey", color: "#a8b6cf" },
  yellow: { id: "yellow", label: "Production", icon: "yellow", color: "#ffd166" },
  blue: { id: "blue", label: "Transport", icon: "blue", color: "#70b7ff" },
  purple: { id: "purple", label: "Repair", icon: "purple", color: "#c7a8ff" },
  red: { id: "red", label: "Defense", icon: "red", color: "#ff8a94" },
  green: { id: "green", label: "Attack", icon: "green", color: "#6be7a4" },
  portal: { id: "portal", label: "Portal", icon: "portal", color: "#8b9cff" },
};

export function resolveStarType(starType?: string | null): StarType {
  if (!starType) return "grey";
  return (starType in STAR_TYPE_STATS ? starType : "grey") as StarType;
}

export function formatStarLabel(starId: string | null | undefined): string {
  if (!starId) return "No Star";
  return `Star ${starId.replace(/^star-/, "")}`;
}

export function buildPlayerStandings(
  players: PlayerState[],
  localPlayerId?: string | null,
): PlayerStandingViewModel[] {
  return players
    .filter((player) => !player.isEliminated)
    .map((player) => {
      const activeShips = Math.max(0, Math.floor(player.activeShips ?? 0));
      const damagedShips = Math.max(0, Math.floor(player.damagedShips ?? 0));
      const totalShips = Math.max(0, Math.floor(player.totalShips ?? activeShips + damagedShips));
      const activePercent = totalShips > 0 ? Math.round((activeShips / totalShips) * 100) : 0;
      const sessionId = (player as PlayerState & { sessionId?: string }).sessionId;

      return {
        id: player.id,
        name: player.name,
        color: player.color,
        isLocal: player.id === localPlayerId || sessionId === localPlayerId,
        activeShips,
        damagedShips,
        totalShips,
        starCount: Math.max(0, Math.floor(player.starCount ?? 0)),
        production: Number(player.production ?? 0),
        activePercent,
        source: player,
      };
    })
    .sort((left, right) => {
      const shipDelta = right.totalShips - left.totalShips;
      if (shipDelta !== 0) return shipDelta;
      return right.activeShips - left.activeShips;
    });
}

export function buildSelectedStarViewModel(
  selectedStarId: string | null | undefined,
  stars: StarState[],
  players: PlayerState[],
  localPlayerId?: string | null,
): SelectedStarViewModel | null {
  if (!selectedStarId) return null;
  const star = stars.find((candidate) => candidate.id === selectedStarId);
  if (!star) return null;

  const standings = buildPlayerStandings(players, localPlayerId);
  const owner = standings.find((player) => player.id === star.ownerId) ?? null;
  const starType = STAR_TYPE_UI[resolveStarType(star.starType)];
  const activeShips = Math.max(0, Math.floor(star.activeShips ?? 0));
  const damagedShips = Math.max(0, Math.floor(star.damagedShips ?? 0));

  return {
    id: star.id,
    label: formatStarLabel(star.id),
    starType,
    owner,
    activeShips,
    damagedShips,
    totalShips: activeShips + damagedShips,
    productionRate: Number(star.productionRate ?? 0),
    repairRate: Number(star.repairRate ?? 0),
    transferRate: Number(star.transferRate ?? 0),
    activationRate: Number(star.activationRate ?? 0),
    targetId: star.targetId ?? null,
    queuedOrderTargetId: star.queuedOrderTargetId ?? null,
    source: star,
  };
}

export function formatHudNumber(value: number, digits = 0): string {
  const rounded = digits > 0 ? Number(value.toFixed(digits)) : Math.round(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(rounded);
}

export function formatSignedHudNumber(value: number, digits = 0): string {
  const formatted = formatHudNumber(Math.abs(value), digits);
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}
