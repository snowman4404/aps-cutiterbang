CREATE TABLE `email_terkirim` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pemesanan_id` integer NOT NULL,
	`akun_id` integer NOT NULL,
	`kepada` text NOT NULL,
	`subjek` text NOT NULL,
	`isi` text NOT NULL,
	`waktu_kirim` integer NOT NULL,
	FOREIGN KEY (`pemesanan_id`) REFERENCES `pemesanan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`akun_id`) REFERENCES `akun`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `email_terkirim_akun` ON `email_terkirim` (`akun_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_terkirim_pemesanan_id_kepada_unique` ON `email_terkirim` (`pemesanan_id`,`kepada`);