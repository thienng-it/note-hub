-- MySQL Primary Database Initialization Script
-- This script sets up the primary database for replication

-- Create a replication user for replicas to connect
-- Password is set via environment variable: MYSQL_REPLICATION_PASSWORD
-- Default password is shown here for reference only - CHANGE IN PRODUCTION!
CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED BY '${MYSQL_REPLICATION_PASSWORD:-change-this-replication-password}';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;

-- Set the primary to use GTID-based replication
-- (Already configured via command line parameters, this is for documentation)
-- SET GLOBAL gtid_mode = ON;
-- SET GLOBAL enforce_gtid_consistency = ON;

-- Show primary status for reference
SHOW MASTER STATUS;
