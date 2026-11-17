CREATE TABLE `akun` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`email` text NOT NULL,
	`kata_sandi_hash` text NOT NULL,
	`peran` text NOT NULL,
	`dibuat_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `akun_email_unique` ON `akun` (`email`);--> statement-breakpoint
CREATE TABLE `sesi` (
	`id` text PRIMARY KEY NOT NULL,
	`akun_id` integer NOT NULL,
	`kedaluwarsa` integer NOT NULL,
	FOREIGN KEY (`akun_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action
);
