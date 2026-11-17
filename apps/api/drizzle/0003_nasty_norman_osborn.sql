PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_penerbangan` (
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
	FOREIGN KEY (`tujuan_id`) REFERENCES `kota`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "penerbangan_kota_berbeda" CHECK("__new_penerbangan"."asal_id" <> "__new_penerbangan"."tujuan_id"),
	CONSTRAINT "penerbangan_jumlah_kursi_tak_negatif" CHECK("__new_penerbangan"."jumlah_kursi" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_penerbangan`("id", "nomor_penerbangan", "tanggal_keberangkatan", "waktu_berangkat", "waktu_tiba", "harga", "jumlah_kursi", "maskapai_id", "asal_id", "tujuan_id") SELECT "id", "nomor_penerbangan", "tanggal_keberangkatan", "waktu_berangkat", "waktu_tiba", "harga", "jumlah_kursi", "maskapai_id", "asal_id", "tujuan_id" FROM `penerbangan`;--> statement-breakpoint
DROP TABLE `penerbangan`;--> statement-breakpoint
ALTER TABLE `__new_penerbangan` RENAME TO `penerbangan`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `penerbangan_nomor_penerbangan_tanggal_keberangkatan_unique` ON `penerbangan` (`nomor_penerbangan`,`tanggal_keberangkatan`);