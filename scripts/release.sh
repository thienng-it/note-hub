#!/bin/bash
# Trigger remote deployment
echo "🚀 Triggering remote deployment on 135.181.96.141..."
ssh root@135.181.96.141 "cd /opt/note-hub && ./scripts/deploy.sh"
