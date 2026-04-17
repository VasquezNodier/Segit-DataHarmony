/**
 * Mapeos por slug de rutina:
 * - iconos / gradientes para las cards
 * - configuración del flujo `volume_path` (input filename, filtro opcional)
 */
import {
  FileText,
  Grid3X3,
  Magnet,
  FileEdit,
  Mountain,
  type LucideIcon,
} from "lucide-react";

export const routineIcons: Record<string, LucideIcon> = {
  addfaultname: FileEdit,
  load_pts2grid: Grid3X3,
  grav_batch: Magnet,
  renfiles2: FileText,
  "fallas-split": FileEdit,
  "horizontes-split": Mountain,
};

export const routineColors: Record<string, string> = {
  addfaultname: "from-violet-500 to-purple-600",
  load_pts2grid: "from-cyan-500 to-teal-600",
  grav_batch: "from-amber-500 to-orange-600",
  renfiles2: "from-emerald-500 to-green-600",
  "fallas-split": "from-violet-500 to-purple-600",
  "horizontes-split": "from-emerald-500 to-teal-600",
};

export const DEFAULT_ICON = FileText;
export const DEFAULT_GRADIENT = "from-slate-500 to-slate-600";

/**
 * Configuración del perfil de ejecución `volume_path`.
 * Cada rutina declara aquí:
 *   - el nombre del archivo de entrada esperado en el directorio seleccionado
 *   - si expone un filtro opcional por nombre (fault / horizon / etc.)
 */
export interface VolumePathFilterConfig {
  paramKey: string;
  label: string;
  placeholder: string;
  helperText?: string;
}

export interface VolumePathConfig {
  inputFilename: string;
  filter?: VolumePathFilterConfig;
}

export const volumePathConfigs: Record<string, VolumePathConfig> = {
  "fallas-split": {
    inputFilename: "fallas.dat",
    filter: {
      paramKey: "faultNameFilter",
      label: "Fault name filter (optional)",
      placeholder: "Leave empty to generate all faults",
    },
  },
  "horizontes-split": {
    inputFilename: "horizontes.dat / .xlsx / .dat.xlsx",
  },
};

export const DEFAULT_VOLUME_PATH_CONFIG: VolumePathConfig = {
  inputFilename: "input.dat",
};

export function getVolumePathConfig(slug: string | undefined): VolumePathConfig {
  if (!slug) return DEFAULT_VOLUME_PATH_CONFIG;
  return volumePathConfigs[slug] ?? DEFAULT_VOLUME_PATH_CONFIG;
}
