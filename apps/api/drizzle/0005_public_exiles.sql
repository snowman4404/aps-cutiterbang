PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_penumpang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pemesanan_id` integer NOT NULL,
	`akun_id` integer NOT NULL,
	`nama_lengkap` text NOT NULL,
	`nomor_identitas` text NOT NULL,
	`tanggal_lahir` text NOT NULL,
	`nomor_telepon` text NOT NULL,
	`email` text NOT NULL,
	FOREIGN KEY (`pemesanan_id`) REFERENCES `pemesanan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`akun_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "penumpang_nama_terisi" CHECK(length(trim("__new_penumpang"."nama_lengkap")) > 0),
	CONSTRAINT "penumpang_identitas_terisi" CHECK(length(trim("__new_penumpang"."nomor_identitas")) > 0),
	CONSTRAINT "penumpang_tanggal_lahir_terisi" CHECK(length(trim("__new_penumpang"."tanggal_lahir")) > 0),
	CONSTRAINT "penumpang_telepon_terisi" CHECK(length(trim("__new_penumpang"."nomor_telepon")) > 0),
	CONSTRAINT "penumpang_email_terisi" CHECK(length(trim("__new_penumpang"."email")) > 0)
);
--> statement-breakpoint
INSERT INTO `__new_penumpang`("id", "pemesanan_id", "akun_id", "nama_lengkap", "nomor_identitas", "tanggal_lahir", "nomor_telepon", "email") SELECT "id", "pemesanan_id", "akun_id", "nama_lengkap", "nomor_identitas", "tanggal_lahir", "nomor_telepon", "email" FROM `penumpang`;--> statement-breakpoint
DROP TABLE `penumpang`;--> statement-breakpoint
ALTER TABLE `__new_penumpang` RENAME TO `penumpang`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `penumpang_pemesanan` ON `penumpang` (`pemesanan_id`);--> statement-breakpoint
CREATE INDEX `penumpang_akun` ON `penumpang` (`akun_id`);