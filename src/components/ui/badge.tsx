import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-gradient-to-r from-primary/20 to-primary/10 text-primary hover:bg-primary/30 hover:shadow-sm",
        secondary: "border-secondary/30 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 hover:shadow-sm",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25 hover:shadow-sm",
        outline: "border-border/60 text-foreground hover:bg-muted/40 hover:border-border/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
