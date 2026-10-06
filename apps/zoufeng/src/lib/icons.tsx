import {
  BadgeCheck, Building2, Bus, CalendarCheck, CalendarDays, Car, CarFront, CarTaxiFront, Circle, CircleHelp, Clock,
  Compass, Crown, Gift, Heart, Home, Info, LayoutGrid, Luggage, Map, MapPin, MapPinned, Mountain, Navigation,
  PartyPopper, Phone, Plane, PlaneLanding, PlaneTakeoff, Route, ShieldCheck, Sparkles, Star, Sun, Tag, TicketPercent,
  TrainFront, Truck, UserRound, Users, Wallet, Briefcase, Gem, Headphones, Mail, MessageCircle, LayoutDashboard, Images, Settings, Baby, Wifi, Coffee, Camera, Ship, Bike, Hotel, Trophy, Flag, Globe, Award, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  BadgeCheck, Building2, Bus, CalendarCheck, CalendarDays, Car, CarFront, CarTaxiFront, Circle, CircleHelp, Clock,
  Compass, Crown, Gift, Heart, Home, Info, LayoutGrid, Luggage, Map, MapPin, MapPinned, Mountain, Navigation,
  PartyPopper, Phone, Plane, PlaneLanding, PlaneTakeoff, Route, ShieldCheck, Sparkles, Star, Sun, Tag, TicketPercent,
  TrainFront, Truck, UserRound, Users, Wallet, Briefcase, Gem, Headphones, Mail, MessageCircle, LayoutDashboard, Images, Settings, Baby, Wifi, Coffee, Camera, Ship, Bike, Hotel, Trophy, Flag, Globe, Award,
};

export const ICON_NAMES = Object.keys(ICONS).sort();

export function Icon({ name, className, size }: { name: string; className?: string; size?: number }) {
  const C = ICONS[name] ?? Circle;
  return <C className={className} size={size} />;
}
