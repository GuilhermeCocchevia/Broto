CREATE TABLE `categorias` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`cor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `simulacoes` (
	`id` text PRIMARY KEY NOT NULL,
	`descricao` text NOT NULL,
	`valor_total` real NOT NULL,
	`parcelas` integer NOT NULL,
	`data_inicio` text NOT NULL,
	`categoria_id` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transacoes` (
	`id` text PRIMARY KEY NOT NULL,
	`descricao` text NOT NULL,
	`valor` real NOT NULL,
	`data` text NOT NULL,
	`tipo` text NOT NULL,
	`categoria_id` text NOT NULL,
	`frequencia` text NOT NULL,
	`data_fim` text,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action
);
