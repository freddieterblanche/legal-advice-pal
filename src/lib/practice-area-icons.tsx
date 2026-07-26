import {
  PiggyBank,
  Building2,
  Radio,
  BookMarked,
  ShieldAlert,
  Handshake,
  Leaf,
  Users,
  Plane,
  RefreshCw,
  Lightbulb,
  HardHat,
  Pickaxe,
  Home,
  ReceiptText,
  BriefcaseMedical,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "banking-finance": PiggyBank,
  "commercial-law": Building2,
  "competition-law": Radio,
  "constitutional-law": BookMarked,
  "criminal-law": ShieldAlert,
  "dispute-resolution": Handshake,
  "environmental-law": Leaf,
  "family-law": Users,
  "immigration-law": Plane,
  "insolvency": RefreshCw,
  "intellectual-property": Lightbulb,
  "labour-law": HardHat,
  "mining-resources": Pickaxe,
  "property-law": Home,
  "tax-law": ReceiptText,
  "medical-negligence": BriefcaseMedical,
};

export function getPracticeAreaIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return BookOpen;
  return ICONS[slug] ?? BookOpen;
}
