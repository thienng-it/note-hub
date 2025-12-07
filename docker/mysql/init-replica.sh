#!/bin/bash
# MySQL Replica Initialization Script
# This script configures a replica to connect to the primary database

set -e

echo "Waiting for primary database to be ready..."
sleep 30

echo "Configuring replica to connect to primary..."

# Configure the replica to connect to the primary
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CHANGE MASTER TO
        MASTER_HOST='mysql-primary',
        MASTER_USER='replicator',
        MASTER_PASSWORD='replicator_password',
        MASTER_AUTO_POSITION=1;
    
    START SLAVE;
    
    SHOW SLAVE STATUS\G
EOSQL

echo "Replica configuration complete"
