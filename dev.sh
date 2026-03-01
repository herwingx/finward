#!/bin/bash
# =============================================================================
# dev.sh - Desarrollo local Finward Backend
# =============================================================================
# USO: ./dev.sh [comando]
#
# Finward usa Supabase externo (no Postgres local).
#
# FLUJO:
#   1. ./dev.sh setup     # Primera vez: .env, npm install, prisma generate
#   2. ./dev.sh start     # Inicia backend con hot reload
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[DEV]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# COMANDOS
# =============================================================================

cmd_setup() {
    log_info "Configurando entorno de desarrollo Finward..."
    
    if [ ! -f "backend/.env" ]; then
        log_info "Creando backend/.env desde backend/.env.example..."
        cp backend/.env.example backend/.env
        log_success "backend/.env creado - edita con tus credenciales Supabase"
    else
        log_warning "backend/.env ya existe, no se sobrescribe"
    fi
    
    log_info "Instalando dependencias..."
    (cd backend && npm install)
    log_success "Dependencias instaladas"
    
    log_info "Generando cliente Prisma..."
    (cd backend && npx prisma generate)
    log_success "Cliente Prisma generado"
    
    echo ""
    log_success "=== SETUP COMPLETADO ==="
    echo ""
    echo "Edita backend/.env con DATABASE_URL, DIRECT_URL, SUPABASE_URL, etc."
    echo "Luego: ./dev.sh start"
    echo ""
}

cmd_start() {
    if [ ! -f "backend/.env" ]; then
        log_error "backend/.env no existe. Ejecuta: ./dev.sh setup"
        exit 1
    fi
    
    log_info "Iniciando backend (Supabase externo)..."
    echo ""
    echo "  Backend:  http://localhost:4000"
    echo "  API:      http://localhost:4000/api"
    echo "  Swagger:  http://localhost:4000/api-docs"
    echo ""
    (cd backend && npm run dev)
}

cmd_db_push() {
    log_info "Aplicando schema a Supabase (prisma db push)..."
    (cd backend && npx prisma db push)
    log_success "Schema aplicado"
}

cmd_generate() {
    log_info "Generando cliente Prisma..."
    (cd backend && npx prisma generate)
    log_success "Listo"
}

cmd_studio() {
    log_info "Abriendo Prisma Studio..."
    (cd backend && npx prisma studio)
}

cmd_help() {
    echo "
╔══════════════════════════════════════════════════════════════╗
║              Finward - Desarrollo Local (Backend)            ║
╚══════════════════════════════════════════════════════════════╝

USO: ./dev.sh [comando]

COMANDOS:
  setup       Primera vez: .env, npm install, prisma generate
  start       Inicia backend con hot reload (ts-node-dev)
  db:push     Aplica schema a Supabase (prisma db push)
  generate    Regenera cliente Prisma
  studio      Abre Prisma Studio

Nota: Finward usa Supabase externo (no Postgres local).
"
}

# =============================================================================
# MAIN
# =============================================================================

check_deps() {
    command -v node &>/dev/null || { log_error "Node no instalado"; exit 1; }
    command -v npm &>/dev/null || { log_error "npm no instalado"; exit 1; }
}

check_deps

case "${1:-start}" in
    setup)     cmd_setup ;;
    start)     cmd_start ;;
    db:push)   cmd_db_push ;;
    generate)  cmd_generate ;;
    studio)    cmd_studio ;;
    help|-h|--help) cmd_help ;;
    *)         cmd_help ;;
esac
