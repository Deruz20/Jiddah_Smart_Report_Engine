"use client";

import * as React from "react";

export interface MobileBottomNavProps {
  role?: string;
  subject?: string | null;
  onNavigate?: (id: string) => void;
}

/**
 * MobileBottomNav is permanently disabled across the application.
 * Mobile navigation is fully handled by the top-left hamburger menu drawer
 * in AppTopbar and AppSidebar, reclaiming mobile screen height.
 */
export function MobileBottomNav(_props: MobileBottomNavProps) {
  return null;
}
