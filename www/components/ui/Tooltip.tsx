// www/components/ui/Tooltip.tsx
// CSS-only tooltip using Tailwind's group-hover pattern.
// Wraps any element; shows `text` on hover with configurable placement.

import type { ReactNode } from "react";

type Placement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
	text: string;
	placement?: Placement;
	children: ReactNode;
}

// Maps each placement to:
//   - positioning classes for the tooltip bubble
//   - the arrow (border-trick) orientation + position
const placementStyles: Record<Placement, { bubble: string; arrow: string }> = {
	top: {
		bubble: "bottom-full left-1/2 -translate-x-1/2 mb-2",
		arrow: "top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent",
	},
	bottom: {
		bubble: "top-full left-1/2 -translate-x-1/2 mt-2",
		arrow: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent",
	},
	left: {
		bubble: "right-full top-1/2 -translate-y-1/2 mr-2",
		arrow: "left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent",
	},
	right: {
		bubble: "left-full top-1/2 -translate-y-1/2 ml-2",
		arrow: "right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent",
	},
};

export default function Tooltip({ text, placement = "top", children }: TooltipProps) {
	const { bubble, arrow } = placementStyles[placement];

	return (
		// `group` scopes the hover trigger; `relative` anchors the absolutely-positioned bubble
		<span className="relative inline-flex group">
			{children}
			{/* pointer-events-none prevents the tooltip from blocking clicks on elements underneath */}
			<span
				role="tooltip"
				className={`absolute z-50 pointer-events-none
                    px-2 py-1 rounded text-xs
                    bg-gray-800 text-white shadow-lg
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150 ease-in-out w-max-content max-w-xs ${bubble}`}
			>
				{text}
				{/* CSS border-trick arrow */}
				<span className={`absolute border-4 ${arrow}`} />
			</span>
		</span>
	);
}