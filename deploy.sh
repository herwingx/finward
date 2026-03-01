#!/bin/bash
# deploy.sh - Despliegue Finward Backend
# USO: ./deploy.sh [comando]
#
# Comandos:
#   start     - Inicia backend
#   stop      - Detiene servicios
#   restart   - Reinicia backend
#   update    - Pull, build, restart
#   logs      - Logs en tiempo real
#   status    - Estado de servicios
#   db:push   - Prisma db push (schema a Supabase)
#   shell     - Shell en contenedor backend

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="finward"


log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
  command -v docker &>/dev/null || { log_error "Docker no instalado"; exit 1; }
  docker compose version &>/dev/null || { log_error "Docker Compose plugin no instalado"; exit 1; }
}

check_env() {
  [[ -f backend/.env ]] || { log_warning "Crea backend/.env desde backend/.env.example"; exit 1; }
}

cmd_start() {
  log_info "Iniciando Finward..."
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
  log_success "Backend iniciado"
  cmd_status
}

cmd_stop() {
  log_info "Deteniendo servicios..."
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
  log_success "Servicios detenidos"
}

cmd_restart() {
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME restart
  log_success "Reiniciado"
  cmd_status
}

cmd_update() {
  log_info "Actualizando Finward..."
  git pull origin main 2>/dev/null || true
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache backend
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
  log_success "Actualizado"
  cmd_status
}

cmd_logs() {
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
}

cmd_status() {
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

cmd_db_push() {
  log_info "Ejecutando prisma db push..."
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm backend npx prisma db push
  log_success "Schema aplicado a Supabase"
}

cmd_shell() {
  docker compose -f $COMPOSE_FILE -p $PROJECT_NAME exec backend sh
}

check_docker
check_env

case "${1:-start}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  restart) cmd_restart ;;
  update) cmd_update ;;
  logs)   cmd_logs ;;
  status) cmd_status ;;
  db:push) cmd_db_push ;;
  shell)  cmd_shell ;;
  *) log_error "Comando desconocido: $1"; exit 1 ;;
esac
