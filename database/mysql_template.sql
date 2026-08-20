SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS iptv_db;
USE iptv_db;
CREATE TABLE `vlans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `ip_range` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `subnet_mask` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_mgmt` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `server_ips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `server_id` int NOT NULL,
  `vlan_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `server_id` (`server_id`),
  KEY `vlan_id` (`vlan_id`),
  CONSTRAINT `server_ips_ibfk_1` FOREIGN KEY (`server_id`) REFERENCES `servers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `server_ips_ibfk_2` FOREIGN KEY (`vlan_id`) REFERENCES `vlans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1247 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- servers.servers definition

CREATE TABLE `servers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hostname` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `group_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hostname` (`hostname`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `servers_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `server_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=375 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- servers.server_groups definition

CREATE TABLE `server_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
