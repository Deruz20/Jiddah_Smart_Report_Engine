import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98] active:shadow-sm disabled:pointer-events-none disabled:opacity-50 disabled:scale-100 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/20 shadow-sm",
        outline:
          "border border-emerald-200 bg-background text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 shadow-sm",
        secondary:
          "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 shadow-sm",
        ghost:
          "hover:bg-emerald-50 hover:text-emerald-900 hover:shadow-none hover:scale-100",
        link: "text-emerald-600 underline-offset-4 hover:underline hover:shadow-none hover:scale-100 active:scale-100",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      isLoading?: boolean;
    }
>(({ className, variant, size, asChild = false, isLoading = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin mr-1 size-4" />}
      {children}
    </Comp>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
