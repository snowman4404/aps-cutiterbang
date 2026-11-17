CREATE TABLE `etiket` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pemesanan_id` integer NOT NULL,
	`nomor_e_tiket` text NOT NULL,
	`waktu_terbit` integer NOT NULL,
	FOREIGN KEY (`pemesanan_id`) REFERENCES `pemesanan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `etiket_pemesanan_id_unique` ON `etiket` (`pemesanan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `etiket_nomor_e_tiket_unique` ON `etiket` (`nomor_e_tiket`);--> statement-breakpoint
CREATE TABLE `perjalanan_tercatat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`akun_id` integer NOT NULL,
	`pemesanan_id` integer NOT NULL,
	FOREIGN KEY (`akun_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pemesanan_id`) REFERENCES `pemesanan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `perjalanan_tercatat_akun_id_pemesanan_id_unique` ON `perjalanan_tercatat` (`akun_id`,`pemesanan_id`);--> statement-breakpoint
CREATE TABLE `profil` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`akun_id` integer NOT NULL,
	`nama_lengkap` text,
	`nomor_identitas` text,
	`tanggal_lahir` text,
	`nomor_telepon` text,
	`email` text,
	FOREIGN KEY (`akun_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profil_akun_id_unique` ON `profil` (`akun_id`);