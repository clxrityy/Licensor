interface UpdateBannerProps {
	version: string;
	onInstall: () => void;
	onDismiss: () => void;
	installing?: boolean;
}

/**
 * Banner shown when an update is available.
 * Appears at the top of the app with options to install or dismiss.
 */
export function UpdateBanner({
	version,
	onInstall,
	onDismiss,
	installing = false,
}: UpdateBannerProps) {
	return (
		<div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="text-sm">
					<p className="font-semibold text-blue-900">
						Update available: v{version}
					</p>
					<p className="text-blue-700 text-xs">
						A new version of Licensor is ready to install.
					</p>
				</div>
			</div>

			<div className="flex gap-2">
				<button
					onClick={onDismiss}
					disabled={installing}
					className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-900 hover:bg-blue-200 disabled:opacity-50"
				>
					Later
				</button>
				<button
					onClick={onInstall}
					disabled={installing}
					className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{installing ? 'Installing...' : 'Install Now'}
				</button>
			</div>
		</div>
	);
}