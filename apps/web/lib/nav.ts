import {
  Home,
  Activity,
  Settings,
  Factory,
  Drill,
  Map,
  MessageSquare,
  ShieldCheck,
  Layers,
  Shield,
  HardDrive,
  Play,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

export const navigation: (NavItem | NavGroup)[] = [
  { label: "Home", href: "/", icon: Home },
  {
    id: "geology_geophysics",
    label: "Geology & Geophysics",
    icon: Layers,
    children: [
      { label: "Geology & Geophysics", href: "/gyg", icon: Layers },
      { label: "Routines", href: "/gyg/routines", icon: Play },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: Factory,
    children: [
      { label: "Production", href: "/production", icon: Factory },
    ],
  },
  {
    id: "drilling",
    label: "Drilling",
    icon: Drill,
    children: [
      { label: "Drilling", href: "/drilling", icon: Drill },
      { label: "Event Unlock", href: "/drilling/event-unlock", icon: Drill },
      { label: "User Access", href: "/drilling/user-access", icon: Drill },
    ],
  },
  {
    id: "cartography",
    label: "Cartography",
    icon: Map,
    children: [
      { label: "Cartography", href: "/cartography", icon: Map },
      { label: "Projects Index", href: "/cartography/projects-index", icon: Map },
      { label: "Cultural Info", href: "/cartography/cultural-info", icon: Map },
    ],
  },
  {
    id: "data_quality",
    label: "Data Quality",
    icon: ShieldCheck,
    children: [
      { label: "Data Quality", href: "/data-quality", icon: ShieldCheck },
    ],
  },
  {
    id: "chatbot",
    label: "Chatbot",
    icon: MessageSquare,
    children: [
      { label: "Chat", href: "/chat", icon: MessageSquare },
    ],
  },
  {
    id: "volumes",
    label: "Storage & Volumes",
    icon: HardDrive,
    children: [
      { label: "Volumes", href: "/volumes", icon: HardDrive },
    ],
  },
  {
    id: "admin",
    label: "Admin / Configuration",
    icon: Shield,
    children: [
      { label: "Admin", href: "/admin", icon: Shield },
      { label: "Authentication", href: "/admin/auth", icon: Shield },
      { label: "Datasources", href: "/admin/datasources", icon: Shield },
      { label: "Access Policies", href: "/admin/policies", icon: Shield },
    ],
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: Activity,
    children: [
      { label: "Jobs", href: "/jobs", icon: Activity },
    ],
  },
];

// Helper to get module by ID
export function getModuleById(id: string): NavGroup | null {
  return navigation.find((item) => "id" in item && item.id === id) as NavGroup | null;
}

// Get all modules (excluding Home and Chatbot)
export function getPinnableModules(): NavGroup[] {
  return navigation.filter((item) => "id" in item && item.id !== "chatbot") as NavGroup[];
}
