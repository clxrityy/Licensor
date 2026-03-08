import { useEffect, useCallback, useState, useRef } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateStatus {
	available: boolean;
	version?: string;
	error?: string;
	installing: boolean;
}

export function useUpdater() {
	const [status, setStatus] = useState<UpdateStatus>({
		available: false,
		installing: false,
	});

	// Hold the Update object so install() can call downloadAndInstall() on it
	const updateRef = useRef<Update | null>(null);

	useEffect(() => {
		const checkForUpdates = async () => {
			try {
				const update = await check();
				if (update) {
					updateRef.current = update;
					setStatus({
						available: true,
						version: update.version,
						installing: false,
					});
				}
			} catch (error) {
				console.warn('Failed to check for updates:', error);
				setStatus((prev) => ({ ...prev, error: String(error) }));
			}
		};

		checkForUpdates();
	}, []);

	const install = useCallback(async () => {
		const update = updateRef.current;
		if (!update) return;

		try {
			setStatus((prev) => ({ ...prev, installing: true }));

			// Downloads the binary, verifies signature against pubkey, writes to disk
			await update.downloadAndInstall();

			// Restart the app to apply the update
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

	const dismiss = useCallback(() => {
		setStatus((prev) => ({ ...prev, available: false }));
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