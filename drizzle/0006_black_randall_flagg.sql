CREATE TABLE `taxas_referencia` (
	`id` text PRIMARY KEY NOT NULL,
	`selic_meta_anual` real,
	`cdi_anualizado_anual` real,
	`tesouro_renda_mais_json` text,
	`atualizado_em` text
);
