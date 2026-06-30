/** Shopify-inspired staff workspace chrome tokens. */

export const staffNav = {
  topBar:
    "bg-black text-[#e3e3e3] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.45)]",
  topBarIcon:
    "size-8 rounded-md text-[#e3e3e3] hover:bg-[#303030] hover:text-white",
  topBarGhost:
    "border-transparent bg-transparent text-[#e3e3e3] hover:bg-[#303030] hover:text-white",
  sidebar: "bg-[#ebebeb] text-[#303030]",
  sidebarBorder: "border-[#e3e3e3]",
  link: "text-[#303030] hover:bg-[#e3e3e3]/80",
  linkActive: "bg-white text-[#303030] shadow-sm font-medium",
  childLink: "text-[#616161] hover:bg-white/60 hover:text-[#303030]",
  childLinkActive: "bg-white/80 text-[#303030] font-medium",
  childBorder: "border-[#d4d4d4]",
  muted: "text-[#616161]",
  sheet: "bg-[#ebebeb] text-[#303030] border-[#e3e3e3]",
  content: "bg-[#f6f6f7]",
} as const;
