import { useEffect, useCallback, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateStatus {
	available: boolean;
	version?: string;
	error?: string;
	installing: boolean;
}

/**
 * Hook for checking and managing app updates.
 * Automatically checks for updates on mount, then provides methods
 * to install or dismiss the update banner.
 *
 * Usage:
 *   const { available, version, install, dismiss } = useUpdater();
 *   if (available) {
 *     return <UpdateBanner onInstall={install} onDismiss={dismiss} version={version} />;
 *   }
 */
export function useUpdater() {
	const [status, setStatus] = useState<UpdateStatus>({
		available: false,
		installing: false,
	});

	// Check for updates on component mount
	useEffect(() => {
		const checkForUpdates = async () => {
			try {
				const update = await check();
				if (update != null) {
					setStatus({
						available: true,
						version: update.version,
						installing: false,
					});
				}
			} catch (error) {
				// Network error, no internet, or plugin disabled — not a critical failure
				console.warn('Failed to check for updates:', error);
				setStatus((prev) => ({
					...prev,
					error: String(error),
				}));
			}
		};

		checkForUpdates();
	}, []);

	// Install the update and restart
	const install = useCallback(async () => {
		try {
			setStatus((prev) => ({ ...prev, installing: true }));

			// The updater plugin handles download + install
			// After install completes, we relaunch the app
			await relaunch();
		} catch (error) {
			console.error('Failed to install update:', error);
			setStatus((prev) => ({
				...prev,
				installing: false,
				error: String(error),
			}));
		}
	}, []);

	// Dismiss the update notification (user chooses "later")
	const dismiss = useCallback(() => {
		setStatus((prev) => ({
			...prev,
			available: false,
		}));
	}, []);

	return {
		available: status.available,
		version: status.version,
		installing: status.installing,
		error: status.error,
		install,
		dismiss,
	};
}