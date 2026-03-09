#!/bin/bash
# =============================================================================
# deploy.sh - Despliegue Finward con Docker Compose
# =============================================================================
# USO: ./deploy.sh [comando]
#
# Requisitos:
#   - backend/.env (DATABASE_URL, SUPABASE_*, ALLOWED_ORIGINS, etc.)
#   - .env en raíz: se crea auto desde frontend/.env si no existe (VITE_API_URL, VITE_SUPABASE_*)
#
# COMANDOS:
#   start     - Inicia backend, frontend y proxy nginx
#   stop      - Detiene servicios
#   restart   - Reinicia servicios
#   update    - Build (backend+frontend), up -d
#   logs      - Logs en tiempo real
#   status    - Estado de servicios
#   db:push   - Prisma db push (schema a Supabase)
#   shell     - Shell en contenedor backend
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="finward"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
  command -v docker &>/dev/null || { log_error "Docker no instalado"; exit 1; }
  docker compose version &>/dev/null || docker-compose version &>/dev/null || { log_error "Docker Compose no instalado"; exit 1; }
}

check_env() {
  [[ -f backend/.env ]] || { log_error "Crea backend/.env desde backend/.env.example"; exit 1; }
}

# Crea .env en raíz con VITE_* si no existe (para build del frontend)
ensure_root_env() {
  local ROOT_ENV=".env"
  local FRONT_ENV="frontend/.env"
  if [[ ! -f "$ROOT_ENV" ]] && [[ -f "$FRONT_ENV" ]]; then
    log_info "Creando $ROOT_ENV desde $FRONT_ENV (VITE_*)..."
    echo "VITE_API_URL=/api" >> "$ROOT_ENV"
    grep -E "^VITE_SUPABASE_URL=" "$FRONT_ENV" 2>/dev/null >> "$ROOT_ENV" || true
    grep -E "^VITE_SUPABASE_ANON_KEY=" "$FRONT_ENV" 2>/dev/null >> "$ROOT_ENV" || true
    log_success "$ROOT_ENV creado"
  fi
}

compose_cmd() {
  if docker compose version &>/dev/null; then
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
  else
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
  fi
}

cmd_start() {
  ensure_root_env
  log_info "Iniciando Finward (backend + frontend + nginx)..."
  compose_cmd up -d
  log_success "Servicios iniciados. App: http://localhost"
  cmd_status
}

cmd_stop() {
  log_info "Deteniendo servicios..."
  compose_cmd down
  log_success "Servicios detenidos"
}

cmd_restart() {
  compose_cmd restart
  log_success "Reiniciado"
  cmd_status
}

cmd_update() {
  ensure_root_env
  log_info "Actualizando Finward (build + up)..."
  git pull origin main 2>/dev/null || true
  compose_cmd build --no-cache
  compose_cmd up -d
  log_success "Actualizado"
  cmd_status
}

cmd_logs() {
  compose_cmd logs -f
}

cmd_status() {
  compose_cmd ps
}

cmd_db_push() {
  log_info "Ejecutando prisma db push..."
  compose_cmd run --rm backend npx prisma db push
  log_success "Schema aplicado a Supabase"
}

cmd_shell() {
  compose_cmd exec backend sh
}

check_docker
check_env

case "${1:-start}" in
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_restart ;;
  update)   cmd_update ;;
  logs)     cmd_logs ;;
  status)   cmd_status ;;
  db:push)  cmd_db_push ;;
  shell)    cmd_shell ;;
  *) log_error "Comando desconocido: $1"; echo "Uso: ./deploy.sh {start|stop|restart|update|logs|status|db:push|shell}"; exit 1 ;;
esac
