CREATE TABLE `hari_libur` (
	`tanggal` text PRIMARY KEY NOT NULL,
	`keterangan` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pegawai` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`nomor_induk_pegawai` text NOT NULL,
	`jatah_cuti_tahunan` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pegawai_nomor_induk_pegawai_unique` ON `pegawai` (`nomor_induk_pegawai`);--> statement-breakpoint
CREATE TABLE `pengajuan_cuti` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pegawai_id` integer NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_akhir` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai`(`id`) ON UPDATE no action ON DELETE no action
);
