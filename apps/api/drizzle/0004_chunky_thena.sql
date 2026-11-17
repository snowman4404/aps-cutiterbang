CREATE TABLE `alokasi_kursi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penerbangan_id` integer NOT NULL,
	`kode_normal` text NOT NULL,
	`jumlah` integer NOT NULL,
	FOREIGN KEY (`penerbangan_id`) REFERENCES `penerbangan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "alokasi_kursi_jumlah_positif" CHECK("alokasi_kursi"."jumlah" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alokasi_kursi_kode_normal_unique` ON `alokasi_kursi` (`kode_normal`);--> statement-breakpoint
CREATE INDEX `alokasi_kursi_penerbangan` ON `alokasi_kursi` (`penerbangan_id`);--> statement-breakpoint
CREATE TABLE `pemesanan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode` text NOT NULL,
	`kode_normal` text NOT NULL,
	`status` text NOT NULL,
	`waktu_dibuat` integer NOT NULL,
	`penerbangan_id` integer NOT NULL,
	`pemesan_id` integer NOT NULL,
	FOREIGN KEY (`penerbangan_id`) REFERENCES `penerbangan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pemesan_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pemesanan_status_sah" CHECK("pemesanan"."status" in ('WaitingForThePayment', 'Booked', 'Confirmed', 'Cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pemesanan_kode_normal_unique` ON `pemesanan` (`kode_normal`);--> statement-breakpoint
CREATE INDEX `pemesanan_pemesan` ON `pemesanan` (`pemesan_id`);--> statement-breakpoint
CREATE TABLE `penumpang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pemesanan_id` integer NOT NULL,
	`akun_id` integer,
	`nama_lengkap` text NOT NULL,
	`nomor_identitas` text NOT NULL,
	`tanggal_lahir` text NOT NULL,
	`nomor_telepon` text NOT NULL,
	`email` text NOT NULL,
	FOREIGN KEY (`pemesanan_id`) REFERENCES `pemesanan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`akun_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `penumpang_pemesanan` ON `penumpang` (`pemesanan_id`);--> statement-breakpoint
CREATE INDEX `penumpang_akun` ON `penumpang` (`akun_id`);