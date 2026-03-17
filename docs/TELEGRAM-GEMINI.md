# Plan: Bot de Telegram + Gemini para Finward

Plan detallado para implementar un bot de Telegram que permita consultar datos financieros de Finward usando lenguaje natural, con Gemini como motor de IA.

---

## 1. Objetivo

- Usuario abre bot de Telegram.
- Escribe preguntas en lenguaje natural: *"¿Cuánto gasté en comida este mes?"*, *"¿Puedo gastar 2000 este finde?"*, *"¿Qué pagos tengo esta semana?"*.
- El bot responde usando datos reales de Finward (cuentas, transacciones, MSI, metas, préstamos).
- Gemini genera respuestas coherentes a partir del contexto financiero.

---

## 2. Arquitectura

```
Usuario → Telegram → Webhook (POST) → Backend Finward
                                          ↓
                                   1. Identificar usuario (telegram_user_id → userId)
                                   2. Obtener contexto financiero (reusar /api/ai/context)
                                   3. Llamar Gemini API (prompt + contexto)
                                   4. Enviar respuesta vía Telegram API
```

**Componentes:**

| Componente | Descripción |
|------------|-------------|
| Bot de Telegram | Creado con @BotFather, token en `TELEGRAM_BOT_TOKEN` |
| Webhook | `POST /api/telegram/webhook` (sin auth JWT; validado con secret) |
| Tabla `telegram_link` | Vincula `telegram_user_id` ↔ `user_id` (Supabase) |
| Servicio Gemini | Cliente HTTP a `generativelanguage.googleapis.com` |
| Endpoint interno | Reutilizar lógica de `aiRoutes.ts` (contexto financiero) |

---

## 3. Flujo de autenticación (vincular cuenta)

El bot no usa JWT. Hay que asociar cada usuario de Telegram a un usuario de Finward.

### 3.1 Opción A: Token mágico (recomendada para MVP)

1. Usuario abre bot → `/start`.
2. Bot responde: *"Para vincular tu cuenta, entra a [finward.app/link?code=ABC123](url) e inicia sesión."*
3. Backend genera `code` único (UUID), lo guarda en Redis o tabla `telegram_link_pending` con `{ code, telegram_user_id }`, TTL 10 min.
4. Frontend: página `/link?code=ABC123` que, tras login, llama `POST /api/telegram/link` con `{ code }` y el JWT del usuario.
5. Backend valida `code`, obtiene `userId` del JWT, crea `TelegramLink(userId, telegram_user_id)`.
6. Usuario vuelve al bot y ya puede hacer consultas.

### 3.2 Opción B: Login vía Telegram (login por bot)

- Bot envía botón "Iniciar sesión en Finward".
- Abre URL: `https://finward.app/auth/telegram?tg_user_id=12345&hash=...` (hash firmado para evitar suplantación).
- En esa URL el usuario hace login normal (email/password). Tras login, se vincula automáticamente.

### 3.3 Base de datos

```sql
-- Nueva tabla
CREATE TABLE telegram_link (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

Y opcionalmente para tokens de vinculación:

```sql
CREATE TABLE telegram_link_pending (
  code            TEXT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL
);
```

---

## 4. Webhook de Telegram

### 4.1 Registro del webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tu-dominio.com/api/telegram/webhook"
```

O con secret para validar que los requests vienen de Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tu-dominio.com/api/telegram/webhook","secret_token":"<WEBHOOK_SECRET>"}'
```

### 4.2 Endpoint `POST /api/telegram/webhook`

- **Sin** `authMiddleware` (Telegram no envía JWT).
- Validar que el body sea un `Update` de Telegram (campo `update_id`).
- Opcional: validar header `X-Telegram-Bot-Api-Secret-Token` si usas `secret_token`.
- Responder **rápido** (200 OK en <1s) y procesar en background si la lógica es pesada.
- Parsear `message.text` o `message.text` (comandos como `/start`, `/saldo`, etc.) o texto libre.

Estructura típica de un `Update`:

```json
{
  "update_id": 123456,
  "message": {
    "message_id": 1,
    "from": { "id": 987654321, "username": "juan" },
    "chat": { "id": 987654321, "type": "private" },
    "date": 1234567890,
    "text": "¿Cuánto gasté este mes?"
  }
}
```

---

## 5. Flujo de consulta con Gemini

1. `message.from.id` → buscar `TelegramLink` → `userId`.
2. Si no existe enlace → responder: *"Primero vincula tu cuenta: [link]"*.
3. Obtener contexto financiero (igual que `GET /api/ai/context`):
   - Cuentas, balances, net worth, burn rate, runway.
   - Obligaciones próximas (TDC, recurrentes, MSI).
   - Top categorías de gasto, advertencias.
   - Resumen en texto natural (`natural_summary`).
4. Construir prompt para Gemini:

   ```
   Eres un asistente financiero. El usuario te pregunta sobre sus finanzas personales.
   Contador solo con la siguiente información. Responde en español, de forma breve y útil.

   CONTEXTO FINANCIERO:
   {natural_summary}

   DATOS ADICIONALES (JSON):
   {JSON con upcoming_obligations, top_expenses_last_30d, etc.}

   PREGUNTA DEL USUARIO: {message.text}

   RESPUESTA:
   ```

5. Llamar a Gemini API (`gemini-1.5-flash` o `gemini-1.5-pro`).
6. Enviar la respuesta al chat con `sendMessage`:

   ```ts
   await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       chat_id: message.chat.id,
       text: geminiResponse,
       parse_mode: 'Markdown', // opcional
     }),
   });
   ```

---

## 6. Comandos del bot

| Comando | Acción |
|---------|--------|
| `/start` | Mensaje de bienvenida + instrucciones para vincular cuenta (si no vinculado) |
| `/saldo` | Respuesta directa con saldo/disponible (sin Gemini si se quiere respuesta rápida) |
| `/link` | Muestra de nuevo la URL para vincular |
| `/unlink` | Desvincular cuenta |
| Cualquier texto | Pasar a Gemini con contexto financiero |

---

## 7. Variables de entorno

```env
# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_WEBHOOK_SECRET=opcional-secret-para-validar

# Gemini (Google AI)
GOOGLE_AI_API_KEY=AIza...   # o GEMINI_API_KEY
```

Obtener API key: [Google AI Studio](https://aistudio.google.com/apikey).

---

## 8. Dependencias

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"   // SDK oficial de Gemini
  }
}
```

Alternativa: `fetch` directo a la API REST de Gemini.

---

## 9. Seguridad

- **Webhook**: No exponer datos sensibles en la URL. Validar `X-Telegram-Bot-Api-Secret-Token` si se usa.
- **Rate limiting**: Aplicar límite por `telegram_user_id` (ej. 20 mensajes/hora).
- **Privacidad**: Enviar a Gemini solo datos agregados necesarios. Evitar IDs internos si no son relevantes.
- **HTTPS**: Obligatorio para webhook de Telegram.

---

## 10. Fases de implementación

### Fase 1: Infraestructura base
- [ ] Crear tabla `telegram_link` (y opcional `telegram_link_pending`).
- [ ] Endpoint `POST /api/telegram/webhook` (solo responde "OK" a todos los mensajes).
- [ ] Configurar webhook en Telegram.
- [ ] Logging de updates recibidos.

### Fase 2: Vinculación de cuentas
- [ ] Generar código de vinculación (pendientes en Redis o tabla).
- [ ] Endpoint `POST /api/telegram/link` (auth JWT) para completar vínculo.
- [ ] Página frontend `/link?code=...` que llama al endpoint tras login.
- [ ] Comandos `/start` y `/link` en el bot.

### Fase 3: Gemini + contexto
- [ ] Servicio `TelegramGeminiService`:
  - Obtener contexto (reusar lógica de `aiRoutes` o `GetFinancialContextUseCase`).
  - Construir prompt.
  - Llamar Gemini API.
- [ ] Integrar en webhook: texto libre → Gemini → `sendMessage`.
- [ ] Comandos rápidos `/saldo`, `/gasto` (opcional, sin Gemini).

### Fase 4: Afinado
- [ ] Rate limiting por usuario.
- [ ] Manejo de errores (timeout Gemini, usuario no vinculado).
- [ ] Comando `/unlink`.
- [ ] Documentar en README y API.md.

---

## 11. Costos estimados (referencia)

- **Telegram Bot API**: Gratis.
- **Gemini**: Cuota gratuita generosa (~60 RPM, 1M tokens/día para 1.5 Flash). Después: bajo costo por token.
- Para uso personal/pequeño: prácticamente gratuito.

---

## 12. Referencias

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Webhooks - Telegram](https://core.telegram.org/bots/webhooks)
- [Google AI - Gemini API](https://ai.google.dev/docs)
- Finward: `backend/src/modules/ai/infrastructure/aiRoutes.ts` (contexto actual)
