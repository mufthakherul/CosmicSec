#!/bin/bash
# Advanced Storage Cleanup Script for Milonexa Workspace
# Author: mufthakherul
# Usage: bash scripts/storage-cleanup.sh

set -e

WORKSPACE="/workspaces/hacker_ai"
LOGFILE="$WORKSPACE/storage_cleanup.log"

function log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}


log "--- Storage Cleanup Started ---"

# Capture disk usage before cleanup
DISK_BEFORE=$(df -B1 --output=used "$WORKSPACE" | tail -1)
log "Disk usage BEFORE cleanup: $(df -h "$WORKSPACE" | tail -1)"


DOCKER_AVAILABLE=false
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    DOCKER_AVAILABLE=true
  else
    log "Docker daemon not reachable. Skipping Docker cleanup steps."
  fi
else
  log "Docker CLI not found. Skipping Docker cleanup steps."
fi


# Docker cleanup
if [ "$DOCKER_AVAILABLE" = true ]; then
  log "Cleaning Docker system..."
  docker system prune -af --volumes
  log "Cleaning Docker builder cache..."
  docker builder prune -af
fi


# Remove workspace logs, builds, node_modules, cache
log "Removing workspace logs and build artifacts..."
rm -rf "$WORKSPACE/logs"/* "$WORKSPACE/frontend/build"/* "$WORKSPACE/services"/*/build/* || true

log "Removing node_modules from all services and frontend..."
find "$WORKSPACE" -type d -name "node_modules" -prune -exec rm -rf '{}' +

log "Removing temp and cache files..."
find "$WORKSPACE" -type f \( -name "*.log" -o -name "*.tmp" -o -name "*.cache" \) -delete


# Remove old journal logs (if root)
if [ "$EUID" -eq 0 ]; then
  log "Cleaning system journal logs..."
  journalctl --vacuum-size=100M || true
fi


if [ "$DOCKER_AVAILABLE" = true ]; then
  # Remove orphaned Docker volumes
  log "Removing orphaned Docker volumes..."
  docker volume prune -f

  # Remove orphaned Docker networks
  log "Removing orphaned Docker networks..."
  docker network prune -f

  # Remove orphaned Docker images
  log "Removing dangling Docker images..."
  docker image prune -f

  # Remove old Ollama images
  log "Removing old Ollama images..."
  docker images | grep 'ollama/ollama' | awk '{print $3}' | xargs -r docker rmi -f || true
fi

# Interactive prompt for critical folders
CRITICAL_FOLDERS=("$WORKSPACE/frontend/public/uploads" "$WORKSPACE/services/media-service/uploads")
for folder in "${CRITICAL_FOLDERS[@]}"; do
  if [ -d "$folder" ]; then
    read -p "Do you want to delete $folder? (y/N): " yn
    case $yn in
      [Yy]*) rm -rf "$folder"; log "Deleted $folder";;
      *) log "Skipped $folder";;
    esac
  fi
done


# Capture disk usage after cleanup
DISK_AFTER=$(df -B1 --output=used "$WORKSPACE" | tail -1)
FREED=$((DISK_BEFORE - DISK_AFTER))
FREED_HR=$(numfmt --to=iec $FREED 2>/dev/null || echo "$FREED bytes")
log "Disk usage AFTER cleanup: $(df -h "$WORKSPACE" | tail -1)"

log "--- Storage Cleanup Complete ---"
log "Total space freed: $FREED_HR"

# Show summary
cat "$LOGFILE"