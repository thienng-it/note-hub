#!/bin/bash
# MySQL Replica Initialization Script
# This script configures a replica to connect to the primary database

set -e

echo "Waiting for primary database to be ready..."
sleep 30

echo "Configuring replica to connect to primary..."

# Get replication password from environment or use default
REPLICATION_PASSWORD="${MYSQL_REPLICATION_PASSWORD:-change-this-replication-password}"

# Configure the replica to connect to the primary
# Using modern CHANGE REPLICATION SOURCE syntax (MySQL 8.0.23+)
# Falls back to legacy CHANGE MASTER syntax if needed
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    -- Try modern syntax first (MySQL 8.0.23+)
    CHANGE REPLICATION SOURCE TO
        SOURCE_HOST='mysql-primary',
        SOURCE_USER='replicator',
        SOURCE_PASSWORD='${REPLICATION_PASSWORD}',
        SOURCE_AUTO_POSITION=1;
    
    START REPLICA;
    
    SHOW REPLICA STATUS\G
EOSQL

if [ $? -ne 0 ]; then
    echo "Modern syntax failed, trying legacy syntax..."
    # Fallback to legacy syntax for older MySQL versions
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
        CHANGE MASTER TO
            MASTER_HOST='mysql-primary',
            MASTER_USER='replicator',
            MASTER_PASSWORD='${REPLICATION_PASSWORD}',
            MASTER_AUTO_POSITION=1;
        
        START SLAVE;
        
        SHOW SLAVE STATUS\G
EOSQL
fi

echo "Replica configuration complete"
