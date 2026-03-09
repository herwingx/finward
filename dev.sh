#!/bin/bash
# =============================================================================
# dev.sh - Desarrollo local Finward (Backend + Frontend)
# =============================================================================
# USO: ./dev.sh [comando]
#
# Finward usa Supabase externo (no Postgres local).
#
# FLUJO:
#   1. ./dev.sh setup     # Primera vez: .env, npm install, prisma generate
#   2. ./dev.sh start     # Inicia backend + frontend (concurrently, logs prefijados)
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
    
    log_info "Instalando dependencias (backend + frontend)..."
    (cd backend && npm install)
    (cd frontend && npm install)
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
    
    log_info "Iniciando backend + frontend (concurrently)..."
    echo ""
    echo "  Backend:  http://localhost:4000"
    echo "  API:      http://localhost:4000/api"
    echo "  Swagger:  http://localhost:4000/api-docs"
    echo "  Frontend: http://localhost:3000"
    echo ""
    npx concurrently \
        -n "backend,frontend" \
        -c "blue,green" \
        "cd backend && npm run dev" \
        "cd frontend && npm run dev"
}

cmd_db_push() {
    log_info "Aplicando schema a Supabase (prisma db push)..."
    (cd backend && set -a && . .env 2>/dev/null; set +a
     export DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}"
     npx prisma db push)
    log_success "Schema aplicado. Luego ejecuta: ./dev.sh rls"
}

cmd_rls() {
    if [ ! -f backend/prisma/rls-policies.sql ]; then
        log_error "backend/prisma/rls-policies.sql no existe"
        exit 1
    fi
    if command -v psql &>/dev/null; then
        log_info "Aplicando políticas RLS vía psql..."
        (cd backend && set -a && . .env 2>/dev/null; set +a
         psql "$DIRECT_URL" -f prisma/rls-policies.sql)
        log_success "RLS aplicado"
    else
        echo ""
        log_warning "psql no instalado. Ejecuta backend/prisma/rls-policies.sql en Supabase SQL Editor:"
        echo ""
        echo "  1. Supabase Dashboard > SQL Editor"
        echo "  2. Nuevo query, pega el contenido de backend/prisma/rls-policies.sql"
        echo "  3. Run"
        echo ""
    fi
}

cmd_setup_dev() {
    log_info "Setup completo: Auth user + Seed + RLS..."
    (cd backend && npm run db:setup-dev)
    log_success "Setup completado. Usa demo@finward.dev / DemoFinward123!"
}

cmd_db_seed() {
    if [ ! -f backend/.env ]; then
        log_error "backend/.env no existe. Ejecuta: ./dev.sh setup"
        exit 1
    fi
    (cd backend && set -a && . .env 2>/dev/null; set +a
     if [ -z "$SEED_USER_ID" ]; then
         log_error "SEED_USER_ID no definido. Crea usuario en Supabase Auth y añade SEED_USER_ID=uuid a backend/.env"
         exit 1
     fi
     npm run db:seed)
    log_success "Seed completado"
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
║         Finward - Desarrollo Local (Backend + Frontend)      ║
╚══════════════════════════════════════════════════════════════╝

USO: ./dev.sh [comando]

COMANDOS:
  setup       Primera vez: .env, npm install (backend+frontend), prisma generate
  start       Inicia backend + frontend (concurrently, logs prefijados)
  db:push     Aplica schema a Supabase (prisma db push)
  setup-dev   Setup completo: crea auth user demo, seed, RLS (demo@finward.dev / DemoFinward123!)
  db:seed     Ejecuta seed de datos de prueba (requiere SEED_USER_ID)
  rls         Aplica políticas RLS (o instrucciones si no hay psql)
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
    setup-dev) cmd_setup_dev ;;
    db:seed)   cmd_db_seed ;;
    rls)       cmd_rls ;;
    generate)  cmd_generate ;;
    studio)    cmd_studio ;;
    help|-h|--help) cmd_help ;;
    *)         cmd_help ;;
esac
