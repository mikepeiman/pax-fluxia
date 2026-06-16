import type { IconSet } from "./iconSetStore.svelte";

// Icon components across the three libraries have differing, partly class-based
// prop shapes that don't unify under svelte's Component<> type. Hold them as
// `any` here; HudIcon casts to a renderable component type at the render site.
type IconComponent = any;

// Lucide (aliased Lu* to avoid collisions with Phosphor's same-named exports)
import {
  Menu as LuMenu, Settings as LuSettings, SlidersHorizontal as LuSliders,
  Gem as LuGem, LayoutGrid as LuGrid, Timer as LuTimer, Trophy as LuTrophy,
  Maximize as LuMaximize, Minimize as LuMinimize, Crosshair as LuCrosshair,
  Send as LuSend, Ban as LuBan, Route as LuRoute, Flag as LuFlag, Link as LuLink,
  Type as LuType, Grid3x3 as LuGrid3, RefreshCw as LuRefresh, BarChart3 as LuBars,
  Info as LuInfo, PanelLeft as LuPanelLeft, PanelRight as LuPanelRight,
  ChevronLeft as LuChevLeft, ChevronRight as LuChevRight, ChevronUp as LuChevUp,
  ChevronDown as LuChevDown, ChevronsRight as LuChevsRight, X as LuX,
  Search as LuSearch, Palette as LuPalette, Library as LuLibrary, Plus as LuPlus,
  Upload as LuUpload, Download as LuDownload, RotateCcw as LuRotate,
  Users as LuUsers, Clock as LuClock, Swords as LuSwords, Coins as LuCoins,
  Rocket as LuRocket, Crown as LuCrown, Sparkles as LuSparkles, Map as LuMap,
  Layers as LuLayers, History as LuHistory, Eye as LuEye, Navigation as LuNav,
  Star as LuStar, Compass as LuCompass, Zap as LuZap, Network as LuNetwork,
  Volume2 as LuVolume, Activity as LuActivity, ScrollText as LuScroll,
  Bot as LuBot, Camera as LuCamera, Keyboard as LuKeyboard,
  MessageSquare as LuChat, Save as LuSave, FolderOpen as LuFolder,
  LogOut as LuLogout, Ruler as LuRuler, CircleHelp as LuHelp,
  MoreHorizontal as LuMore, Play as LuPlay, Pause as LuPause,
  FastForward as LuFast, MapPin as LuPin, CircleDashed as LuDashed,
  Hexagon as LuHexagon, Shield as LuShield, Circle as LuCircle,
} from "@lucide/svelte";

// Phosphor (aliased Ph*)
import {
  List as PhList, Gear as PhGear, Sliders as PhSliders, Diamond as PhDiamond,
  SquaresFour as PhSquares, Timer as PhTimer, Trophy as PhTrophy,
  ArrowsOut as PhArrowsOut, ArrowsIn as PhArrowsIn, Crosshair as PhCrosshair,
  PaperPlaneTilt as PhPlane, Prohibit as PhProhibit, Path as PhPath,
  Flag as PhFlag, Link as PhLink, TextT as PhText, GridFour as PhGrid,
  ArrowsClockwise as PhClockwise, ChartBar as PhChart, Info as PhInfo,
  SidebarSimple as PhSidebar, CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight, CaretUp as PhCaretUp, CaretDown as PhCaretDown,
  CaretDoubleRight as PhCaretDbl, X as PhX, MagnifyingGlass as PhSearch,
  Palette as PhPalette, Books as PhBooks, Plus as PhPlus, Export as PhExport,
  DownloadSimple as PhDownload, ArrowCounterClockwise as PhRotate,
  Users as PhUsers, Clock as PhClock, Sword as PhSword, Coins as PhCoins,
  Rocket as PhRocket, Crown as PhCrown, Sparkle as PhSparkle,
  MapTrifold as PhMap, StackSimple as PhStack, ClockCounterClockwise as PhHistory,
  Eye as PhEye, NavigationArrow as PhNav, Star as PhStar, Compass as PhCompass,
  Lightning as PhLightning, ShareNetwork as PhNetwork, SpeakerHigh as PhSpeaker,
  Pulse as PhPulse, FileText as PhFile, Robot as PhRobot, Camera as PhCamera,
  Keyboard as PhKeyboard, ChatCircle as PhChat, FloppyDisk as PhFloppy,
  FolderOpen as PhFolder, SignOut as PhSignOut, Ruler as PhRuler,
  Question as PhQuestion, DotsThree as PhDots, Play as PhPlay, Pause as PhPause,
  FastForward as PhFast, MapPin as PhPin, CircleDashed as PhDashed,
  Hexagon as PhHexagon, Shield as PhShield, Circle as PhCircle,
} from "phosphor-svelte";

// Tabler (Icon-prefixed; no collisions)
import {
  IconMenu2, IconSettings, IconAdjustments, IconDiamond, IconLayoutGrid,
  IconStopwatch, IconTrophy, IconMaximize, IconMinimize, IconFocus2,
  IconSend, IconBan, IconRoute, IconFlag, IconLink, IconTypography,
  IconBorderAll, IconRefresh, IconChartBar, IconInfoCircle,
  IconLayoutSidebar, IconLayoutSidebarRight, IconChevronLeft,
  IconChevronRight, IconChevronUp, IconChevronDown, IconChevronsRight,
  IconX, IconSearch, IconPalette, IconBooks, IconPlus, IconUpload,
  IconDownload, IconRotate, IconUsers, IconClock, IconSwords, IconCoins,
  IconRocket, IconCrown, IconSparkles, IconMap, IconMap2, IconStack2,
  IconHistory, IconEye, IconNavigation, IconStar, IconCompass, IconBolt,
  IconHierarchy, IconVolume, IconActivity, IconFileText, IconRobot,
  IconCamera, IconKeyboard, IconMessage, IconDeviceFloppy, IconFolderOpen,
  IconLogout, IconRuler, IconRuler2, IconHelp, IconDots, IconPlayerPlay,
  IconPlayerPause, IconPlayerTrackNext, IconMapPin, IconCircleDashed,
  IconHexagon, IconShield, IconCircle,
} from "@tabler/icons-svelte";

export interface IconTriple {
  lucide: IconComponent;
  phosphor: IconComponent;
  tabler: IconComponent;
}

const t = (
  lucide: IconComponent,
  phosphor: IconComponent,
  tabler: IconComponent,
): IconTriple => ({ lucide, phosphor, tabler });

export const FALLBACK_ICON: IconTriple = t(LuCircle, PhCircle, IconCircle);

/** Semantic icon name -> a real icon in each set. */
export const ICON_MAP: Record<string, IconTriple> = {
  menu: t(LuMenu, PhList, IconMenu2),
  settings: t(LuSettings, PhGear, IconSettings),
  tune: t(LuSliders, PhSliders, IconAdjustments),
  gem: t(LuGem, PhDiamond, IconDiamond),
  "quick-access": t(LuGrid, PhSquares, IconLayoutGrid),
  stopwatch: t(LuTimer, PhTimer, IconStopwatch),
  "ranking-star": t(LuTrophy, PhTrophy, IconTrophy),
  leaderboard: t(LuBars, PhChart, IconChartBar),
  "fit-view": t(LuMaximize, PhArrowsOut, IconMaximize),
  fit: t(LuMaximize, PhArrowsOut, IconMaximize),
  focus: t(LuCrosshair, PhCrosshair, IconFocus2),
  "paper-plane": t(LuSend, PhPlane, IconSend),
  orders: t(LuNav, PhNav, IconNavigation),
  ban: t(LuBan, PhProhibit, IconBan),
  route: t(LuRoute, PhPath, IconRoute),
  flag: t(LuFlag, PhFlag, IconFlag),
  link: t(LuLink, PhLink, IconLink),
  font: t(LuType, PhText, IconTypography),
  "border-all": t(LuGrid3, PhGrid, IconBorderAll),
  "arrows-spin": t(LuRefresh, PhClockwise, IconRefresh),
  "arrows-to-circle": t(LuMinimize, PhArrowsIn, IconMinimize),
  "chart-simple": t(LuBars, PhChart, IconChartBar),
  "circle-info": t(LuInfo, PhInfo, IconInfoCircle),
  "dock-left": t(LuPanelLeft, PhSidebar, IconLayoutSidebar),
  "dock-right": t(LuPanelRight, PhSidebar, IconLayoutSidebarRight),
  "chevron-left": t(LuChevLeft, PhCaretLeft, IconChevronLeft),
  "chevron-right": t(LuChevRight, PhCaretRight, IconChevronRight),
  "chevron-up": t(LuChevUp, PhCaretUp, IconChevronUp),
  "chevron-down": t(LuChevDown, PhCaretDown, IconChevronDown),
  close: t(LuX, PhX, IconX),
  search: t(LuSearch, PhSearch, IconSearch),
  theme: t(LuPalette, PhPalette, IconPalette),
  "territory-styles": t(LuPalette, PhPalette, IconPalette),
  library: t(LuLibrary, PhBooks, IconBooks),
  add: t(LuPlus, PhPlus, IconPlus),
  export: t(LuUpload, PhExport, IconUpload),
  import: t(LuDownload, PhDownload, IconDownload),
  reset: t(LuRotate, PhRotate, IconRotate),
  restart: t(LuRefresh, PhClockwise, IconRefresh),
  players: t(LuUsers, PhUsers, IconUsers),
  timing: t(LuClock, PhClock, IconClock),
  combat: t(LuSwords, PhSword, IconSwords),
  economy: t(LuCoins, PhCoins, IconCoins),
  travel: t(LuRocket, PhRocket, IconRocket),
  conquest: t(LuCrown, PhCrown, IconCrown),
  effects: t(LuSparkles, PhSparkle, IconSparkles),
  "frontier-fx": t(LuZap, PhLightning, IconBolt),
  "map-options": t(LuMap, PhMap, IconMap2),
  map: t(LuMap, PhMap, IconMap),
  "map-location": t(LuPin, PhPin, IconMapPin),
  "map-pin": t(LuPin, PhPin, IconMapPin),
  overlays: t(LuLayers, PhStack, IconStack2),
  history: t(LuHistory, PhHistory, IconHistory),
  view: t(LuEye, PhEye, IconEye),
  "atlas-star": t(LuStar, PhStar, IconStar),
  "fleet-star": t(LuStar, PhStar, IconStar),
  "atlas-compass": t(LuCompass, PhCompass, IconCompass),
  topology: t(LuNetwork, PhNetwork, IconHierarchy),
  "phase-field": t(LuDashed, PhDashed, IconCircleDashed),
  "phase-edges": t(LuHexagon, PhHexagon, IconHexagon),
  "ember-lattice": t(LuGrid3, PhGrid, IconBorderAll),
  audio: t(LuVolume, PhSpeaker, IconVolume),
  diagnostics: t(LuActivity, PhPulse, IconActivity),
  logging: t(LuScroll, PhFile, IconFileText),
  ai: t(LuBot, PhRobot, IconRobot),
  camera: t(LuCamera, PhCamera, IconCamera),
  keyboard: t(LuKeyboard, PhKeyboard, IconKeyboard),
  chat: t(LuChat, PhChat, IconMessage),
  "save-map": t(LuSave, PhFloppy, IconDeviceFloppy),
  "save-game": t(LuSave, PhFloppy, IconDeviceFloppy),
  "load-map": t(LuFolder, PhFolder, IconFolderOpen),
  "load-game": t(LuFolder, PhFolder, IconFolderOpen),
  quit: t(LuLogout, PhSignOut, IconLogout),
  ruler: t(LuRuler, PhRuler, IconRuler),
  measure: t(LuRuler, PhRuler, IconRuler2),
  help: t(LuHelp, PhQuestion, IconHelp),
  more: t(LuMore, PhDots, IconDots),
  pause: t(LuPause, PhPause, IconPlayerPause),
  "play-1": t(LuPlay, PhPlay, IconPlayerPlay),
  "play-2": t(LuFast, PhFast, IconPlayerTrackNext),
  "play-4": t(LuChevsRight, PhCaretDbl, IconChevronsRight),
  "play-10": t(LuChevsRight, PhCaretDbl, IconChevronsRight),
  shield: t(LuShield, PhShield, IconShield),
};

export function resolveIcon(name: string, set: IconSet): IconComponent {
  const triple = ICON_MAP[name] ?? FALLBACK_ICON;
  return triple[set];
}
