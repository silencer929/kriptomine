-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: cryptomarketsafrica
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(18,8) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destination` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_username` (`username`),
  CONSTRAINT `fk_transactions_users` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,'peter','deposit',300.00000000,'failed','5510-4c34-ac62-4c6003a6b8934962107',NULL,'KES',NULL,'2025-09-29 08:04:55'),(2,'peter','deposit',10.00000000,'failed','c020-4cc4-9f7f-797d5787eb639177984',NULL,'KES',NULL,'2025-09-29 08:08:21'),(3,'peter','deposit',10.00000000,'failed','6860-443e-b611-d7dab0063d6b16487447',NULL,'KES',NULL,'2025-09-29 08:15:14'),(4,'peter','deposit',10.00000000,'failed','d942-4afc-a1b9-f3f14902881b3187573',NULL,'KES',NULL,'2025-09-29 08:15:59'),(5,'peter','deposit',300.00000000,'failed','9600-4b48-822d-c4dc6fbbba3717311438',NULL,'KES',NULL,'2025-09-29 08:52:24'),(6,'peter','mining',3000.00000000,'completed',NULL,NULL,'LTC',NULL,'2025-09-29 12:29:01'),(7,'peter','deposit',300.00000000,'pending','526c-491e-a700-2fc535b56cf797987',NULL,'KES',NULL,'2026-03-01 09:45:05');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `portfolio` json NOT NULL DEFAULT (json_object()),
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('peter','$2b$12$F6EDf7.aUU3ZTiH3wIVbzOlkeIc8MFfET4Lb57gH/dS/h/6NBVJyu','254798614280',1000.00,1,'{\"ltc\": 0.01}',0),('Pleamore','$2b$12$PAGjZIkIl3apYem/C7bFU.eMgQBK7K2t4KY1CfQyJpDiUIq59WYjG','254726493902',0.00,0,'{}',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `withdrawal_requests`
--

DROP TABLE IF EXISTS `withdrawal_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `withdrawal_requests` (
  `_id` int unsigned NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(18,8) DEFAULT NULL,
  `destination` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`_id`),
  KEY `idx_withdrawal_userId` (`userId`),
  CONSTRAINT `fk_withdrawal_users` FOREIGN KEY (`userId`) REFERENCES `users` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawal_requests`
--

LOCK TABLES `withdrawal_requests` WRITE;
/*!40000 ALTER TABLE `withdrawal_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `withdrawal_requests` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-02 16:38:00
