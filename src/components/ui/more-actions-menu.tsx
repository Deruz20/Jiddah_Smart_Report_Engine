"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreVertical, MoreHorizontal } from "lucide-react";
import { cn } from "../figma-ui/ui/utils";

export interface ActionMenuItem {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export interface ActionMenuGroup {
  groupLabel?: string;
  items: ActionMenuItem[];
}

export interface MoreActionsMenuProps {
  items?: ActionMenuItem[];
  groups?: ActionMenuGroup[];
  variant?: "vertical" | "horizontal";
  triggerClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  ariaLabel?: string;
  children?: React.ReactNode;
}

export function MoreActionsMenu({
  items,
  groups,
  variant = "vertical",
  triggerClassName,
  contentClassName,
  align = "end",
  side = "bottom",
  ariaLabel = "More actions",
  children,
}: MoreActionsMenuProps) {
  // Normalize into groups if flat items provided
  const resolvedGroups: ActionMenuGroup[] = React.useMemo(() => {
    if (groups && groups.length > 0) return groups;
    if (items && items.length > 0) return [{ items }];
    return [];
  }, [groups, items]);

  if (resolvedGroups.length === 0) return null;

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        aria-label={ariaLabel}
        data-testid="more-actions-trigger"
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
          triggerClassName
        )}
      >
        {children ? (
          children
        ) : variant === "horizontal" ? (
          <MoreHorizontal className="size-4 shrink-0" strokeWidth={1.75} />
        ) : (
          <MoreVertical className="size-4 shrink-0" strokeWidth={1.75} />
        )}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          data-slot="gemini-more-actions-menu"
          className={cn(
            "z-50 min-w-[200px] rounded-2xl bg-white dark:bg-[#1E1F20] border border-[#E1E3E1] dark:border-[#282A2C] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)] outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            contentClassName
          )}
        >
          {resolvedGroups.map((group, groupIdx) => (
            <React.Fragment key={groupIdx}>
              {group.groupLabel && (
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#747775] dark:text-[#8E918F]">
                  {group.groupLabel}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuPrimitive.Item
                    key={item.label}
                    disabled={item.disabled}
                    onSelect={(e) => {
                      if (item.disabled) {
                        e.preventDefault();
                        return;
                      }
                      item.onClick();
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] cursor-pointer outline-none transition-colors select-none",
                      item.destructive
                        ? "text-[#D93025] dark:text-[#F28B82] hover:bg-[#FCE8E6] dark:hover:bg-[#3C1E1E] focus:bg-[#FCE8E6] dark:focus:bg-[#3C1E1E]"
                        : "text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#F0F4F9] dark:hover:bg-[#333537] focus:bg-[#F0F4F9] dark:focus:bg-[#333537]",
                      item.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.75} />}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-auto text-xs text-[#747775] dark:text-[#8E918F] font-mono">
                        {item.shortcut}
                      </span>
                    )}
                  </DropdownMenuPrimitive.Item>
                );
              })}
              {groupIdx < resolvedGroups.length - 1 && (
                <DropdownMenuPrimitive.Separator className="my-1 h-px bg-[#E1E3E1] dark:bg-[#282A2C]" />
              )}
            </React.Fragment>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
