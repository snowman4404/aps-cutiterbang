CREATE TABLE `kota` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`zona_waktu` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kota_nama_unique` ON `kota` (`nama`);--> statement-breakpoint
CREATE TABLE `maskapai` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maskapai_nama_unique` ON `maskapai` (`nama`);--> statement-breakpoint
CREATE TABLE `penerbangan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nomor_penerbangan` text NOT NULL,
	`tanggal_keberangkatan` text NOT NULL,
	`waktu_berangkat` text NOT NULL,
	`waktu_tiba` text NOT NULL,
	`harga` integer NOT NULL,
	`jumlah_kursi` integer NOT NULL,
	`maskapai_id` integer NOT NULL,
	`asal_id` integer NOT NULL,
	`tujuan_id` integer NOT NULL,
	FOREIGN KEY (`maskapai_id`) REFERENCES `maskapai`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asal_id`) REFERENCES `kota`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tujuan_id`) REFERENCES `kota`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `penerbangan_nomor_penerbangan_tanggal_keberangkatan_unique` ON `penerbangan` (`nomor_penerbangan`,`tanggal_keberangkatan`);