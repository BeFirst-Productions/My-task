"use client";

import React, { useState, useRef, useEffect, useId } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  className?: string;
  showArrow?: boolean;
}

/**
 * Universal SaaS Tooltip Component
 * Provides unified, premium, dark-glassmorphic tooltips across the platform.
 */
export function Tooltip({
  content,
  children,
  position = "top",
  delay = 120,
  disabled = false,
  className = "",
  showArrow = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  const showTooltip = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position specific styles
  const positionClasses: Record<TooltipPosition, { tooltip: string; arrow: string }> = {
    top: {
      tooltip: "bottom-full left-1/2 -translate-x-1/2 mb-2",
      arrow: "top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-[#181a24] border-x-transparent border-b-transparent border-4",
    },
    bottom: {
      tooltip: "top-full left-1/2 -translate-x-1/2 mt-2",
      arrow: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-[#181a24] border-x-transparent border-t-transparent border-4",
    },
    left: {
      tooltip: "right-full top-1/2 -translate-y-1/2 mr-2",
      arrow: "left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-[#181a24] border-y-transparent border-r-transparent border-4",
    },
    right: {
      tooltip: "left-full top-1/2 -translate-y-1/2 ml-2",
      arrow: "right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-[#181a24] border-y-transparent border-l-transparent border-4",
    },
  };

  // Safe clone of children with event listeners
  const child = React.isValidElement(children) ? children : <span>{children}</span>;
  const trigger = React.cloneElement(child as React.ReactElement<any>, {
    onMouseEnter: (e: React.MouseEvent) => {
      child.props.onMouseEnter?.(e);
      showTooltip();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      child.props.onMouseLeave?.(e);
      hideTooltip();
    },
    onFocus: (e: React.FocusEvent) => {
      child.props.onFocus?.(e);
      showTooltip();
    },
    onBlur: (e: React.FocusEvent) => {
      child.props.onBlur?.(e);
      hideTooltip();
    },
    "aria-describedby": isVisible ? tooltipId : undefined,
  });

  return (
    <div className="relative inline-flex items-center justify-center">
      {trigger}

      {isVisible && content && !disabled && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute pointer-events-none z-50 whitespace-nowrap select-none transition-all duration-150 ease-out animate-in fade-in zoom-in-95 ${positionClasses[position].tooltip}`}
        >
          <div
            className={`px-2.5 py-1 text-[11px] font-medium tracking-normal text-slate-100 bg-slate-900/95 dark:bg-[#181a24]/95 dark:text-slate-200 border border-slate-800/80 dark:border-slate-700/70 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-1.5 ${className}`}
          >
            {content}
          </div>
          {showArrow && (
            <div
              className={`absolute w-0 h-0 pointer-events-none ${positionClasses[position].arrow}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
