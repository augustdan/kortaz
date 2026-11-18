# Kortaz Mobile (Expo / React Native)

Aplicativo nativo iOS e Android do **Kortaz**, conectado diretamente às APIs REST do backend em produção (`https://kortaz-app.vercel.app`) e ao banco Supabase.

## Funcionalidades
- **Modo Cliente (`Agendar`):** vitrine por estabelecimento (`slug`), filtro Barbearia / Salão, serviços, profissionais, horários em tempo real (`/api/availability`) e confirmação (`/api/appointments`).
- **Modo Barbeiro (`Painel`):** autenticação via Bearer token (`/api/auth`), KPIs do dia, lista de agendamentos e conclusão com um toque (`/api/appointments/[id]`).

## Como executar localmente
```bash
cd mobile
npm install
npx expo start
```

Para apontar para um backend local em desenvolvimento:
```bash
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000 npx expo start
```
