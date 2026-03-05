// www/components/ui/VariablePills.tsx
// Renders a capped list of variable name pills with a toggle to reveal the rest.
// Keeps the TemplateList table row compact when a template has many variables.
import { useState } from "react";
import type { TemplateVariable } from "../../lib/types";
import Tooltip from "./Tooltip";

interface VariablePillsProps {
	variables: TemplateVariable[];
	/** How many pills to show before collapsing. Default: 3 */
	limit?: number;
}

export default function VariablePills({ variables, limit = 3 }: VariablePillsProps) {
	const [expanded, setExpanded] = useState(false);

	// Nothing special needed — fits within the limit or there are none.
	if (variables.length <= limit) {
		return (
			<div className="flex flex-wrap gap-1">
				{variables.map((v) => (
					<Pill key={v.name} name={v.name} />
				))}
			</div>
		);
	}

	// Split into always-visible and overflow sets.
	const visible = expanded ? variables : variables.slice(0, limit);
	const overflowCount = variables.length - limit;

	return (
		<div className="flex flex-wrap gap-1 items-center">
			{visible.map((v) => (
				<Pill key={v.name} name={v.name} />
			))}

			{/* Toggle button styled to match the pills so it blends in naturally */}
			<Tooltip text={expanded ? "Show less" : `Show more`}>
				<button
					onClick={() => setExpanded((prev) => !prev)}
					className="inline-block px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-600 transition-colors"
					title={expanded ? "Show fewer variables" : `Show ${overflowCount} more`}
				>
					{expanded ? "- less" : `+${overflowCount}`}
				</button>
			</Tooltip>
		</div>
	);
}

// Small local sub-component — not exported because it's only used here.
function Pill({ name }: { name: string }) {
	return (
		<span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-xs">
			{name}
		</span>
	);
}