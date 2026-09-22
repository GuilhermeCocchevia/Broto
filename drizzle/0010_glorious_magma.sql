CREATE TABLE `conquistas_desbloqueadas` (
	`id` text PRIMARY KEY NOT NULL,
	`chave` text NOT NULL,
	`desbloqueada_em` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `configuracoes` ADD `tutorial_concluido` integer DEFAULT false NOT NULL;